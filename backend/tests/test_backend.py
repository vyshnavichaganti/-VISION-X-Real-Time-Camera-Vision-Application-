"""
Unit test script for backend Vision Service and ByteTrack Tracking
"""

import sys
import os
import io
import time
from PIL import Image

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.vision_service import vision_service


def test_tracking_pipeline():
    print("--- Testing Vision Service & ByteTrack Initialization ---")
    start = time.perf_counter()
    vision_service.initialize()
    load_time = (time.perf_counter() - start) * 1000.0
    print(f"[OK] Vision Service & ByteTrack initialized in {load_time:.2f} ms")

    # Create dummy test image (RGB 640x480)
    test_img = Image.new("RGB", (640, 480), color=(100, 150, 200))
    img_byte_arr = io.BytesIO()
    test_img.save(img_byte_arr, format="JPEG")
    image_bytes = img_byte_arr.getvalue()

    print("--- Running Object Detection & Tracking Inference (Frame 1) ---")
    res1 = vision_service.detect_objects(image_bytes, confidence_threshold=0.25, enable_tracking=True)
    print(f"[OK] Frame 1 completed in {res1.inference_time_ms} ms (Objects: {len(res1.objects)})")

    print("--- Running Object Detection & Tracking Inference (Frame 2) ---")
    res2 = vision_service.detect_objects(image_bytes, confidence_threshold=0.25, enable_tracking=True)
    print(f"[OK] Frame 2 completed in {res2.inference_time_ms} ms (Objects: {len(res2.objects)})")

    vision_service.shutdown()
    print("[OK] Vision Service shutdown successfully.")


if __name__ == "__main__":
    test_tracking_pipeline()
