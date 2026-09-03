"""
Pydantic schemas for Object Detection API requests and responses
"""

from typing import List, Optional, Union
from pydantic import BaseModel, Field


class BBoxSchema(BaseModel):
    """
    Bounding box in pixel coordinates
    """
    x: float = Field(..., description="Top-left X coordinate in pixels")
    y: float = Field(..., description="Top-left Y coordinate in pixels")
    width: float = Field(..., description="Bounding box width in pixels")
    height: float = Field(..., description="Bounding box height in pixels")


class SegmentationMaskSchema(BaseModel):
    """
    Segmentation mask represented as normalized or pixel polygon coordinate pairs [[x, y], ...]
    """
    format: str = Field(default="polygon", description="Mask encoding format ('polygon' or 'rle')")
    points: List[List[float]] = Field(default_factory=list, description="Array of polygon [x, y] vertex coordinates")


class DepthSummarySchema(BaseModel):
    """
    Overview of relative scene depth map status
    """
    available: bool = Field(default=False, description="Whether relative depth estimation is available")
    min: float = Field(default=0.0, description="Minimum relative depth bound (farthest)")
    max: float = Field(default=1.0, description="Maximum relative depth bound (closest)")


class ObjectDistanceSchema(BaseModel):
    """
    Calibrated approximate physical distance in meters and quality rating
    """
    meters: float = Field(..., description="Approximate physical distance in meters (e.g. 2.4)")
    quality: str = Field(default="good", description="Distance estimate quality ('good', 'moderate', 'low')")
    calibrated: bool = Field(default=True, description="Whether distance was generated via valid calibration model")


class DetectionObjectSchema(BaseModel):
    """
    Individual detected object item with optional persistent tracking ID, segmentation mask, relative depth, and approximate distance
    """
    id: Optional[Union[int, str]] = Field(default=None, description="Persistent tracking ID")
    label: str = Field(..., description="COCO object class label (e.g. person, car, chair)")
    confidence: float = Field(..., description="Confidence score between 0.0 and 1.0")
    bbox: BBoxSchema = Field(..., description="Bounding box coordinates")
    mask: Optional[SegmentationMaskSchema] = Field(default=None, description="Object segmentation mask polygon")
    relative_depth: Optional[float] = Field(default=None, description="Relative estimated depth score (0.0=far, 1.0=near)")
    distance: Optional[ObjectDistanceSchema] = Field(default=None, description="Calibrated approximate physical distance in meters")


class DetectionResponseSchema(BaseModel):
    """
    Structured payload returned by POST /api/v1/detect
    """
    objects: List[DetectionObjectSchema] = Field(default_factory=list, description="List of detected objects")
    depth_summary: Optional[DepthSummarySchema] = Field(default=None, description="Relative depth availability & summary")
    inference_time_ms: float = Field(..., description="Model inference latency in milliseconds")
    tracking_time_ms: float = Field(default=0.0, description="Tracker update latency in milliseconds")
    segmentation_time_ms: float = Field(default=0.0, description="SAM segmentation latency in milliseconds")
    depth_time_ms: float = Field(default=0.0, description="Monocular depth estimation latency in milliseconds")
    distance_time_ms: float = Field(default=0.0, description="Distance calibration latency in milliseconds")
    total_processing_time_ms: float = Field(default=0.0, description="Total pipeline processing latency in milliseconds")
    image_width: int = Field(..., description="Input image width in pixels")
    image_height: int = Field(..., description="Input image height in pixels")
    model: str = Field(..., description="Active model name/version")
