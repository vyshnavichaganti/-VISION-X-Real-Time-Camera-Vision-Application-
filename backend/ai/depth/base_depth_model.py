"""
Abstract Base Class for Monocular Depth Estimation Models
"""

from abc import ABC, abstractmethod
from typing import List, Tuple, Dict, Any, Optional
import numpy as np
from PIL import Image
from app.schemas.vision import DetectionObjectSchema, DepthSummarySchema


class BaseDepthModel(ABC):
    """
    Abstract interface for monocular depth estimation models (e.g. MiDaS_small, Depth-Anything-V2).
    Generates relative depth maps and extracts robust median relative depth per tracked object.
    """

    @abstractmethod
    def load_model(self) -> None:
        """
        Loads the monocular depth model weights into memory.
        """
        pass

    @abstractmethod
    def estimate_depth(
        self,
        image: Image.Image,
        tracked_objects: List[DetectionObjectSchema]
    ) -> Tuple[List[DetectionObjectSchema], DepthSummarySchema, float]:
        """
        Computes relative depth map and extracts object-level relative depth values.

        Args:
            image: PIL Image frame
            tracked_objects: List of tracked objects with bounding boxes and optional masks

        Returns:
            Tuple[List[DetectionObjectSchema], DepthSummarySchema, float]: 
                Updated objects with relative_depth, overall depth summary, and depth latency in ms.
        """
        pass

    @abstractmethod
    def get_info(self) -> Dict[str, Any]:
        """
        Returns depth model metadata and execution status.
        """
        pass
