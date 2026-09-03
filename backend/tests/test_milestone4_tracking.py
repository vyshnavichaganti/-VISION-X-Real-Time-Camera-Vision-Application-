"""
Milestone 4 Comprehensive Automated Test Suite: Persistent Multi-Object Tracking
"""

import sys
import os
import unittest
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ai.tracking.byte_tracker import ByteTracker
from app.schemas.vision import DetectionObjectSchema, BBoxSchema
from app.services.vision_service import vision_service
from app.main import app

client = TestClient(app)


class TestMilestone4ObjectTracking(unittest.TestCase):
    """
    Automated test suite verifying ByteTrack tracking algorithm logic, ID persistence, and API reset lifecycle.
    """

    def setUp(self):
        self.tracker = ByteTracker(max_age=5, min_hits=1, iou_threshold=0.25)

    def test_01_tracker_initialization(self):
        """
        1. Test Tracker Initialization
        """
        self.assertEqual(self.tracker.next_id, 1)
        self.assertEqual(len(self.tracker.tracks), 0)
        print("\n[TEST 1 PASSED] ByteTracker cleanly initialized with ID counter = 1.")

    def test_02_single_object_tracking(self):
        """
        2. Test Single Object Tracking
        """
        det1 = DetectionObjectSchema(
            id=None,
            label="person",
            confidence=0.92,
            bbox=BBoxSchema(x=100.0, y=100.0, width=50.0, height=120.0)
        )
        res1 = self.tracker.update([det1], 640, 480)
        self.assertEqual(len(res1), 1)
        self.assertEqual(res1[0].id, 1)
        self.assertEqual(res1[0].label, "person")
        print(f"\n[TEST 2 PASSED] Single object assigned persistent ID #{res1[0].id}.")

    def test_03_same_object_across_multiple_frames(self):
        """
        3. Test Same Object Across Multiple Frames (ID Persistence)
        """
        initial_bbox = [100.0, 100.0, 50.0, 120.0]
        assigned_ids = []

        for frame_idx in range(5):
            # Slightly move bounding box simulating linear movement (dx=+2, dy=+1)
            det = DetectionObjectSchema(
                id=None,
                label="car",
                confidence=0.88,
                bbox=BBoxSchema(
                    x=initial_bbox[0] + frame_idx * 2.0,
                    y=initial_bbox[1] + frame_idx * 1.0,
                    width=50.0,
                    height=120.0
                )
            )
            res = self.tracker.update([det], 640, 480)
            self.assertEqual(len(res), 1)
            assigned_ids.append(res[0].id)

        # All 5 frames must retain ID #1
        self.assertTrue(all(track_id == 1 for track_id in assigned_ids))
        print(f"\n[TEST 3 PASSED] Car object maintained stable ID #1 across 5 consecutive frames: {assigned_ids}.")

    def test_04_multiple_objects_same_class(self):
        """
        4. Test Multiple Objects of the Same Class
        """
        person1 = DetectionObjectSchema(
            id=None, label="person", confidence=0.95,
            bbox=BBoxSchema(x=50.0, y=50.0, width=40.0, height=100.0)
        )
        person2 = DetectionObjectSchema(
            id=None, label="person", confidence=0.91,
            bbox=BBoxSchema(x=300.0, y=150.0, width=45.0, height=110.0)
        )
        res = self.tracker.update([person1, person2], 640, 480)
        self.assertEqual(len(res), 2)
        ids = {r.id for r in res}
        self.assertEqual(len(ids), 2)  # Two distinct IDs
        print(f"\n[TEST 4 PASSED] Two distinct person objects assigned unique IDs: {ids}.")

    def test_05_new_object_entering(self):
        """
        5. Test New Object Entering Frame
        """
        obj1 = DetectionObjectSchema(
            id=None, label="dog", confidence=0.85,
            bbox=BBoxSchema(x=10.0, y=10.0, width=30.0, height=30.0)
        )
        _ = self.tracker.update([obj1], 640, 480)

        # Frame 2: New object enters
        obj2 = DetectionObjectSchema(
            id=None, label="cat", confidence=0.89,
            bbox=BBoxSchema(x=200.0, y=200.0, width=25.0, height=25.0)
        )
        res2 = self.tracker.update([obj1, obj2], 640, 480)
        self.assertEqual(len(res2), 2)
        id_map = {r.label: r.id for r in res2}
        self.assertEqual(id_map["dog"], 1)
        self.assertEqual(id_map["cat"], 2)
        print(f"\n[TEST 5 PASSED] New entering object assigned next sequential ID: {id_map}.")

    def test_06_object_disappearing_and_pruning(self):
        """
        6. Test Object Disappearing and Pruning after max_age
        """
        tracker = ByteTracker(max_age=2, min_hits=1, iou_threshold=0.25)
        obj = DetectionObjectSchema(
            id=None, label="laptop", confidence=0.90,
            bbox=BBoxSchema(x=100.0, y=100.0, width=80.0, height=60.0)
        )
        _ = tracker.update([obj], 640, 480)
        self.assertEqual(len(tracker.tracks), 1)

        # 3 consecutive empty frames (exceeding max_age=2)
        _ = tracker.update([], 640, 480)
        _ = tracker.update([], 640, 480)
        _ = tracker.update([], 640, 480)

        # Dead tracklet should be pruned
        self.assertEqual(len(tracker.tracks), 0)
        print("\n[TEST 6 PASSED] Disappeared object successfully pruned after max_age frames.")

    def test_07_tracker_reset(self):
        """
        7. Test Tracker Reset
        """
        obj = DetectionObjectSchema(
            id=None, label="chair", confidence=0.80,
            bbox=BBoxSchema(x=50.0, y=50.0, width=40.0, height=40.0)
        )
        _ = self.tracker.update([obj], 640, 480)
        self.assertGreater(self.tracker.next_id, 1)

        self.tracker.reset()
        self.assertEqual(self.tracker.next_id, 1)
        self.assertEqual(len(self.tracker.tracks), 0)
        print("\n[TEST 7 PASSED] Tracker reset restored ID counter to 1 and cleared tracks.")

    def test_08_empty_detections(self):
        """
        8. Test Empty Detections Handling
        """
        res = self.tracker.update([], 640, 480)
        self.assertEqual(res, [])
        print("\n[TEST 8 PASSED] Empty detections handled gracefully returning empty list.")

    def test_09_invalid_detection_input(self):
        """
        9. Test Invalid / Zero Dimension Frame Input
        """
        obj = DetectionObjectSchema(
            id=None, label="bottle", confidence=0.88,
            bbox=BBoxSchema(x=0.0, y=0.0, width=10.0, height=10.0)
        )
        res = self.tracker.update([obj], 0, 0)
        self.assertEqual(len(res), 1)
        print("\n[TEST 9 PASSED] Boundary inputs handled safely.")

    def test_10_api_reset_tracking_endpoint(self):
        """
        10. Test Backend Restart / Session Reset API Endpoint (POST /api/v1/reset-tracking)
        """
        response = client.post("/api/v1/reset-tracking")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get("status"), "ok")
        print("\n[TEST 10 PASSED] POST /api/v1/reset-tracking successfully executed.")


if __name__ == "__main__":
    unittest.main()
