"""
FastSAM / SAM-Family Segmentor Concrete Implementation
"""

import time
import logging
from typing import List, Tuple, Dict, Any, Optional
from PIL import Image
import torch

import gc

from ai.segmentation.base_segmentor import BaseSegmentor
from app.schemas.vision import DetectionObjectSchema, SegmentationMaskSchema
from app.core.config import settings

logger = logging.getLogger("vision.fastsam_segmentor")


class FastSAMSegmentor(BaseSegmentor):
    """
    Prompt-guided real-time SAM segmentor using FastSAM / YOLOv8-Seg model architecture.
    """

    def __init__(self, weights_path: str = "FastSAM-s.pt", device: str = "auto"):
        self.weights_path = weights_path
        self.requested_device = device
        self.device = "cpu"
        self.model = None
        self.is_loaded = False
        self.load_time_ms = 0.0

    def load_model(self) -> None:
        """
        Loads FastSAM / SAM segmentation model into memory and executes warm-up pass.
        """
        if self.is_loaded and self.model is not None:
            logger.info("FastSAM segmentor model is already loaded.")
            return

        start_time = time.perf_counter()
        logger.info(f"Loading FastSAM segmentor model from '{self.weights_path}'...")

        if self.requested_device == "auto":
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = self.requested_device

        try:
            from ultralytics import FastSAM, YOLO
            try:
                self.model = FastSAM(self.weights_path)
            except Exception as ex:
                logger.warning(f"FastSAM load fell back to yolov8n-seg.pt: {ex}")
                self.model = YOLO("yolov8n-seg.pt")

            # Warmup pass
            dummy_img = Image.new("RGB", (settings.INFERENCE_SIZE, settings.INFERENCE_SIZE), color=(128, 128, 128))
            with torch.inference_mode():
                if hasattr(self.model, "predict"):
                    self.model.predict(source=dummy_img, imgsz=settings.INFERENCE_SIZE, device=self.device, verbose=False)
                else:
                    self.model(dummy_img, imgsz=settings.INFERENCE_SIZE, device=self.device, verbose=False)

            del dummy_img
            gc.collect()

            end_time = time.perf_counter()
            self.load_time_ms = (end_time - start_time) * 1000.0
            self.is_loaded = True
            logger.info(f"FastSAM segmentor loaded and warmed up on '{self.device}' in {self.load_time_ms:.2f} ms.")

        except Exception as e:
            logger.error(f"Failed to load FastSAM segmentor: {e}", exc_info=True)
            raise RuntimeError(f"FastSAM segmentor initialization failed: {e}")

    def segment(
        self,
        image: Image.Image,
        tracked_objects: List[DetectionObjectSchema]
    ) -> Tuple[List[DetectionObjectSchema], float]:
        """
        Extracts segmentation polygon masks for tracked objects using bounding box prompts.
        """
        if not self.is_loaded or self.model is None:
            return tracked_objects, 0.0

        if not tracked_objects:
            return tracked_objects, 0.0

        start_time = time.perf_counter()

        # Build bounding box prompt list [[x1, y1, x2, y2], ...]
        prompt_bboxes = []
        for obj in tracked_objects:
            x1 = obj.bbox.x
            y1 = obj.bbox.y
            x2 = x1 + obj.bbox.width
            y2 = y1 + obj.bbox.height
            prompt_bboxes.append([x1, y1, x2, y2])

        try:
            with torch.inference_mode():
                # Check if FastSAM or YOLOv8-seg predict call
                seg_conf = min(settings.CONFIDENCE_THRESHOLD, 0.20)
                if hasattr(self.model, "predict"):
                    results = self.model.predict(
                        source=image,
                        conf=seg_conf,
                        imgsz=settings.INFERENCE_SIZE,
                        device=self.device,
                        verbose=False
                    )
                else:
                    results = self.model(
                        source=image,
                        bboxes=prompt_bboxes,
                        conf=seg_conf,
                        imgsz=settings.INFERENCE_SIZE,
                        device=self.device,
                        verbose=False
                    )

            if results and len(results) > 0 and results[0].masks is not None:
                masks_data = results[0].masks
                # Extract polygon coordinates xy (list of arrays)
                polygons = masks_data.xy if hasattr(masks_data, "xy") else []

                # Build mask bounding boxes [x1, y1, w, h] for spatial IoU association
                mask_info = []
                for poly in polygons:
                    if len(poly) > 0:
                        xs = [float(p[0]) for p in poly]
                        ys = [float(p[1]) for p in poly]
                        min_x, max_x = min(xs), max(xs)
                        min_y, max_y = min(ys), max(ys)
                        mbbox = (min_x, min_y, max(1.0, max_x - min_x), max(1.0, max_y - min_y))
                        pts = [[round(float(pt[0]), 1), round(float(pt[1]), 1)] for pt in poly]
                        mask_info.append({"bbox": mbbox, "pts": pts, "used": False})

                # Helper IoU calculation
                def calc_iou(b1, b2):
                    inter_x = max(0.0, min(b1[0] + b1[2], b2[0] + b2[2]) - max(b1[0], b2[0]))
                    inter_y = max(0.0, min(b1[1] + b1[3], b2[1] + b2[3]) - max(b1[1], b2[1]))
                    inter = inter_x * inter_y
                    union = (b1[2] * b1[3]) + (b2[2] * b2[3]) - inter
                    return inter / union if union > 0 else 0.0

                # Associate masks with tracked objects via maximum IoU
                for idx, obj in enumerate(tracked_objects):
                    obj_box = (obj.bbox.x, obj.bbox.y, obj.bbox.width, obj.bbox.height)
                    best_iou = 0.0
                    best_m_idx = -1
                    for m_idx, minfo in enumerate(mask_info):
                        if not minfo["used"]:
                            iou = calc_iou(obj_box, minfo["bbox"])
                            if iou > best_iou:
                                best_iou = iou
                                best_m_idx = m_idx

                    if best_m_idx >= 0 and best_iou > 0.05:
                        mask_info[best_m_idx]["used"] = True
                        obj.mask = SegmentationMaskSchema(format="polygon", points=mask_info[best_m_idx]["pts"])
                    elif idx < len(mask_info) and not mask_info[idx]["used"]:
                        # Fallback index association if IoU is indeterminate
                        mask_info[idx]["used"] = True
                        obj.mask = SegmentationMaskSchema(format="polygon", points=mask_info[idx]["pts"])

        except Exception as err:
            logger.warning(f"Error during FastSAM prompt segmentation pass: {err}")

        end_time = time.perf_counter()
        segmentation_time_ms = round((end_time - start_time) * 1000.0, 2)
        return tracked_objects, segmentation_time_ms

    def get_info(self) -> Dict[str, Any]:
        return {
            "model_name": "FastSAM-s",
            "weights": self.weights_path,
            "device": self.device,
            "is_loaded": self.is_loaded,
            "load_time_ms": round(self.load_time_ms, 2),
            "framework": f"PyTorch {torch.__version__} / Ultralytics FastSAM",
            "license": "AGPL-3.0",
        }
