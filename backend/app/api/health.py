"""
Observability Endpoints: GET /health (Liveness) & GET /ready (Readiness Probe)
"""

from fastapi import APIRouter, Response, status
from app.services.vision_service import vision_service
from app.core.config import settings

router = APIRouter()


@router.get("/health", summary="Process Liveness Probe")
def health_check():
    """
    Lightweight healthcheck endpoint for load balancers and container liveness probes.
    """
    detector_loaded = bool(vision_service.detector and vision_service.detector.is_loaded)
    segmentor_loaded = bool(vision_service.segmentor and vision_service.segmentor.is_loaded)
    depth_loaded = bool(vision_service.depth_model and vision_service.depth_model.is_loaded)
    distance_loaded = bool(vision_service.distance_estimator and vision_service.distance_estimator.is_initialized)

    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "model_loaded": detector_loaded,
        "model": settings.MODEL_NAME,
        "device": vision_service.detector.get_info().get("device", "cpu") if vision_service.detector else "cpu",
        "segmentor_loaded": segmentor_loaded,
        "segmentor_model": settings.SEGMENTATION_MODEL,
        "depth_loaded": depth_loaded,
        "depth_model": settings.DEPTH_MODEL,
        "distance_estimator_loaded": distance_loaded,
        "calibration_status": "calibrated" if distance_loaded else "uncalibrated",
        "calibration_method": settings.CALIBRATION_METHOD,
    }


@router.get("/ready", summary="AI Engine Readiness Probe")
def readiness_check(response: Response):
    """
    Readiness probe verifying that core AI components are loaded and ready to serve inference requests.
    Returns 200 OK when ready, or 503 Service Unavailable when core AI components are down.
    """
    detector_status = "ready" if (vision_service.detector and vision_service.detector.is_loaded) else "unavailable"
    tracker_status = "ready"
    segmentor_status = "ready" if (vision_service.segmentor and vision_service.segmentor.is_loaded) else "unavailable"
    depth_status = "ready" if (vision_service.depth_model and vision_service.depth_model.is_loaded) else "unavailable"
    distance_status = "ready" if (vision_service.distance_estimator and vision_service.distance_estimator.is_initialized) else "unavailable"

    is_ready = detector_status == "ready"
    if not is_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "ready" if is_ready else "degraded",
        "detector": detector_status,
        "tracker": tracker_status,
        "segmentor": segmentor_status,
        "depth": depth_status,
        "distance": distance_status
    }
