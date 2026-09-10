"""
MiDaS_small Monocular Relative Depth Model Concrete Implementation
"""

import time
import logging
from typing import List, Tuple, Dict, Any, Optional
import numpy as np
from PIL import Image, ImageDraw
import torch

import gc

from ai.depth.base_depth_model import BaseDepthModel
from app.schemas.vision import DetectionObjectSchema, DepthSummarySchema
from app.core.config import settings

logger = logging.getLogger("vision.midas_depth_model")


class MiDaSDepthModel(BaseDepthModel):
    """
    Monocular relative depth estimation using MiDaS_small (MIT Licensed).
    Outputs normalized relative depth scores [0.0 = farthest, 1.0 = nearest] and object-level median statistics.
    """

    def __init__(self, model_type: str = "MiDaS_small", device: str = "auto"):
        self.model_type = model_type
        self.requested_device = device
        self.device = "cpu"
        self.model = None
        self.transform = None
        self.is_loaded = False
        self.load_time_ms = 0.0

    def load_model(self) -> None:
        """
        Loads MiDaS_small model weights via PyTorch Hub and performs warm-up pass.
        """
        if self.is_loaded and self.model is not None:
            logger.info("MiDaS depth model is already loaded.")
            return

        start_time = time.perf_counter()
        logger.info(f"Loading MiDaS depth model '{self.model_type}'...")

        if self.requested_device == "auto":
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = self.requested_device

        try:
            # Bypass PyTorch hub fork validation warning
            torch.hub._validate_not_a_forked_repo = lambda *a, **k: True

            self.model = torch.hub.load("intel-isl/MiDaS", self.model_type, trust_repo=True)
            self.model.to(self.device)
            self.model.eval()

            midas_transforms = torch.hub.load("intel-isl/MiDaS", "transforms", trust_repo=True)
            self.transform = midas_transforms.small_transform

            # Warmup pass
            dummy_img = Image.new("RGB", (settings.INFERENCE_SIZE, settings.INFERENCE_SIZE), color=(128, 128, 128))
            dummy_np = np.array(dummy_img)
            input_batch = self.transform(dummy_np).to(self.device)

            with torch.inference_mode():
                _ = self.model(input_batch)

            del dummy_img, dummy_np, input_batch
            gc.collect()

            end_time = time.perf_counter()
            self.load_time_ms = (end_time - start_time) * 1000.0
            self.is_loaded = True
            logger.info(f"MiDaS depth model loaded and warmed up on '{self.device}' in {self.load_time_ms:.2f} ms.")

        except Exception as e:
            logger.error(f"Failed to load MiDaS depth model: {e}", exc_info=True)
            raise RuntimeError(f"MiDaS initialization failed: {e}")

    def estimate_depth(
        self,
        image: Image.Image,
        tracked_objects: List[DetectionObjectSchema]
    ) -> Tuple[List[DetectionObjectSchema], DepthSummarySchema, float]:
        """
        Generates relative depth map and extracts object-level median relative depth statistics.
        """
        if not self.is_loaded or self.model is None or self.transform is None:
            return tracked_objects, DepthSummarySchema(available=False), 0.0

        start_time = time.perf_counter()
        img_w, img_h = image.size
        img_np = np.array(image)

        try:
            input_batch = self.transform(img_np).to(self.device)

            with torch.inference_mode():
                prediction = self.model(input_batch)
                # Resize prediction back to original image dimensions
                prediction = torch.nn.functional.interpolate(
                    prediction.unsqueeze(1),
                    size=(img_h, img_w),
                    mode="bicubic",
                    align_corners=False
                ).squeeze()

            depth_map = prediction.cpu().numpy()

            # Normalize depth map to [0.0, 1.0] (0.0 = farthest, 1.0 = closest)
            d_min = depth_map.min()
            d_max = depth_map.max()
            denom = d_max - d_min + 1e-6
            norm_depth_map = (depth_map - d_min) / denom

            # Extract median relative depth for each tracked object
            for obj in tracked_objects:
                val = self._extract_object_median_depth(norm_depth_map, obj, img_w, img_h)
                if val is not None:
                    obj.relative_depth = round(float(val), 2)

            end_time = time.perf_counter()
            depth_time_ms = round((end_time - start_time) * 1000.0, 2)
            summary = DepthSummarySchema(available=True, min=0.0, max=1.0)
            return tracked_objects, summary, depth_time_ms

        except Exception as err:
            logger.warning(f"Error during MiDaS relative depth estimation: {err}")
            end_time = time.perf_counter()
            depth_time_ms = round((end_time - start_time) * 1000.0, 2)
            return tracked_objects, DepthSummarySchema(available=False), depth_time_ms

    def _extract_object_median_depth(
        self,
        norm_depth_map: np.ndarray,
        obj: DetectionObjectSchema,
        img_w: int,
        img_h: int
    ) -> Optional[float]:
        """
        Samples depth values inside object polygon mask or central inner 60% bounding box region.
        """
        try:
            # Method A: Polygon mask sampling
            if obj.mask and obj.mask.points and len(obj.mask.points) > 2:
                poly_pts = [(pt[0], pt[1]) for pt in obj.mask.points]
                mask_img = Image.new("L", (img_w, img_h), 0)
                ImageDraw.Draw(mask_img).polygon(poly_pts, outline=1, fill=1)
                binary_mask = np.array(mask_img, dtype=bool)

                sampled_values = norm_depth_map[binary_mask]
                if len(sampled_values) > 0:
                    return float(np.median(sampled_values))

            # Method B: Inner 60% Bounding box sampling
            bx = obj.bbox.x
            by = obj.bbox.y
            bw = obj.bbox.width
            bh = obj.bbox.height

            # Inner 60% crop coordinates
            x1 = int(max(0, bx + 0.20 * bw))
            y1 = int(max(0, by + 0.20 * bh))
            x2 = int(min(img_w, bx + 0.80 * bw))
            y2 = int(min(img_h, by + 0.80 * bh))

            if x2 > x1 and y2 > y1:
                crop = norm_depth_map[y1:y2, x1:x2]
                if crop.size > 0:
                    return float(np.median(crop))

            return None
        except Exception:
            return None

    def get_info(self) -> Dict[str, Any]:
        return {
            "model_name": "MiDaS_small",
            "model_type": self.model_type,
            "device": self.device,
            "is_loaded": self.is_loaded,
            "load_time_ms": round(self.load_time_ms, 2),
            "framework": f"PyTorch {torch.__version__} / MiDaS",
            "license": "MIT License",
        }
