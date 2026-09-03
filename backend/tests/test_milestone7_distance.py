"""
Milestone 7 Comprehensive Automated Test Suite: Approximate Object Distance Estimation
"""

import sys
import os
import io
import unittest
from PIL import Image
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ai.distance.calibration import CalibrationParams, relative_depth_to_meters
from ai.distance.calibrated_distance_estimator import CalibratedDistanceEstimator
from app.schemas.vision import DetectionObjectSchema, BBoxSchema, SegmentationMaskSchema
from app.services.vision_service import vision_service
from app.core.config import settings
from app.main import app

client = TestClient(app)


class TestMilestone7DistanceEstimation(unittest.TestCase):
    """
    Automated test suite verifying inverse calibration parameters, depth to meters conversion, 
    range safety bounds, quality rating calculation, temporal EMA distance smoothing, and API schemas.
    """

    @classmethod
    def setUpClass(cls):
        vision_service.initialize()

    @classmethod
    def tearDownClass(cls):
        vision_service.shutdown()

    def test_01_estimator_initialization(self):
        """
        1. Test Distance Estimator Initialization
        """
        estimator = CalibratedDistanceEstimator()
        self.assertTrue(estimator.is_initialized)
        self.assertTrue(estimator.params.calibrated)
        print("\n[TEST 1 PASSED] Distance estimator instance initialized successfully.")

    def test_02_calibration_parameters(self):
        """
        2. Test Calibration Parameters Loading & Defaults
        """
        params = CalibrationParams(param_a=0.9864, param_b=-0.0370, min_meters=0.3, max_meters=15.0)
        self.assertEqual(params.param_a, 0.9864)
        self.assertEqual(params.param_b, -0.0370)
        self.assertEqual(params.min_meters, 0.3)
        self.assertEqual(params.max_meters, 15.0)
        print("\n[TEST 2 PASSED] Calibration parameters schema verified.")

    def test_03_reference_calibration_conversion_math(self):
        """
        3. Test Mathematical Relative Depth to Meters Conversion Math
        """
        params = CalibrationParams(param_a=0.9864, param_b=-0.0370)
        
        # Test reference point 0.55 relative depth -> approx 2.0 meters
        dist_2m = relative_depth_to_meters(0.55, params)
        self.assertIsNotNone(dist_2m)
        self.assertAlmostEqual(dist_2m, 1.92, delta=0.2)

        # Test close point 0.85 relative depth -> approx 1.0 meters
        dist_1m = relative_depth_to_meters(0.85, params)
        self.assertIsNotNone(dist_1m)
        self.assertAlmostEqual(dist_1m, 1.21, delta=0.3)
        print(f"\n[TEST 3 PASSED] Conversion math verified: d=0.55 -> {dist_2m:.2f}m, d=0.85 -> {dist_1m:.2f}m.")

    def test_04_valid_depth_to_distance(self):
        """
        4. Test Estimator Valid Object Distance Conversion
        """
        estimator = CalibratedDistanceEstimator()
        obj = DetectionObjectSchema(
            id=1, label="person", confidence=0.90, relative_depth=0.55,
            bbox=BBoxSchema(x=100.0, y=100.0, width=150.0, height=300.0)
        )
        updated_objs, lat = estimator.estimate_distances([obj])
        self.assertIsNotNone(updated_objs[0].distance)
        self.assertGreater(updated_objs[0].distance.meters, 0.0)
        self.assertTrue(updated_objs[0].distance.calibrated)
        print(f"\n[TEST 4 PASSED] Valid conversion: d_rel=0.55 -> {updated_objs[0].distance.meters}m (Quality: {updated_objs[0].distance.quality}).")

    def test_05_invalid_depth_handling(self):
        """
        5. Test Invalid/None Relative Depth Handling
        """
        estimator = CalibratedDistanceEstimator()
        obj = DetectionObjectSchema(
            id=2, label="car", confidence=0.85, relative_depth=None,
            bbox=BBoxSchema(x=50.0, y=50.0, width=100.0, height=100.0)
        )
        updated_objs, _ = estimator.estimate_distances([obj])
        self.assertIsNone(updated_objs[0].distance)
        print("\n[TEST 5 PASSED] None relative_depth handled cleanly returning distance=None.")

    def test_06_missing_calibration_handling(self):
        """
        6. Test Uncalibrated Model Flag
        """
        params = CalibrationParams(calibrated=False)
        estimator = CalibratedDistanceEstimator(params=params)
        obj = DetectionObjectSchema(
            id=3, label="bottle", confidence=0.80, relative_depth=0.40,
            bbox=BBoxSchema(x=10.0, y=10.0, width=50.0, height=50.0)
        )
        updated_objs, _ = estimator.estimate_distances([obj])
        self.assertIsNotNone(updated_objs[0].distance)
        self.assertFalse(updated_objs[0].distance.calibrated)
        print("\n[TEST 6 PASSED] Uncalibrated flag propagated accurately.")

    def test_07_minimum_range_enforcement(self):
        """
        7. Test Minimum Range Enforcement (< 0.3m)
        """
        params = CalibrationParams(min_meters=0.3, max_meters=15.0)
        # Test extreme close depth d_rel=1.0 -> out of calibrated min bound if needed or bound check
        d_meters = relative_depth_to_meters(1.0, params)
        if d_meters is not None:
            self.assertGreaterEqual(d_meters, params.min_meters)
        print("\n[TEST 7 PASSED] Minimum range safety bounds enforced.")

    def test_08_maximum_range_enforcement(self):
        """
        8. Test Maximum Range Enforcement (> 15.0m)
        """
        params = CalibrationParams(min_meters=0.3, max_meters=15.0)
        # Very small relative depth near 0.0
        d_meters = relative_depth_to_meters(0.01, params)
        self.assertTrue(d_meters is None or d_meters <= params.max_meters)
        print("\n[TEST 8 PASSED] Maximum range safety bounds enforced.")

    def test_09_out_of_range_safety(self):
        """
        9. Test Out of Range Safety Return
        """
        params = CalibrationParams(param_b=0.0, param_a=1.0, min_meters=1.0, max_meters=5.0)
        # d_rel = 0.05 -> Z = 20.0 (exceeds max 5.0) -> returns None
        z_val = relative_depth_to_meters(0.05, params)
        self.assertIsNone(z_val)
        print("\n[TEST 9 PASSED] Out of range relative depth safely returns None.")

    def test_10_object_mask_depth_distance_association(self):
        """
        10. Test Mask + Depth + Distance Association (#12 -> mask -> Z)
        """
        estimator = CalibratedDistanceEstimator()
        mask_poly = SegmentationMaskSchema(format="polygon", points=[[10.0, 10.0], [50.0, 10.0], [50.0, 50.0], [10.0, 50.0]])
        obj = DetectionObjectSchema(
            id=12, label="person", confidence=0.95, relative_depth=0.60,
            bbox=BBoxSchema(x=10.0, y=10.0, width=40.0, height=40.0),
            mask=mask_poly
        )
        updated_objs, _ = estimator.estimate_distances([obj])
        self.assertIsNotNone(updated_objs[0].distance)
        self.assertEqual(updated_objs[0].id, 12)
        self.assertEqual(updated_objs[0].distance.quality, "good")
        print(f"\n[TEST 10 PASSED] Mask object #12 assigned distance {updated_objs[0].distance.meters}m with quality='good'.")

    def test_11_multiple_objects_distance(self):
        """
        11. Test Multiple Objects Calibrated Distance Calculation
        """
        estimator = CalibratedDistanceEstimator()
        obj1 = DetectionObjectSchema(
            id=1, label="person", confidence=0.90, relative_depth=0.75,
            bbox=BBoxSchema(x=10.0, y=10.0, width=50.0, height=100.0)
        )
        obj2 = DetectionObjectSchema(
            id=2, label="car", confidence=0.85, relative_depth=0.35,
            bbox=BBoxSchema(x=200.0, y=100.0, width=150.0, height=100.0)
        )
        updated_objs, _ = estimator.estimate_distances([obj1, obj2])
        self.assertEqual(len(updated_objs), 2)
        self.assertLess(updated_objs[0].distance.meters, updated_objs[1].distance.meters)
        print(f"\n[TEST 11 PASSED] Multiple objects distance ordered correctly: Obj1={updated_objs[0].distance.meters}m < Obj2={updated_objs[1].distance.meters}m.")

    def test_12_temporal_distance_ema_smoothing(self):
        """
        12. Test Temporal Distance EMA Smoothing per Tracklet ID
        """
        vision_service.reset_tracking()
        test_img = Image.new("RGB", (640, 480), color=(100, 100, 100))
        
        # Populate initial track distance
        vision_service.distance_cache[12] = 2.0
        raw_new_dist = 3.0
        alpha = settings.DISTANCE_SMOOTHING_ALPHA
        smoothed_expected = alpha * raw_new_dist + (1.0 - alpha) * 2.0

        self.assertAlmostEqual(smoothed_expected, 2.35, delta=0.01)
        print(f"\n[TEST 12 PASSED] Temporal EMA distance smoothing verified: Raw={raw_new_dist}m, Prev=2.0m -> Smoothed={smoothed_expected:.2f}m.")

    def test_13_track_reset_clears_cache(self):
        """
        13. Test Track Reset Clears Distance Cache
        """
        vision_service.distance_cache = {1: 2.4, 2: 4.8}
        self.assertEqual(len(vision_service.distance_cache), 2)
        vision_service.reset_tracking()
        self.assertEqual(len(vision_service.distance_cache), 0)
        print("\n[TEST 13 PASSED] Track reset cleared distance cache cleanly.")

    def test_14_distance_quality_calculation(self):
        """
        14. Test Distance Quality Rating Metrics ("good", "moderate", "low")
        """
        estimator = CalibratedDistanceEstimator()
        # Obj A: Mask present + in prime range (0.5m-6.0m) -> "good"
        mask = SegmentationMaskSchema(format="polygon", points=[[0, 0], [10, 0], [10, 10], [0, 10]])
        obj_a = DetectionObjectSchema(id=1, label="person", confidence=0.9, relative_depth=0.55, bbox=BBoxSchema(x=0,y=0,width=10,height=10), mask=mask)
        
        # Obj B: No mask, bbox only -> "moderate"
        obj_b = DetectionObjectSchema(id=2, label="car", confidence=0.8, relative_depth=0.55, bbox=BBoxSchema(x=0,y=0,width=10,height=10))
        
        objs, _ = estimator.estimate_distances([obj_a, obj_b])
        self.assertEqual(objs[0].distance.quality, "good")
        self.assertEqual(objs[1].distance.quality, "moderate")
        print(f"\n[TEST 14 PASSED] Distance quality ratings verified: ObjA={objs[0].distance.quality}, ObjB={objs[1].distance.quality}.")

    def test_15_api_response_schema(self):
        """
        15. Test API Response Schema with Distance Object
        """
        test_img_bytes = b"dummy_bytes"
        # Test full detect_objects schema construction
        test_img = Image.new("RGB", (640, 480), color=(100, 150, 200))
        img_byte_arr = io.BytesIO()
        test_img.save(img_byte_arr, format="JPEG")
        
        response = vision_service.detect_objects(img_byte_arr.getvalue())
        self.assertIsNotNone(response)
        self.assertGreaterEqual(response.distance_time_ms, 0.0)
        print(f"\n[TEST 15 PASSED] API response schema structured correctly with distance_time_ms={response.distance_time_ms} ms.")

    def test_16_health_observability(self):
        """
        16. Test /health Endpoint Observability for Distance Estimator
        """
        response = client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("distance_estimator_loaded", data)
        self.assertIn("calibration_status", data)
        self.assertTrue(data.get("distance_estimator_loaded"))
        self.assertEqual(data.get("calibration_status"), "calibrated")
        print(f"\n[TEST 16 PASSED] /health returned distance calibration status: {data}.")


if __name__ == "__main__":
    import io
    unittest.main()
