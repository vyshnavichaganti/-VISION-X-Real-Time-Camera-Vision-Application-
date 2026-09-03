"""
POST /api/v1/detect Endpoint Handler - Production Hardened
"""

import logging
from typing import Optional
from fastapi import APIRouter, File, UploadFile, Query, HTTPException, status
from app.schemas.vision import DetectionResponseSchema
from app.services.vision_service import vision_service
from app.core.config import settings

logger = logging.getLogger("vision.api.detect")

router = APIRouter()

# Magic bytes headers for image validation
JPEG_MAGIC = b"\xff\xd8\xff"
PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


@router.post(
    "/detect",
    response_model=DetectionResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Real-Time Object Detection & Tracking",
    description="Ingests a camera frame image and returns detected bounding boxes, class labels, confidence scores, segmentations, depth, and approximate distances."
)
async def detect_objects(
    file: UploadFile = File(..., description="JPEG/PNG image camera frame payload"),
    confidence: float = Query(
        default=settings.DEFAULT_CONFIDENCE_THRESHOLD,
        ge=0.01,
        le=1.0,
        description="Confidence threshold (0.01 to 1.0)"
    ),
    inference_size: int = Query(
        default=settings.INFERENCE_SIZE,
        ge=160,
        le=1280,
        description="Model inference resolution (e.g. 640 or 320 for fast CPU execution)"
    ),
    track: bool = Query(
        default=True,
        description="Enable persistent object tracking IDs across video frames"
    ),
    session_id: Optional[str] = Query(
        default=None,
        description="Client session ID for isolated multi-client tracking state"
    )
):
    if not file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No image file payload provided."
        )

    try:
        contents = await file.read()
        if len(contents) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded image payload is empty (0 bytes)."
            )

        # Enforce maximum payload size limit (HTTP 413 Payload Too Large)
        max_bytes = int(settings.MAX_PAYLOAD_MB * 1024 * 1024)
        if len(contents) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Image payload exceeds maximum allowed size of {settings.MAX_PAYLOAD_MB} MB."
            )

        # Validate magic byte image headers
        is_jpeg = contents.startswith(JPEG_MAGIC)
        is_png = contents.startswith(PNG_MAGIC[:4])
        if not (is_jpeg or is_png):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported or corrupted image file format. Only JPEG and PNG are supported."
            )

        response = vision_service.detect_objects(
            image_bytes=contents,
            confidence_threshold=confidence,
            inference_size=inference_size,
            enable_tracking=track,
            session_id=session_id
        )
        return response

    except HTTPException:
        raise
    except ValueError as val_err:
        logger.warning(f"Validation error during image processing: {val_err}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
    except RuntimeError as run_err:
        logger.warning(f"Runtime operational error during inference: {run_err}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(run_err)
        )
    except Exception as err:
        logger.error(f"Internal server error during object detection & tracking pipeline: {err}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing the vision pipeline request."
        )


@router.post(
    "/reset-tracking",
    status_code=status.HTTP_200_OK,
    summary="Reset Tracking Session State"
)
async def reset_tracking(
    session_id: Optional[str] = Query(
        default=None,
        description="Session ID to reset. If omitted, resets all active sessions."
    )
):
    vision_service.reset_tracking(session_id=session_id)
    return {"status": "ok", "message": "Tracking state reset successfully"}
