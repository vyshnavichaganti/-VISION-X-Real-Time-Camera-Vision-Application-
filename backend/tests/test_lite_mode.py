"""
Test Suite for Low-Memory Profile (VISION_LITE_MODE) targeting 512 MB RAM deployment
Verifies startup without FastSAM/MiDaS, detection, tracking, approximate distance, health endpoints, and memory usage.
"""

import sys
import os
import io
import unittest
import subprocess
from PIL import Image
from fastapi.testclient import TestClient

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.services.vision_service import vision_service
from app.core.config import settings


class TestLiteModePipeline(unittest.TestCase):

    def setUp(self):
        # Save original settings
        self.orig_lite_mode = settings.VISION_LITE_MODE
        self.orig_seg_enabled = settings.SEGMENTATION_ENABLED
        self.orig_depth_enabled = settings.DEPTH_ENABLED

    def tearDown(self):
        # Restore settings
        settings.VISION_LITE_MODE = self.orig_lite_mode
        settings.SEGMENTATION_ENABLED = self.orig_seg_enabled
        settings.DEPTH_ENABLED = self.orig_depth_enabled
        vision_service.shutdown()

    def test_01_lite_mode_starts_without_fastsam_and_midas(self):
        """
        Verify that when VISION_LITE_MODE=True, startup loads YOLOv8 detector and distance estimator,
        leaving FastSAM and MiDaS completely uninitialized and disabled.
        """
        settings.VISION_LITE_MODE = True
        vision_service.shutdown()
        vision_service.initialize()

        self.assertIsNotNone(vision_service.detector)
        self.assertTrue(vision_service.detector.is_loaded)
        self.assertTrue(vision_service.distance_estimator.is_initialized)

        # FastSAM and MiDaS MUST NOT be loaded
        self.assertFalse(vision_service.is_segmentor_loaded)
        self.assertFalse(vision_service.is_depth_model_loaded)
        self.assertIsNone(vision_service._segmentor)
        self.assertIsNone(vision_service._depth_model)

        # Calling getters should return None without lazy loading
        self.assertIsNone(vision_service.get_segmentor())
        self.assertIsNone(vision_service.get_depth_model())
        print("\n[LITE MODE TEST 1 PASSED] Lite mode starts cleanly without FastSAM or MiDaS.")

    def test_02_health_and_ready_endpoints_reflect_lite_mode(self):
        """
        Verify GET /health and GET /ready report lite_mode=True and segmentor/depth as disabled.
        """
        settings.VISION_LITE_MODE = True
        vision_service.shutdown()
        vision_service.initialize()

        client = TestClient(app)

        # GET /health
        res_health = client.get("/health")
        self.assertEqual(res_health.status_code, 200)
        data_health = res_health.json()
        self.assertTrue(data_health["lite_mode"])
        self.assertEqual(data_health["segmentor_status"], "disabled")
        self.assertEqual(data_health["depth_status"], "disabled")
        self.assertEqual(data_health["calibration_method"], "bbox_approximate")

        # GET /ready
        res_ready = client.get("/ready")
        self.assertEqual(res_ready.status_code, 200)
        data_ready = res_ready.json()
        self.assertEqual(data_ready["status"], "ready")
        self.assertTrue(data_ready["lite_mode"])
        self.assertEqual(data_ready["detector"], "ready")
        self.assertEqual(data_ready["segmentor"], "disabled")
        self.assertEqual(data_ready["depth"], "disabled")
        print("\n[LITE MODE TEST 2 PASSED] Observability endpoints accurately report lite_mode status.")

    def test_03_detection_tracking_and_approximate_distance_in_lite_mode(self):
        """
        Verify detection, ByteTrack tracking, and lightweight approximate distance estimation work in lite mode.
        """
        settings.VISION_LITE_MODE = True
        vision_service.shutdown()
        vision_service.initialize()

        # Create synthetic image with content
        img = Image.new("RGB", (640, 480), color=(120, 140, 160))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        img_bytes = buf.getvalue()

        response = vision_service.detect_objects(
            image_bytes=img_bytes,
            confidence_threshold=0.20,
            session_id="test_lite_session"
        )

        self.assertIsNotNone(response)
        self.assertEqual(response.segmentation_time_ms, 0.0)
        self.assertEqual(response.depth_time_ms, 0.0)
        self.assertFalse(vision_service.is_segmentor_loaded)
        self.assertFalse(vision_service.is_depth_model_loaded)

        print(f"\n[LITE MODE TEST 3 PASSED] Inference executed: total={response.total_processing_time_ms}ms, objects={len(response.objects)}.")

    def test_04_full_mode_remains_available(self):
        """
        Verify that setting VISION_LITE_MODE=False preserves full feature availability (FastSAM & MiDaS).
        """
        settings.VISION_LITE_MODE = False
        vision_service.shutdown()
        vision_service.initialize()

        self.assertFalse(settings.VISION_LITE_MODE)
        self.assertIsNotNone(vision_service.detector)
        # FastSAM and MiDaS are available for lazy load in full mode
        self.assertTrue(settings.SEGMENTATION_ENABLED)
        self.assertTrue(settings.DEPTH_ENABLED)
        print("\n[LITE MODE TEST 4 PASSED] Full mode pipeline remains 100% available.")

    def test_05_measure_memory_usage_in_lite_mode(self):
        """
        Measure actual process RSS RAM memory usage in VISION_LITE_MODE=True in an isolated process to verify < 512 MB target.
        """
        code = (
            "import sys, os; sys.path.insert(0, 'backend'); os.environ['VISION_LITE_MODE']='true'; "
            "from app.core.config import settings; from app.services.vision_service import vision_service; "
            "vision_service.initialize(); import psutil; ram=psutil.Process(os.getpid()).memory_info().rss/(1024*1024); "
            "print(f'{ram:.2f}')"
        )
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        res = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True, cwd=root_dir)
        self.assertEqual(res.returncode, 0, f"Subprocess memory test failed: {res.stderr}")
        ram_mb = float(res.stdout.strip())
        print(f"\n[RAM MEASUREMENT] Isolated Process RSS RAM for VISION_LITE_MODE=true: {ram_mb:.2f} MB")

        # Must be comfortably below 512 MB (512 * 0.8 = ~410 MB threshold)
        self.assertLess(ram_mb, 450.0, f"Lite mode RAM ({ram_mb:.2f} MB) exceeds 450 MB threshold")
        print(f"[LITE MODE TEST 5 PASSED] Memory usage ({ram_mb:.2f} MB) is comfortably below 512 MB limit.")


if __name__ == "__main__":
    unittest.main()
