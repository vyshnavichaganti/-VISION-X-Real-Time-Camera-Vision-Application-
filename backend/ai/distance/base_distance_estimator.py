"""
Abstract Base Class for Object Distance Estimators
"""

from abc import ABC, abstractmethod
from typing import List, Tuple, Dict, Any, Optional
from app.schemas.vision import DetectionObjectSchema


class BaseDistanceEstimator(ABC):
    """
    Abstract interface for object distance estimators converting relative depth to approximate metric distance.
    """

    @abstractmethod
    def estimate_distances(
        self,
        tracked_objects: List[DetectionObjectSchema]
    ) -> Tuple[List[DetectionObjectSchema], float]:
        """
        Computes approximate physical distance in meters for each object with a relative depth score.

        Args:
            tracked_objects: List of objects containing relative_depth and bounding boxes/masks

        Returns:
            Tuple[List[DetectionObjectSchema], float]: Updated objects with distance field and latency in ms.
        """
        pass

    @abstractmethod
    def get_info(self) -> Dict[str, Any]:
        """
        Returns calibration metadata and estimation status.
        """
        pass
