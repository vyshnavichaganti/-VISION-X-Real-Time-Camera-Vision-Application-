"""
Abstract Base Class for Real-Time SAM Segmentor Models
"""

from abc import ABC, abstractmethod
from typing import List, Tuple, Dict, Any, Optional
from PIL import Image
from app.schemas.vision import DetectionObjectSchema, SegmentationMaskSchema


class BaseSegmentor(ABC):
    """
    Abstract interface for SAM-family real-time object segmentation models (e.g. FastSAM, MobileSAM).
    Accepts source image and detected bounding box prompts, returning precise polygon masks associated with tracked object IDs.
    """

    @abstractmethod
    def load_model(self) -> None:
        """
        Loads the segmentation model weights into memory.
        """
        pass

    @abstractmethod
    def segment(
        self,
        image: Image.Image,
        tracked_objects: List[DetectionObjectSchema]
    ) -> Tuple[List[DetectionObjectSchema], float]:
        """
        Runs prompt-guided segmentation on tracked objects using bounding box prompts.

        Args:
            image: PIL Image frame
            tracked_objects: List of objects containing bounding boxes and persistent tracking IDs

        Returns:
            Tuple[List[DetectionObjectSchema], float]: Updated tracked objects with attached polygon masks, and segmentation latency in ms.
        """
        pass

    @abstractmethod
    def get_info(self) -> Dict[str, Any]:
        """
        Returns model metadata and execution device status.
        """
        pass
