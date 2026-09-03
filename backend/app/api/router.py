"""
API Router aggregation
"""

from fastapi import APIRouter
from app.api.health import router as health_router
from app.api.v1.detect import router as detect_router

api_router = APIRouter()

# Health check endpoint
api_router.include_router(health_router, tags=["Health"])

# API v1 Detection endpoints
api_router.include_router(detect_router, prefix="/api/v1", tags=["Detection"])
