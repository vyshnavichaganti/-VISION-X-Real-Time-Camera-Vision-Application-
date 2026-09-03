"""
Abstract Base Class for Object Detection Models
"""

from abc import ABC, abstractmethod
from typing import List, Tuple, Dict, Any
from PIL import Image
from app.schemas.vision import DetectionObjectSchema


class BaseDetector(ABC):
    """
    Abstract interface for all object detection model implementations.
    Allows easy swapping of underlying detector models (e.g. YOLOv8, MobileNet, ONNX)
    without modifying API endpoints or application logic.
    """

    @abstractmethod
    def load_model(self) -> None:
        """
        Loads model weights into memory and moves tensors to designated device (CUDA/CPU).
        Must be called during application startup lifecycle.
        """
        pass

    @abstractmethod
    def predict(
        self,
        image: Image.Image,
        confidence_threshold: float = 0.40,
        inference_size: int = 640
    ) -> Tuple[List[DetectionObjectSchema], float, int, int]:
        """
        Runs object detection inference on an input PIL Image.

        Returns:
            Tuple containing:
            - List[DetectionObjectSchema]: Detected objects
            - float: Inference latency in milliseconds
            - int: Image width in pixels
            - int: Image height in pixels
        """
        pass

    @abstractmethod
    def get_info(self) -> Dict[str, Any]:
        """
        Returns model metadata info (name, size, device, framework).
        """
        pass
