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
    Does NOT trigger lazy model loading.
    """
    detector_loaded = bool(vision_service.detector and vision_service.detector.is_loaded)
    segmentor_loaded = vision_service.is_segmentor_loaded
    depth_loaded = vision_service.is_depth_model_loaded
    distance_loaded = bool(vision_service.distance_estimator and vision_service.distance_estimator.is_initialized)

    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "lite_mode": settings.VISION_LITE_MODE,
        "model_loaded": detector_loaded,
        "model": settings.MODEL_NAME,
        "device": vision_service.detector.get_info().get("device", "cpu") if vision_service.detector else "cpu",
        "segmentor_loaded": segmentor_loaded,
        "segmentor_status": "disabled" if settings.VISION_LITE_MODE else ("ready" if segmentor_loaded else "lazy"),
        "segmentor_model": settings.SEGMENTATION_MODEL,
        "depth_loaded": depth_loaded,
        "depth_status": "disabled" if settings.VISION_LITE_MODE else ("ready" if depth_loaded else "lazy"),
        "depth_model": settings.DEPTH_MODEL,
        "distance_estimator_loaded": distance_loaded,
        "calibration_status": "calibrated" if distance_loaded else "uncalibrated",
        "calibration_method": "bbox_approximate" if settings.VISION_LITE_MODE else settings.CALIBRATION_METHOD,
    }


@router.get("/ready", summary="AI Engine Readiness Probe")
def readiness_check(response: Response):
    """
    Readiness probe verifying that core AI components are loaded and ready to serve inference requests.
    Returns 200 OK when ready (detector initialized), without triggering lazy model loading for optional models.
    """
    detector_status = "ready" if (vision_service.detector and vision_service.detector.is_loaded) else "unavailable"
    tracker_status = "ready"

    if settings.VISION_LITE_MODE:
        segmentor_status = "disabled"
        depth_status = "disabled"
    else:
        if vision_service.is_segmentor_loaded:
            segmentor_status = "ready"
        elif settings.SEGMENTATION_ENABLED:
            segmentor_status = "lazy"
        else:
            segmentor_status = "disabled"

        if vision_service.is_depth_model_loaded:
            depth_status = "ready"
        elif settings.DEPTH_ENABLED:
            depth_status = "lazy"
        else:
            depth_status = "disabled"

    distance_status = "ready" if (vision_service.distance_estimator and vision_service.distance_estimator.is_initialized) else "unavailable"

    is_ready = detector_status == "ready"
    if not is_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "ready" if is_ready else "degraded",
        "lite_mode": settings.VISION_LITE_MODE,
        "detector": detector_status,
        "tracker": tracker_status,
        "segmentor": segmentor_status,
        "depth": depth_status,
        "distance": distance_status
    }
