"""
Abstract Base Class for Multi-Object Tracking Algorithms
"""

from abc import ABC, abstractmethod
from typing import List
from app.schemas.vision import DetectionObjectSchema


class BaseTracker(ABC):
    """
    Abstract interface for object tracking algorithms (e.g. ByteTrack, SORT).
    Accepts raw frame detections and assigns persistent integer tracking IDs across frames.
    """

    @abstractmethod
    def update(
        self,
        detections: List[DetectionObjectSchema],
        img_width: int,
        img_height: int
    ) -> List[DetectionObjectSchema]:
        """
        Updates tracker state with new frame detections.

        Args:
            detections: Un-tracked detections from object detector
            img_width: Frame width in pixels
            img_height: Frame height in pixels

        Returns:
            List[DetectionObjectSchema]: Detections with assigned persistent `id`
        """
        pass

    @abstractmethod
    def reset(self) -> None:
        """
        Resets tracking state (e.g. on stream stop or camera reset).
        """
        pass
