"""
Ultralytics YOLOv8 Concrete Implementation of BaseDetector with PyTorch Performance Optimizations
"""

import time
import logging
from typing import List, Tuple, Dict, Any
from PIL import Image
import torch

from ai.detection.base_detector import BaseDetector
from app.schemas.vision import DetectionObjectSchema, BBoxSchema
from app.core.config import settings

logger = logging.getLogger("vision.yolov8_detector")


import gc

class YOLOv8Detector(BaseDetector):
    """
    Concrete Object Detector using Ultralytics YOLOv8 with PyTorch inference mode optimizations.
    """

    def __init__(self, weights_path: str = "yolov8n.pt", device: str = "auto"):
        self.weights_path = weights_path
        self.requested_device = device
        self.device = "cpu"
        self.model = None
        self.is_loaded = False
        self.load_time_ms = 0.0

    def load_model(self) -> None:
        """
        Loads the YOLOv8 PyTorch model into memory once during application startup.
        """
        if self.is_loaded and self.model is not None:
            logger.info("YOLOv8 model is already loaded.")
            return

        start_time = time.perf_counter()
        logger.info(f"Loading YOLOv8 model from '{self.weights_path}'...")

        # Device determination
        if self.requested_device == "auto":
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = self.requested_device

        # Set conservative CPU thread count for low-memory environments
        if self.device == "cpu" and torch is not None and hasattr(torch, "set_num_threads"):
            try:
                torch.set_num_threads(2)
            except Exception as thread_err:
                logger.debug(f"Could not set PyTorch CPU threads: {thread_err}")

        try:
            from ultralytics import YOLO
            self.model = YOLO(self.weights_path)
            
            # PyTorch inference mode warmup
            logger.info(f"Warming up YOLOv8 model on device '{self.device}'...")
            dummy_img = Image.new("RGB", (settings.INFERENCE_SIZE, settings.INFERENCE_SIZE), color=(128, 128, 128))
            
            with torch.inference_mode():
                self.model.predict(
                    source=dummy_img,
                    imgsz=settings.INFERENCE_SIZE,
                    device=self.device,
                    verbose=False
                )

            del dummy_img
            gc.collect()

            end_time = time.perf_counter()
            self.load_time_ms = (end_time - start_time) * 1000.0
            self.is_loaded = True
            logger.info(
                f"YOLOv8 model successfully loaded and warmed up on '{self.device}' in {self.load_time_ms:.2f} ms."
            )
        except Exception as e:
            logger.error(f"Failed to load YOLOv8 model: {e}", exc_info=True)
            raise RuntimeError(f"YOLOv8 initialization failed: {e}")

    def predict(
        self,
        image: Image.Image,
        confidence_threshold: float = 0.25,
        inference_size: int = 640
    ) -> Tuple[List[DetectionObjectSchema], float, int, int]:
        """
        Performs real-time object detection using PyTorch torch.inference_mode()
        """
        if not self.is_loaded or self.model is None:
            raise RuntimeError("YOLOv8 model is not loaded. Call load_model() first.")

        img_width, img_height = image.size
        start_time = time.perf_counter()

        # Execute in PyTorch inference_mode (no gradient calculation overhead)
        with torch.inference_mode():
            results = self.model.predict(
                source=image,
                conf=confidence_threshold,
                iou=settings.DEFAULT_IOU_THRESHOLD,
                imgsz=inference_size,
                device=self.device,
                verbose=False
            )

        end_time = time.perf_counter()
        inference_time_ms = (end_time - start_time) * 1000.0

        detections: List[DetectionObjectSchema] = []

        if results and len(results) > 0:
            boxes_data = results[0].boxes
            if boxes_data is not None and len(boxes_data) > 0:
                xyxy_arr = boxes_data.xyxy.cpu().numpy()
                conf_arr = boxes_data.conf.cpu().numpy()
                cls_arr = boxes_data.cls.cpu().numpy()

                for i in range(len(boxes_data)):
                    x1, y1, x2, y2 = float(xyxy_arr[i][0]), float(xyxy_arr[i][1]), float(xyxy_arr[i][2]), float(xyxy_arr[i][3])
                    conf = float(conf_arr[i])
                    cls_id = int(cls_arr[i])
                    class_name = self.model.names.get(cls_id, f"class_{cls_id}")

                    width = max(0.0, x2 - x1)
                    height = max(0.0, y2 - y1)

                    logger.debug(
                        f"[RAW YOLO DETECT] class_id={cls_id}, class_name='{class_name}', conf={conf:.3f}, bbox=[{x1:.1f}, {y1:.1f}, {width:.1f}, {height:.1f}]"
                    )

                    detection_item = DetectionObjectSchema(
                        id=None,
                        label=class_name,
                        confidence=round(conf, 4),
                        bbox=BBoxSchema(
                            x=round(x1, 2),
                            y=round(y1, 2),
                            width=round(width, 2),
                            height=round(height, 2)
                        )
                    )
                    detections.append(detection_item)

        return detections, round(inference_time_ms, 2), img_width, img_height

    def get_info(self) -> Dict[str, Any]:
        return {
            "model_name": "YOLOv8n-COCO",
            "weights": self.weights_path,
            "device": self.device,
            "is_loaded": self.is_loaded,
            "load_time_ms": round(self.load_time_ms, 2),
            "framework": f"PyTorch {torch.__version__} / Ultralytics",
            "license": "AGPL-3.0",
        }
