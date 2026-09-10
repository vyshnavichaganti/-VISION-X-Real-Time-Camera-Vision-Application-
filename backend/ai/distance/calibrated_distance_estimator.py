"""
Calibrated Distance Estimator Concrete Implementation with Bounding-Box Lightweight Fallback
"""

import time
import logging
from typing import List, Tuple, Dict, Any, Optional

from ai.distance.base_distance_estimator import BaseDistanceEstimator
from ai.distance.calibration import CalibrationParams, relative_depth_to_meters
from app.schemas.vision import DetectionObjectSchema, ObjectDistanceSchema, BBoxSchema

logger = logging.getLogger("vision.calibrated_distance_estimator")

# COCO object class average real-world heights (in meters) for pinhole bbox distance estimation
CLASS_HEIGHT_MAP: Dict[str, float] = {
    "person": 1.70,
    "car": 1.50,
    "bus": 3.20,
    "truck": 3.00,
    "bicycle": 1.00,
    "motorcycle": 1.00,
    "chair": 0.85,
    "couch": 0.85,
    "sofa": 0.85,
    "tv": 0.50,
    "laptop": 0.30,
    "bottle": 0.25,
    "cup": 0.15,
    "cell phone": 0.15,
    "phone": 0.15,
    "book": 0.20,
    "dog": 0.50,
    "cat": 0.30,
    "potted plant": 0.40,
    "backpack": 0.45,
}


def estimate_distance_from_bbox(
    bbox: BBoxSchema,
    label: str,
    img_height: float = 480.0
) -> float:
    """
    Lightweight pinhole camera metric distance calculation using object bounding box dimensions.
    Used for VISION_LITE_MODE=true or when depth estimation model is disabled.
    Formula: Z = (real_height * focal_scale) / (bbox_height / img_height)
    """
    real_height = CLASS_HEIGHT_MAP.get(label.lower(), 0.60)
    norm_height = bbox.height / max(float(img_height), 1.0)
    if norm_height <= 0.001:
        return 15.0

    # Focal scale factor calibrated for typical webcam FOV (~60 deg)
    focal_scale = 0.60
    d_meters = (real_height * focal_scale) / norm_height
    return float(max(0.3, min(15.0, round(d_meters, 2))))


class CalibratedDistanceEstimator(BaseDistanceEstimator):
    """
    Computes approximate physical distance in meters using inverse curve calibration
    or lightweight bounding-box pinhole estimation when depth maps are unavailable.
    """

    def __init__(self, params: Optional[CalibrationParams] = None):
        self.params = params or CalibrationParams()
        self.is_initialized = True

    def estimate_distances(
        self,
        tracked_objects: List[DetectionObjectSchema],
        img_height: float = 480.0,
        allow_bbox_fallback: bool = False
    ) -> Tuple[List[DetectionObjectSchema], float]:
        """
        Calculates calibrated or approximate distance in meters for each tracked object.
        """
        start_time = time.perf_counter()

        for obj in tracked_objects:
            if obj.relative_depth is not None:
                d_meters = relative_depth_to_meters(obj.relative_depth, self.params)
                if d_meters is not None:
                    quality = self._determine_quality(obj, d_meters)
                    obj.distance = ObjectDistanceSchema(
                        meters=round(d_meters, 2),
                        quality=quality,
                        calibrated=self.params.calibrated
                    )
                else:
                    obj.distance = None
            elif allow_bbox_fallback:
                # Bounding-box based approximate distance estimation (Low-Memory Profile)
                d_meters = estimate_distance_from_bbox(obj.bbox, obj.label, img_height)
                obj.distance = ObjectDistanceSchema(
                    meters=round(d_meters, 2),
                    quality="approximate",
                    calibrated=self.params.calibrated
                )
            else:
                obj.distance = None

        end_time = time.perf_counter()
        dist_time_ms = round((end_time - start_time) * 1000.0, 2)
        return tracked_objects, dist_time_ms

    def _determine_quality(self, obj: DetectionObjectSchema, d_meters: float) -> str:
        """
        Determines distance estimate quality rating: "good", "moderate", or "low".
        """
        has_mask = obj.mask is not None and obj.mask.points and len(obj.mask.points) > 2
        in_prime_range = 0.5 <= d_meters <= 6.0

        if has_mask and in_prime_range:
            return "good"
        elif has_mask or in_prime_range:
            return "moderate"
        else:
            return "low"

    def get_info(self) -> Dict[str, Any]:
        return {
            "estimator_name": "CalibratedDistanceEstimator",
            "is_initialized": self.is_initialized,
            "calibration_status": "calibrated" if self.params.calibrated else "uncalibrated",
            "method": self.params.method,
            "param_a": self.params.param_a,
            "param_b": self.params.param_b,
            "min_meters": self.params.min_meters,
            "max_meters": self.params.max_meters,
        }
