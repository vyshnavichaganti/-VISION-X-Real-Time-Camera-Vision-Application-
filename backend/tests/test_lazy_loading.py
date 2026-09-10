"""
Test Suite for Thread-Safe Lazy Loading of FastSAM & MiDaS Models
Verifies startup RAM reduction, non-blocking health probes, thread safety, and on-demand model initialization.
"""

import unittest
import os
import sys
import io
import concurrent.futures
from PIL import Image
from fastapi.testclient import TestClient

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath("backend"))

from app.main import app
from app.services.vision_service import vision_service
from app.core.config import settings


class TestLazyLoadingPipeline(unittest.TestCase):

    def setUp(self):
        # Reset service state before each test
        vision_service.shutdown()

    def test_01_startup_does_not_initialize_fastsam_or_midas(self):
        """
        Verify startup initialize() only loads YOLOv8 detector and distance estimator,
        leaving FastSAM and MiDaS uninitialized (lazy).
        """
        vision_service.initialize()

        self.assertIsNotNone(vision_service.detector)
        self.assertTrue(vision_service.detector.is_loaded)
        self.assertTrue(vision_service.distance_estimator.is_initialized)

        # Verify lazy status without triggering load
        self.assertFalse(vision_service.is_segmentor_loaded)
        self.assertFalse(vision_service.is_depth_model_loaded)
        self.assertIsNone(vision_service._segmentor)
        self.assertIsNone(vision_service._depth_model)
        print("\n[LAZY LOAD TEST 1 PASSED] Startup initializes YOLOv8 without loading FastSAM/MiDaS.")

    def test_02_health_and_ready_probes_do_not_trigger_lazy_loading(self):
        """
        Verify GET /health and GET /ready return 200 OK without triggering lazy model loading.
        """
        vision_service.initialize()
        client = TestClient(app)

        # Call GET /health
        res_health = client.get("/health")
        self.assertEqual(res_health.status_code, 200)
        data_health = res_health.json()
        self.assertTrue(data_health["model_loaded"])
        self.assertFalse(data_health["segmentor_loaded"])
        self.assertFalse(data_health["depth_loaded"])

        # Verify models are still uninitialized after GET /health
        self.assertFalse(vision_service.is_segmentor_loaded)
        self.assertFalse(vision_service.is_depth_model_loaded)

        # Call GET /ready
        res_ready = client.get("/ready")
        self.assertEqual(res_ready.status_code, 200)
        data_ready = res_ready.json()
        self.assertEqual(data_ready["status"], "ready")
        self.assertEqual(data_ready["detector"], "ready")
        self.assertEqual(data_ready["segmentor"], "lazy")
        self.assertEqual(data_ready["depth"], "lazy")

        # Verify models are still uninitialized after GET /ready
        self.assertFalse(vision_service.is_segmentor_loaded)
        self.assertFalse(vision_service.is_depth_model_loaded)
        print("\n[LAZY LOAD TEST 2 PASSED] /health and /ready probes do not trigger lazy loading.")

    def test_03_first_segmentation_request_initializes_fastsam_once(self):
        """
        Verify that a request with enable_segmentation=True initializes FastSAM lazily on demand.
        """
        vision_service.initialize()
        self.assertFalse(vision_service.is_segmentor_loaded)

        # Create dummy image bytes
        img = Image.new("RGB", (640, 640), color=(100, 100, 100))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        img_bytes = buf.getvalue()

        # Execute detect_objects with segmentation enabled
        res = vision_service.detect_objects(
            image_bytes=img_bytes,
            enable_segmentation=True,
            enable_depth=False,
            session_id="lazy_seg_test"
        )

        self.assertTrue(vision_service.is_segmentor_loaded)
        self.assertIsNotNone(vision_service._segmentor)
        self.assertFalse(vision_service.is_depth_model_loaded)
        print("\n[LAZY LOAD TEST 3 PASSED] First segmentation request initialized FastSAM lazily.")

    def test_04_first_depth_request_initializes_midas_once(self):
        """
        Verify that a request with enable_depth=True initializes MiDaS depth model lazily on demand.
        """
        vision_service.initialize()
        self.assertFalse(vision_service.is_depth_model_loaded)

        # Create dummy image bytes
        img = Image.new("RGB", (640, 640), color=(100, 100, 100))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        img_bytes = buf.getvalue()

        # Execute detect_objects with depth enabled
        res = vision_service.detect_objects(
            image_bytes=img_bytes,
            enable_segmentation=False,
            enable_depth=True,
            session_id="lazy_depth_test"
        )

        self.assertTrue(vision_service.is_depth_model_loaded)
        self.assertIsNotNone(vision_service._depth_model)
        print("\n[LAZY LOAD TEST 4 PASSED] First depth request initialized MiDaS lazily.")

    def test_05_concurrent_lazy_load_requests_do_not_duplicate_instances(self):
        """
        Verify concurrent threads requesting lazy initialization acquire lock safely without duplicating model instances.
        """
        vision_service.initialize()
        self.assertFalse(vision_service.is_segmentor_loaded)

        instances = []

        def worker():
            seg = vision_service.get_segmentor()
            instances.append(id(seg))

        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(worker) for _ in range(5)]
            concurrent.futures.wait(futures)

        self.assertEqual(len(instances), 5)
        # All returned instances must have identical python object ID
        self.assertEqual(len(set(instances)), 1, "Concurrent lazy loaders must return single shared instance")
        print(f"\n[LAZY LOAD TEST 5 PASSED] Thread safety verified: 5 concurrent callers received same model instance ID {instances[0]}.")


if __name__ == "__main__":
    unittest.main()
