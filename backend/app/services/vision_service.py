"""
Vision Orchestrator Service - Singleton Model Lifecycle & Multi-Client Session Manager
"""

import io
import time
import logging
import threading
import gc
from typing import Optional, Dict
from PIL import Image

try:
    import torch
except ImportError:
    torch = None

from ai.detection.base_detector import BaseDetector
from ai.detection.yolov8_detector import YOLOv8Detector
from ai.tracking.base_tracker import BaseTracker
from ai.tracking.byte_tracker import ByteTracker
from ai.segmentation.base_segmentor import BaseSegmentor
from ai.segmentation.fastsam_segmentor import FastSAMSegmentor
from ai.depth.base_depth_model import BaseDepthModel
from ai.depth.midas_depth_model import MiDaSDepthModel
from ai.distance.base_distance_estimator import BaseDistanceEstimator
from ai.distance.calibrated_distance_estimator import CalibratedDistanceEstimator
from ai.distance.calibration import CalibrationParams
from app.schemas.vision import DetectionResponseSchema, DepthSummarySchema
from app.core.config import settings

logger = logging.getLogger("vision.service")

# Safety bound for decompression bombs (max 4000x4000 pixels)
Image.MAX_IMAGE_PIXELS = 16000000


class SessionState:
    """
    Encapsulates session-isolated object tracker state and temporal EMA depth/distance smoothing caches.
    """
    def __init__(self, session_id: str):
        self.session_id: str = session_id
        self.tracker: BaseTracker = ByteTracker(max_age=30, min_hits=1, iou_threshold=0.25)
        self.depth_cache: dict = {}      # Per-tracklet EMA depth cache: {track_id: smoothed_depth}
        self.distance_cache: dict = {}   # Per-tracklet EMA distance cache: {track_id: smoothed_distance}
        self.last_accessed: float = time.time()

    def reset(self) -> None:
        if self.tracker:
            self.tracker.reset()
        self.depth_cache.clear()
        self.distance_cache.clear()
        self.last_accessed = time.time()


class VisionService:
    """
    Service managing detector lifecycles, SAM segmentation, depth estimation, 
    distance calibration, session isolation, and bounded inference execution.
    """

    def __init__(self):
        self.detector: Optional[BaseDetector] = None
        self._segmentor: Optional[BaseSegmentor] = None
        self._depth_model: Optional[BaseDepthModel] = None
        self._segmentor_attempted: bool = False
        self._depth_model_attempted: bool = False
        self.distance_estimator: Optional[BaseDistanceEstimator] = None
        
        self._sessions: Dict[str, SessionState] = {}
        self._session_lock = threading.Lock()
        self._model_load_lock = threading.Lock()
        self._inference_semaphore = threading.BoundedSemaphore(
            max(1, getattr(settings, "MAX_CONCURRENT_INFERENCE", 1))
        )

    def get_or_create_session(self, session_id: Optional[str] = None) -> SessionState:
        """
        Retrieves or initializes an isolated SessionState instance for a client session ID.
        """
        sid = session_id.strip() if session_id and session_id.strip() else "default_session"
        with self._session_lock:
            if sid not in self._sessions:
                self._sessions[sid] = SessionState(session_id=sid)
            session = self._sessions[sid]
            session.last_accessed = time.time()
            return session

    def prune_idle_sessions(self, ttl_seconds: int = 600) -> int:
        """
        Prunes sessions that have been idle longer than ttl_seconds to prevent unbounded memory growth.
        """
        now = time.time()
        pruned_count = 0
        with self._session_lock:
            expired_keys = [
                sid for sid, s in self._sessions.items()
                if sid != "default_session" and (now - s.last_accessed) > ttl_seconds
            ]
            for sid in expired_keys:
                del self._sessions[sid]
                pruned_count += 1
        if pruned_count > 0:
            logger.info(f"Pruned {pruned_count} idle client session(s).")
        return pruned_count

    @property
    def tracker(self) -> Optional[BaseTracker]:
        """
        Backward-compatibility property returning default session tracker.
        """
        return self.get_or_create_session("default_session").tracker

    @property
    def depth_cache(self) -> dict:
        """
        Backward-compatibility property returning default session depth cache.
        """
        return self.get_or_create_session("default_session").depth_cache

    @depth_cache.setter
    def depth_cache(self, val: dict):
        self.get_or_create_session("default_session").depth_cache = val

    @property
    def distance_cache(self) -> dict:
        """
        Backward-compatibility property returning default session distance cache.
        """
        return self.get_or_create_session("default_session").distance_cache

    @distance_cache.setter
    def distance_cache(self, val: dict):
        self.get_or_create_session("default_session").distance_cache = val

    def get_segmentor(self) -> Optional[BaseSegmentor]:
        """
        Thread-safe lazy loader for FastSAM Segmentor.
        """
        if self._segmentor is not None and self._segmentor.is_loaded:
            return self._segmentor

        if not settings.SEGMENTATION_ENABLED or self._segmentor_attempted:
            return self._segmentor

        with self._model_load_lock:
            if self._segmentor is None and not self._segmentor_attempted:
                try:
                    logger.info("Lazy initializing FastSAM Segmentor...")
                    seg = FastSAMSegmentor(
                        weights_path=settings.SEGMENTATION_MODEL,
                        device=settings.SEGMENTATION_DEVICE
                    )
                    seg.load_model()
                    self._segmentor = seg
                    logger.info("Segmentor: READY (lazy loaded)")
                except Exception as seg_err:
                    logger.warning(f"Failed to lazy initialize FastSAM segmentor: {seg_err}")
                    self._segmentor = None
                finally:
                    self._segmentor_attempted = True
        return self._segmentor

    @property
    def segmentor(self) -> Optional[BaseSegmentor]:
        """
        Property returning segmentor instance, triggering lazy initialization on access if needed.
        """
        return self.get_segmentor()

    @segmentor.setter
    def segmentor(self, val: Optional[BaseSegmentor]):
        self._segmentor = val
        if val is not None:
            self._segmentor_attempted = True

    def get_depth_model(self) -> Optional[BaseDepthModel]:
        """
        Thread-safe lazy loader for MiDaS Depth Model.
        """
        if self._depth_model is not None and self._depth_model.is_loaded:
            return self._depth_model

        if not settings.DEPTH_ENABLED or self._depth_model_attempted:
            return self._depth_model

        with self._model_load_lock:
            if self._depth_model is None and not self._depth_model_attempted:
                try:
                    logger.info("Lazy initializing MiDaS Depth Model...")
                    dm = MiDaSDepthModel(
                        model_type=settings.DEPTH_MODEL,
                        device=settings.DEPTH_DEVICE
                    )
                    dm.load_model()
                    self._depth_model = dm
                    logger.info("Depth: READY (lazy loaded)")
                except Exception as depth_err:
                    logger.warning(f"Failed to lazy initialize MiDaS depth model: {depth_err}")
                    self._depth_model = None
                finally:
                    self._depth_model_attempted = True
        return self._depth_model

    @property
    def depth_model(self) -> Optional[BaseDepthModel]:
        """
        Property returning depth model instance, triggering lazy initialization on access if needed.
        """
        return self.get_depth_model()

    @depth_model.setter
    def depth_model(self, val: Optional[BaseDepthModel]):
        self._depth_model = val
        if val is not None:
            self._depth_model_attempted = True

    @property
    def is_segmentor_loaded(self) -> bool:
        """
        Inspects whether FastSAM segmentor is loaded without triggering lazy initialization.
        """
        return bool(self._segmentor is not None and self._segmentor.is_loaded)

    @property
    def is_depth_model_loaded(self) -> bool:
        """
        Inspects whether MiDaS depth model is loaded without triggering lazy initialization.
        """
        return bool(self._depth_model is not None and self._depth_model.is_loaded)

    def initialize(self) -> None:
        """
        Loads detector, tracker, and distance calibration on startup.
        FastSAM segmentor and MiDaS depth model are configured for thread-safe lazy loading on first demand.
        """
        if self.detector is not None and self.detector.is_loaded:
            logger.info("Vision Service detector is already initialized.")
            return

        logger.info("Initializing Vision Service core AI components...")
        
        # 1. Detector
        try:
            self.detector = YOLOv8Detector(
                weights_path=settings.MODEL_PATH,
                device=settings.TARGET_DEVICE
            )
            self.detector.load_model()
            logger.info("Detector: READY")
        except Exception as det_err:
            logger.error(f"Detector initialization failed: {det_err}")
            self.detector = None
            logger.info("Detector: UNAVAILABLE")

        # 2. Tracker
        logger.info("Tracker: READY")

        # 3. FastSAM Segmentor (Lazy Loaded on First Demand)
        if settings.SEGMENTATION_ENABLED:
            logger.info("Segmentor: LAZY (will initialize on demand)")
        else:
            logger.info("Segmentor: DISABLED")

        # 4. MiDaS Depth Model (Lazy Loaded on First Demand)
        if settings.DEPTH_ENABLED:
            logger.info("Depth: LAZY (will initialize on demand)")
        else:
            logger.info("Depth: DISABLED")

        # 5. Distance Estimator
        if settings.DISTANCE_ESTIMATION_ENABLED:
            try:
                calib_params = CalibrationParams(
                    method=settings.CALIBRATION_METHOD,
                    param_a=settings.CALIBRATION_PARAM_A,
                    param_b=settings.CALIBRATION_PARAM_B,
                    min_meters=settings.DISTANCE_MIN_METERS,
                    max_meters=settings.DISTANCE_MAX_METERS,
                    reference_distance_meters=settings.REFERENCE_DISTANCE_METERS,
                    reference_depth_value=settings.REFERENCE_DEPTH_VALUE,
                    calibrated=True
                )
                self.distance_estimator = CalibratedDistanceEstimator(params=calib_params)
                logger.info("Distance: READY")
            except Exception as dist_err:
                logger.warning(f"Failed to initialize distance estimator (falling back): {dist_err}")
                self.distance_estimator = None
                logger.info("Distance: UNAVAILABLE")
        else:
            logger.info("Distance: DISABLED")

        logger.info("Vision Service core initialization complete.")

    def shutdown(self) -> None:
        """
        Cleans up model, tracking, segmentation, depth, and distance resources on shutdown.
        Explicitly releases PyTorch CUDA memory if available.
        """
        logger.info("Shutting down Vision Service...")
        self.detector = None
        self._segmentor = None
        self._depth_model = None
        self._segmentor_attempted = False
        self._depth_model_attempted = False
        self.distance_estimator = None
        with self._session_lock:
            self._sessions.clear()
        
        if torch is not None and hasattr(torch, "cuda") and torch.cuda.is_available():
            try:
                torch.cuda.empty_cache()
            except Exception as e:
                logger.debug(f"CUDA cache clear exception: {e}")
        gc.collect()
        logger.info("Vision Service shutdown complete.")

    def reset_tracking(self, session_id: Optional[str] = None) -> None:
        """
        Resets tracker state and depth/distance smoothing caches for a specific session (or all sessions if None).
        """
        if session_id:
            session = self.get_or_create_session(session_id)
            session.reset()
        else:
            with self._session_lock:
                for session in self._sessions.values():
                    session.reset()

    def detect_objects(
        self,
        image_bytes: bytes,
        confidence_threshold: float = 0.40,
        inference_size: int = 640,
        enable_tracking: bool = True,
        enable_segmentation: bool = True,
        enable_depth: bool = True,
        enable_distance: bool = True,
        session_id: Optional[str] = None
    ) -> DetectionResponseSchema:
        """
        Ingests image bytes, runs object detection, session-isolated tracking, 
        segmentation, depth estimation, and approximate distance calibration.
        """
        if self.detector is None:
            raise RuntimeError("Vision Service detector is unavailable.")

        # Decode image frame safely
        try:
            image = Image.open(io.BytesIO(image_bytes))
            if image.mode != "RGB":
                image = image.convert("RGB")
        except Exception as e:
            logger.error(f"Invalid image format: {e}")
            raise ValueError(f"Failed to decode image payload: {e}")

        # Dimension safety bound verification (max 4096x4096)
        if image.width > 4096 or image.height > 4096:
            raise ValueError("Image dimensions exceed maximum safety limits (4096x4096).")

        # Acquire session state for multi-client isolation
        session = self.get_or_create_session(session_id)

        # Acquire bounded inference lock to prevent GPU memory OOMs and race conditions
        acquired = self._inference_semaphore.acquire(blocking=True, timeout=5.0)
        if not acquired:
            raise RuntimeError("Server concurrency limit reached. Inference engine is busy.")

        try:
            # Step 1: Object Detection via PyTorch YOLOv8
            raw_detections, inference_time_ms, img_width, img_height = self.detector.predict(
                image=image,
                confidence_threshold=confidence_threshold,
                inference_size=inference_size
            )

            # Step 2: Multi-Object Tracking with Session Isolation
            t_track_start = time.perf_counter()
            if enable_tracking and session.tracker is not None:
                tracked_detections = session.tracker.update(raw_detections, img_width, img_height)
            else:
                tracked_detections = raw_detections
            t_track_end = time.perf_counter()
            tracking_time_ms = round((t_track_end - t_track_start) * 1000.0, 2)

            # Step 3: SAM Segmentation Pass (Lazy-load segmentor if requested)
            segmentation_time_ms = 0.0
            if enable_segmentation and settings.SEGMENTATION_ENABLED:
                segmentor = self.get_segmentor()
                if segmentor is not None and len(tracked_detections) > 0:
                    try:
                        tracked_detections, segmentation_time_ms = segmentor.segment(image, tracked_detections)
                    except Exception as seg_exc:
                        logger.warning(f"SAM Segmentation pass error (graceful fallback): {seg_exc}")

            # Step 4: Monocular Depth Estimation Pass (Lazy-load depth model if requested)
            depth_time_ms = 0.0
            depth_summary = DepthSummarySchema(available=False)
            if enable_depth and settings.DEPTH_ENABLED:
                depth_model = self.get_depth_model()
                if depth_model is not None and len(tracked_detections) > 0:
                    try:
                        tracked_detections, depth_summary, depth_time_ms = depth_model.estimate_depth(image, tracked_detections)
                        
                        # Apply Temporal EMA Depth Smoothing per tracklet ID in session cache
                        alpha = settings.DEPTH_SMOOTHING_ALPHA
                        for obj in tracked_detections:
                            if obj.id is not None and obj.relative_depth is not None:
                                t_id = obj.id
                                raw_d = obj.relative_depth
                                if t_id in session.depth_cache:
                                    smoothed = alpha * raw_d + (1.0 - alpha) * session.depth_cache[t_id]
                                else:
                                    smoothed = raw_d
                                session.depth_cache[t_id] = smoothed
                                obj.relative_depth = round(float(smoothed), 2)

                    except Exception as depth_exc:
                        logger.warning(f"Monocular depth pass error (graceful fallback): {depth_exc}")

            # Step 5: Calibrated Distance Estimation Pass
            distance_time_ms = 0.0
            if enable_distance and settings.DISTANCE_ESTIMATION_ENABLED and self.distance_estimator is not None and len(tracked_detections) > 0:
                try:
                    tracked_detections, distance_time_ms = self.distance_estimator.estimate_distances(tracked_detections)
                    
                    # Apply Temporal EMA Distance Smoothing per tracklet ID in session cache
                    dist_alpha = settings.DISTANCE_SMOOTHING_ALPHA
                    for obj in tracked_detections:
                        if obj.id is not None and obj.distance is not None:
                            t_id = obj.id
                            raw_dist = obj.distance.meters
                            if t_id in session.distance_cache:
                                smoothed_dist = dist_alpha * raw_dist + (1.0 - dist_alpha) * session.distance_cache[t_id]
                            else:
                                smoothed_dist = raw_dist
                            session.distance_cache[t_id] = smoothed_dist
                            obj.distance.meters = round(float(smoothed_dist), 2)

                except Exception as dist_exc:
                    logger.warning(f"Distance estimation pass error (graceful fallback): {dist_exc}")

            total_processing_time_ms = round(
                inference_time_ms + tracking_time_ms + segmentation_time_ms + depth_time_ms + distance_time_ms, 2
            )

            info = self.detector.get_info()

            return DetectionResponseSchema(
                objects=tracked_detections,
                depth_summary=depth_summary,
                inference_time_ms=inference_time_ms,
                tracking_time_ms=tracking_time_ms,
                segmentation_time_ms=segmentation_time_ms,
                depth_time_ms=depth_time_ms,
                distance_time_ms=distance_time_ms,
                total_processing_time_ms=total_processing_time_ms,
                image_width=img_width,
                image_height=img_height,
                model=info.get("model_name", settings.MODEL_NAME)
            )
        finally:
            self._inference_semaphore.release()


# Global singleton instance
vision_service = VisionService()
