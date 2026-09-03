"""
Calibrated Distance Estimator Concrete Implementation
"""

import time
import logging
from typing import List, Tuple, Dict, Any, Optional

from ai.distance.base_distance_estimator import BaseDistanceEstimator
from ai.distance.calibration import CalibrationParams, relative_depth_to_meters
from app.schemas.vision import DetectionObjectSchema, ObjectDistanceSchema

logger = logging.getLogger("vision.calibrated_distance_estimator")


class CalibratedDistanceEstimator(BaseDistanceEstimator):
    """
    Computes approximate physical distance in meters using inverse curve calibration: Z = a / (d_rel + b).
    Assigns quality rating ("good", "moderate", "low") and enforces range safety bounds.
    """

    def __init__(self, params: Optional[CalibrationParams] = None):
        self.params = params or CalibrationParams()
        self.is_initialized = True

    def estimate_distances(
        self,
        tracked_objects: List[DetectionObjectSchema]
    ) -> Tuple[List[DetectionObjectSchema], float]:
        """
        Calculates calibrated approximate distance in meters and quality indicators for each tracked object.
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
