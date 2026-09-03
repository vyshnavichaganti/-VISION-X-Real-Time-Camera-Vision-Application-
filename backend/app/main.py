"""
Main FastAPI Application Entrypoint - Production Hardened
"""

import logging
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.router import api_router
from app.services.vision_service import vision_service

# Structured production logging setup
log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
logging.basicConfig(
    level=log_level,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("vision.main")


async def session_pruning_task():
    """
    Background periodic task to clean up idle sessions.
    """
    while True:
        try:
            await asyncio.sleep(60)
            vision_service.prune_idle_sessions(ttl_seconds=settings.SESSION_TTL_SECONDS)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.warning(f"Error in session pruning task: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for application startup and shutdown lifecycle management.
    """
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION}...")
    try:
        vision_service.initialize()
    except Exception as e:
        logger.error(f"Critical error during model startup initialization: {e}", exc_info=True)
    
    # Launch background idle session pruner
    prune_task = asyncio.create_task(session_pruning_task())

    yield

    logger.info("Cleaning up application resources and stopping background tasks...")
    prune_task.cancel()
    try:
        await prune_task
    except asyncio.CancelledError:
        pass

    vision_service.shutdown()
    logger.info("Application shutdown complete.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production-Ready AI Real-Time Camera Vision API",
    lifespan=lifespan
)

# Enable CORS with strict origins from configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Include aggregated API routes
app.include_router(api_router)


if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
