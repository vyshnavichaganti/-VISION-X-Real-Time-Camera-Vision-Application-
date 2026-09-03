"""
Milestone 3 Automated Test Suite: Pipeline Optimization, Observability & Health Check
"""

import sys
import os
import io
import time
import unittest
from PIL import Image
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.services.vision_service import vision_service
from app.core.config import settings

client = TestClient(app)


class TestMilestone3Pipeline(unittest.TestCase):
    """
    Test suite for Milestone 3 optimizations, health endpoints, and inference pipeline behavior.
    """

    @classmethod
    def setUpClass(cls):
        # Initialize vision service singleton once
        t0 = time.perf_counter()
        vision_service.initialize()
        cls.init_time_ms = (time.perf_counter() - t0) * 1000.0

    @classmethod
    def tearDownClass(cls):
        vision_service.shutdown()

    def test_01_health_endpoint_schema(self):
        """
        Verify /health returns required production observability fields
        """
        response = client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        self.assertEqual(data.get("status"), "healthy")
        self.assertIn("service", data)
        self.assertIn("version", data)
        self.assertTrue(data.get("model_loaded"))
        self.assertEqual(data.get("model"), settings.MODEL_NAME)
        self.assertIn("device", data)
        print(f"\n[TEST 1 PASSED] /health returned: {data}")

    def test_02_model_single_load_reuse(self):
        """
        Verify model is loaded once and reused across requests without weight reload overhead
        """
        detector_ref_1 = id(vision_service.detector)
        vision_service.initialize()  # Re-call initialize
        detector_ref_2 = id(vision_service.detector)
        
        self.assertEqual(detector_ref_1, detector_ref_2)
        self.assertTrue(vision_service.detector.is_loaded)
        print("\n[TEST 2 PASSED] Model singleton instance correctly reused without reloading.")

    def test_03_inference_pipeline_and_latency(self):
        """
        Verify POST /api/v1/detect processes image payload efficiently with correct response schema
        """
        test_img = Image.new("RGB", (640, 480), color=(150, 180, 210))
        img_byte_arr = io.BytesIO()
        test_img.save(img_byte_arr, format="JPEG", quality=80)
        img_bytes = img_byte_arr.getvalue()

        t0 = time.perf_counter()
        response = client.post(
            "/api/v1/detect?confidence=0.40&inference_size=640",
            files={"file": ("frame.jpg", img_bytes, "image/jpeg")}
        )
        elapsed_ms = (time.perf_counter() - t0) * 1000.0

        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        self.assertIn("objects", data)
        self.assertIn("inference_time_ms", data)
        self.assertIn("image_width", data)
        self.assertIn("image_height", data)
        self.assertIn("model", data)
        self.assertEqual(data["image_width"], 640)
        self.assertEqual(data["image_height"], 480)
        
        print(f"\n[TEST 3 PASSED] /api/v1/detect completed in {elapsed_ms:.2f} ms (Model inference: {data['inference_time_ms']} ms).")

    def test_04_reset_tracking_endpoint(self):
        """
        Verify POST /api/v1/reset-tracking resets tracking state cleanly
        """
        response = client.post("/api/v1/reset-tracking")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get("status"), "ok")
        print("\n[TEST 4 PASSED] /api/v1/reset-tracking endpoint working as expected.")

    def test_05_error_resilience_empty_payload(self):
        """
        Verify API handles empty image payload gracefully with 400 status
        """
        response = client.post(
            "/api/v1/detect",
            files={"file": ("empty.jpg", b"", "image/jpeg")}
        )
        self.assertEqual(response.status_code, 400)
        print("\n[TEST 5 PASSED] Empty payload rejected with 400 Bad Request.")


if __name__ == "__main__":
    unittest.main()
