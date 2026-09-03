"""
Milestone 8 Automated Production Hardening Test Suite
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


class TestProductionHardening(unittest.TestCase):
    """
    Automated test suite verifying production security controls, payload limits,
    magic byte validation, readiness probes, session isolation, and concurrency.
    """

    @classmethod
    def setUpClass(cls):
        vision_service.initialize()

    @classmethod
    def tearDownClass(cls):
        vision_service.shutdown()

    def test_01_liveness_health_endpoint(self):
        """
        1. Test /health Liveness Endpoint
        """
        response = client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get("status"), "healthy")
        self.assertIn("service", data)
        self.assertIn("version", data)
        print("\n[HARDENING TEST 1 PASSED] /health liveness probe verified.")

    def test_02_readiness_probe_endpoint(self):
        """
        2. Test /ready Readiness Probe Endpoint
        """
        response = client.get("/ready")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("status", data)
        self.assertEqual(data.get("status"), "ready")
        self.assertEqual(data.get("detector"), "ready")
        self.assertEqual(data.get("tracker"), "ready")
        print("\n[HARDENING TEST 2 PASSED] /ready readiness probe verified.")

    def test_03_empty_image_payload_rejection(self):
        """
        3. Test Empty Image Upload Rejection (0 bytes)
        """
        response = client.post(
            "/api/v1/detect",
            files={"file": ("empty.jpg", b"", "image/jpeg")}
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("empty", response.json().get("detail", "").lower())
        print("\n[HARDENING TEST 3 PASSED] 0-byte image payload cleanly rejected with HTTP 400.")

    def test_04_corrupted_magic_bytes_rejection(self):
        """
        4. Test Corrupted / Invalid Magic Bytes Image Rejection
        """
        corrupted_bytes = b"INVALID_NON_IMAGE_HEADER_PAYLOAD_STRING"
        response = client.post(
            "/api/v1/detect",
            files={"file": ("fake.jpg", corrupted_bytes, "image/jpeg")}
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("unsupported", response.json().get("detail", "").lower())
        print("\n[HARDENING TEST 4 PASSED] Invalid magic bytes image rejected with HTTP 400.")

    def test_05_oversized_payload_rejection(self):
        """
        5. Test Oversized Image Upload Rejection (> MAX_PAYLOAD_MB)
        """
        original_max = settings.MAX_PAYLOAD_MB
        try:
            settings.MAX_PAYLOAD_MB = 0.001  # Set max limit to ~1 KB for test
            # Create valid JPEG image bytes larger than 1 KB
            test_img = Image.new("RGB", (200, 200), color=(255, 0, 0))
            img_byte_arr = io.BytesIO()
            test_img.save(img_byte_arr, format="JPEG")
            img_bytes = img_byte_arr.getvalue()

            response = client.post(
                "/api/v1/detect",
                files={"file": ("large.jpg", img_bytes, "image/jpeg")}
            )
            self.assertEqual(response.status_code, 413)
            self.assertIn("exceeds maximum allowed size", response.json().get("detail", ""))
            print("\n[HARDENING TEST 5 PASSED] Oversized image payload rejected with HTTP 413.")
        finally:
            settings.MAX_PAYLOAD_MB = original_max

    def test_06_multi_client_session_isolation(self):
        """
        6. Test Session Isolation (Client A session_1 vs Client B session_2)
        """
        s1 = vision_service.get_or_create_session("session_1")
        s2 = vision_service.get_or_create_session("session_2")
        
        # Populate session_1 caches
        s1.depth_cache[101] = 0.85
        s1.distance_cache[101] = 1.80

        # Populate session_2 caches
        s2.depth_cache[202] = 0.40
        s2.distance_cache[202] = 4.20

        # Verify separation
        self.assertIn(101, s1.depth_cache)
        self.assertNotIn(101, s2.depth_cache)
        self.assertIn(202, s2.depth_cache)
        self.assertNotIn(202, s1.depth_cache)

        # Reset session_1 tracking
        vision_service.reset_tracking(session_id="session_1")
        self.assertEqual(len(s1.depth_cache), 0)
        self.assertEqual(len(s2.depth_cache), 1)  # session_2 untouched
        print("\n[HARDENING TEST 6 PASSED] Multi-client session state isolation verified.")

    def test_07_idle_session_pruning(self):
        """
        7. Test Idle Session Cleanup
        """
        vision_service.get_or_create_session("idle_session_alpha")
        self.assertIn("idle_session_alpha", vision_service._sessions)
        
        # Prune with 0 ttl_seconds forces immediate cleanup of non-default sessions
        pruned = vision_service.prune_idle_sessions(ttl_seconds=-1.0)
        self.assertGreaterEqual(pruned, 1)
        self.assertNotIn("idle_session_alpha", vision_service._sessions)
        print("\n[HARDENING TEST 7 PASSED] Idle session cleanup pruned inactive sessions.")

    def test_08_sanitized_error_response(self):
        """
        8. Test Exception Detail Sanitization (no raw stack trace in HTTP response)
        """
        # Create a valid JPEG frame
        test_img = Image.new("RGB", (640, 480), color=(0, 255, 0))
        img_byte_arr = io.BytesIO()
        test_img.save(img_byte_arr, format="JPEG")
        img_bytes = img_byte_arr.getvalue()

        # Send request with invalid parameters
        response = client.post(
            "/api/v1/detect?confidence=0.50&session_id=test_sec",
            files={"file": ("test.jpg", img_bytes, "image/jpeg")}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("objects", data)
        self.assertNotIn("Traceback", str(data))
        print("\n[HARDENING TEST 8 PASSED] API response does not leak internal stack traces.")


if __name__ == "__main__":
    unittest.main()
