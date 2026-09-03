"""
Production Configuration Settings for FastAPI Backend using Pydantic Settings
"""

from typing import List, Union
import json
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Real-Time Camera Vision API"
    VERSION: str = "0.3.0"
    API_V1_STR: str = "/api/v1"
    LOG_LEVEL: str = "INFO"
    
    # Production Concurrency & Security Limits
    MAX_CONCURRENT_INFERENCE: int = 1
    MAX_PAYLOAD_MB: float = 10.0
    SESSION_TTL_SECONDS: int = 600
    
    # Model Configuration
    MODEL_NAME: str = "YOLOv8n-COCO"
    MODEL_PATH: str = "yolov8n.pt"
    CONFIDENCE_THRESHOLD: float = 0.25
    DEFAULT_CONFIDENCE_THRESHOLD: float = 0.25
    DEFAULT_IOU_THRESHOLD: float = 0.45
    INFERENCE_SIZE: int = 640  # 640 or 320 for faster CPU execution
    TARGET_DEVICE: str = "auto"  # "auto" | "cuda" | "cpu"
    DEVICE: str = "auto"  # alias for TARGET_DEVICE
    AI_TARGET_FPS: int = 10
    # Segmentation Configuration
    SEGMENTATION_ENABLED: bool = True
    SEGMENTATION_MODEL: str = "FastSAM-s.pt"
    SEGMENTATION_TARGET_FPS: int = 3
    SEGMENTATION_DEVICE: str = "auto"
    # Depth Estimation Configuration
    DEPTH_ENABLED: bool = True
    DEPTH_MODEL: str = "MiDaS_small"
    DEPTH_TARGET_FPS: int = 3
    DEPTH_INPUT_SIZE: int = 256
    DEPTH_DEVICE: str = "auto"
    DEPTH_SMOOTHING_ALPHA: float = 0.35
    # Distance Estimation Configuration
    DISTANCE_ESTIMATION_ENABLED: bool = True
    CALIBRATION_METHOD: str = "inverse_reference"
    REFERENCE_DISTANCE_METERS: float = 2.0
    REFERENCE_DEPTH_VALUE: float = 0.55
    CALIBRATION_PARAM_A: float = 0.9864
    CALIBRATION_PARAM_B: float = -0.0370
    DISTANCE_MIN_METERS: float = 0.3
    DISTANCE_MAX_METERS: float = 15.0
    DISTANCE_SMOOTHING_ALPHA: float = 0.35
    REQUEST_TIMEOUT_SECONDS: float = 3.0
    
    # CORS Settings
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "https://frontend-q9rz.vercel.app"
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v_trimmed = v.strip()
            if v_trimmed == "*":
                return ["*"]
            if v_trimmed.startswith("[") and v_trimmed.endswith("]"):
                try:
                    return json.loads(v_trimmed)
                except Exception:
                    pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
