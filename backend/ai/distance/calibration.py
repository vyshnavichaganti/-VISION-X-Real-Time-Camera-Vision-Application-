"""
Calibration Parameters and Inverse Curve Conversion Utilities
"""

from dataclasses import dataclass, field
from typing import Dict, Any, Optional


@dataclass
class CalibrationParams:
    """
    Configuration parameters for inverse reference calibration model: Z(d_rel) = a / (d_rel + b)
    """
    method: str = "inverse_reference"
    param_a: float = 0.9864
    param_b: float = -0.0370
    min_meters: float = 0.3
    max_meters: float = 15.0
    reference_distance_meters: float = 2.0
    reference_depth_value: float = 0.55
    calibrated: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return {
            "method": self.method,
            "param_a": self.param_a,
            "param_b": self.param_b,
            "min_meters": self.min_meters,
            "max_meters": self.max_meters,
            "reference_distance_meters": self.reference_distance_meters,
            "reference_depth_value": self.reference_depth_value,
            "calibrated": self.calibrated,
        }


def relative_depth_to_meters(
    d_rel: float,
    params: CalibrationParams
) -> Optional[float]:
    """
    Converts relative depth score [0.0, 1.0] to calibrated metric distance in meters.
    Uses inverse curve formula: Z = a / (d_rel + b)
    """
    if d_rel is None or not (0.0 <= d_rel <= 1.0):
        return None

    denom = d_rel + params.param_b
    if denom <= 0.001:
        # Avoid division by zero or negative asymptote
        return params.max_meters

    z_raw = params.param_a / denom

    # Enforce range safety bounds
    if z_raw < params.min_meters or z_raw > params.max_meters:
        return None

    return float(z_raw)
