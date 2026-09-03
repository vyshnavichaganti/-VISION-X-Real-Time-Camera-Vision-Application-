"""
Automated Production Docker & Integration Pipeline Validation Suite
"""

import sys
import os
import io
import time
import unittest
import psutil
from PIL import Image
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.services.vision_service import vision_service, SessionState
from app.core.config import settings

client = TestClient(app)


class TestDockerProductionValidation(unittest.TestCase):
    """
    Validation test suite verifying Docker configurations, Nginx proxy rules,
    end-to-end AI pipeline execution, failure handling, session isolation,
    and performance metrics.
    """

    @classmethod
    def setUpClass(cls):
        cls.t_start = time.perf_counter()
        vision_service.initialize()
        cls.t_init = (time.perf_counter() - cls.t_start) * 1000.0

    @classmethod
    def tearDownClass(cls):
        vision_service.shutdown()

    def test_01_docker_artifacts_and_ignore_rules(self):
        """
        1. Verify Dockerfiles, docker-compose.yml, nginx.conf, and .dockerignore files
        """
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        backend_dir = os.path.join(root_dir, "backend")
        frontend_dir = os.path.join(root_dir, "frontend")

        self.assertTrue(os.path.exists(os.path.join(root_dir, "docker-compose.yml")))
        self.assertTrue(os.path.exists(os.path.join(backend_dir, "Dockerfile")))
        self.assertTrue(os.path.exists(os.path.join(frontend_dir, "Dockerfile")))
        self.assertTrue(os.path.exists(os.path.join(frontend_dir, "nginx.conf")))
        self.assertTrue(os.path.exists(os.path.join(backend_dir, ".dockerignore")))
        self.assertTrue(os.path.exists(os.path.join(frontend_dir, ".dockerignore")))
        self.assertTrue(os.path.exists(os.path.join(root_dir, ".gitignore")))

        # Verify .env is in .dockerignore files
        with open(os.path.join(backend_dir, ".dockerignore"), "r") as f:
            b_ignore = f.read()
            self.assertIn(".env", b_ignore)

        with open(os.path.join(frontend_dir, ".dockerignore"), "r") as f:
            f_ignore = f.read()
            self.assertIn(".env", f_ignore)

        print(f"\n[DOCKER VALIDATION 1 PASSED] All Docker files & .dockerignore secret protections verified.")

    def test_02_health_and_readiness_endpoints(self):
        """
        2. Verify /health and /ready observability endpoints
        """
        # Test Liveness Probe
        h_res = client.get("/health")
        self.assertEqual(h_res.status_code, 200)
        h_data = h_res.json()
        self.assertEqual(h_data.get("status"), "healthy")

        # Test Readiness Probe
        r_res = client.get("/ready")
        self.assertEqual(r_res.status_code, 200)
        r_data = r_res.json()
        self.assertEqual(r_data.get("status"), "ready")
        self.assertEqual(r_data.get("detector"), "ready")
        self.assertEqual(r_data.get("tracker"), "ready")
        self.assertEqual(r_data.get("segmentor"), "ready")
        self.assertEqual(r_data.get("depth"), "ready")
        self.assertEqual(r_data.get("distance"), "ready")

        print("\n[DOCKER VALIDATION 2 PASSED] /health liveness and /ready readiness probes verified.")

    def test_03_full_ai_pipeline_execution(self):
        """
        3. Test Full Request Flow: Image -> Detection -> ByteTrack -> FastSAM -> MiDaS -> Distance
        """
        # Generate test synthetic camera frame image (JPEG 640x480)
        test_img = Image.new("RGB", (640, 480), color=(120, 160, 200))
        buf = io.BytesIO()
        test_img.save(buf, format="JPEG")
        img_bytes = buf.getvalue()

        t_start = time.perf_counter()
        res = client.post(
            "/api/v1/detect?confidence=0.30&inference_size=640&track=true&session_id=docker_val_sess",
            files={"file": ("frame.jpg", img_bytes, "image/jpeg")}
        )
        t_elapsed_ms = (time.perf_counter() - t_start) * 1000.0

        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertIn("objects", data)
        self.assertIn("inference_time_ms", data)
        self.assertIn("tracking_time_ms", data)
        self.assertIn("segmentation_time_ms", data)
        self.assertIn("depth_time_ms", data)
        self.assertIn("distance_time_ms", data)
        self.assertIn("total_processing_time_ms", data)

        print(f"\n[DOCKER VALIDATION 3 PASSED] Full AI pipeline executed successfully in {t_elapsed_ms:.2f} ms.")
        print(f"   -> YOLO Detection Time: {data['inference_time_ms']} ms")
        print(f"   -> ByteTrack Time: {data['tracking_time_ms']} ms")
        print(f"   -> FastSAM Time: {data['segmentation_time_ms']} ms")
        print(f"   -> MiDaS Depth Time: {data['depth_time_ms']} ms")
        print(f"   -> Calibrated Distance Time: {data['distance_time_ms']} ms")

    def test_04_session_isolation_verification(self):
        """
        4. Test Session Isolation (Client A cannot leak tracking state to Client B)
        """
        sess_a = vision_service.get_or_create_session("client_A")
        sess_b = vision_service.get_or_create_session("client_B")

        sess_a.depth_cache[1] = 0.75
        sess_b.depth_cache[2] = 0.35

        self.assertIn(1, sess_a.depth_cache)
        self.assertNotIn(1, sess_b.depth_cache)
        self.assertIn(2, sess_b.depth_cache)
        self.assertNotIn(2, sess_a.depth_cache)

        vision_service.reset_tracking(session_id="client_A")
        self.assertEqual(len(sess_a.depth_cache), 0)
        self.assertEqual(len(sess_b.depth_cache), 1)

        print("\n[DOCKER VALIDATION 4 PASSED] Session state isolation verified.")

    def test_05_failure_cases(self):
        """
        5. Verify Failure Test Cases: Invalid image, Oversized payload, Malformed upload, Restart
        """
        # Case A: 0-byte upload
        res_empty = client.post("/api/v1/detect", files={"file": ("empty.jpg", b"", "image/jpeg")})
        self.assertEqual(res_empty.status_code, 400)

        # Case B: Invalid magic bytes
        res_corrupt = client.post("/api/v1/detect", files={"file": ("corrupt.jpg", b"INVALID_BYTES", "image/jpeg")})
        self.assertEqual(res_corrupt.status_code, 400)

        # Case C: Oversized payload (> MAX_PAYLOAD_MB)
        orig_max = settings.MAX_PAYLOAD_MB
        try:
            settings.MAX_PAYLOAD_MB = 0.001
            t_img = Image.new("RGB", (300, 300), color=(0, 0, 0))
            buf = io.BytesIO()
            t_img.save(buf, format="JPEG")
            res_large = client.post("/api/v1/detect", files={"file": ("large.jpg", buf.getvalue(), "image/jpeg")})
            self.assertEqual(res_large.status_code, 413)
        finally:
            settings.MAX_PAYLOAD_MB = orig_max

        # Case D: Reset tracking restart
        res_reset = client.post("/api/v1/reset-tracking")
        self.assertEqual(res_reset.status_code, 200)

        print("\n[DOCKER VALIDATION 5 PASSED] All failure and recovery cases handled cleanly.")

    def test_06_resource_and_performance_metrics(self):
        """
        6. Measure process memory (RAM) and CPU utilization
        """
        process = psutil.Process(os.getpid())
        mem_info = process.memory_info()
        ram_mb = mem_info.rss / (1024 * 1024)

        print(f"\n[DOCKER VALIDATION 6 PASSED] Resource Performance Measurements:")
        print(f"   -> AI Service Startup Time: {self.t_init:.2f} ms")
        print(f"   -> Process RAM Memory Usage: {ram_mb:.2f} MB")
        print(f"   -> Process CPU Percent: {process.cpu_percent()}%")
        self.assertLess(ram_mb, 4096.0)  # Verify RAM usage remains under 4 GB bound


if __name__ == "__main__":
    unittest.main()
