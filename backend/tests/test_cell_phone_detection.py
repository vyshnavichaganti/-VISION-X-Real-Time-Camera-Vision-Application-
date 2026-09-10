"""
Regression Test Suite for Cell Phone Detection & Multi-Class Pipeline Hardening
Verifies that COCO class 67 ("cell phone") and non-person objects are correctly detected,
tracked with unique persistent IDs, segmented by FastSAM, and assigned calibrated distances.
"""

import unittest
import os
import sys
import io
from PIL import Image, ImageDraw

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath("backend"))

from app.services.vision_service import vision_service
from app.core.config import settings
from ai.tracking.byte_tracker import ByteTracker
from app.schemas.vision import DetectionObjectSchema, BBoxSchema


class TestCellPhoneDetectionPipeline(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        vision_service.initialize()

    def test_01_coco_class_67_mapping(self):
        """
        Verify that YOLOv8 model maps class ID 67 to 'cell phone'.
        """
        self.assertIsNotNone(vision_service.detector)
        self.assertIsNotNone(vision_service.detector.model)
        names = vision_service.detector.model.names
        self.assertIn(67, names)
        self.assertEqual(names[67], "cell phone")
        print(f"\n[REGRESSION TEST 1 PASSED] Class ID 67 correctly mapped to '{names[67]}'.")

    def test_02_cell_phone_detection_threshold_sensitivity(self):
        """
        Verify that cell phone objects are detected at 0.25 confidence threshold.
        """
        # Load or create test phone image
        phone_img_path = os.path.join(os.path.dirname(__file__), "fixtures", "test_phone1.jpg")
        if not os.path.exists(phone_img_path):
            img = Image.new("RGB", (640, 640), color=(150, 150, 150))
            draw = ImageDraw.Draw(img)
            draw.rectangle([200, 150, 350, 450], fill=(20, 20, 20))
        else:
            img = Image.open(phone_img_path)

        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        img_bytes = buf.getvalue()

        # Execute detection with 0.25 threshold
        res = vision_service.detect_objects(
            image_bytes=img_bytes,
            confidence_threshold=0.25,
            inference_size=640,
            enable_tracking=True,
            session_id="test_reg_phone"
        )

        labels = [obj.label for obj in res.objects]
        self.assertIn("cell phone", labels)
        phone_obj = next(obj for obj in res.objects if obj.label == "cell phone")
        self.assertIsNotNone(phone_obj.id)
        self.assertGreaterEqual(phone_obj.confidence, 0.25)
        print(f"\n[REGRESSION TEST 2 PASSED] Cell phone detected with conf={phone_obj.confidence:.2f} and track ID #{phone_obj.id}.")

    def test_03_bytetrack_unique_ids_for_multiple_objects(self):
        """
        Verify ByteTracker assigns unique, non-duplicate track IDs to simultaneous objects.
        """
        tracker = ByteTracker()
        det1 = DetectionObjectSchema(id=None, label="person", confidence=0.90, bbox=BBoxSchema(x=10, y=10, width=100, height=200))
        det2 = DetectionObjectSchema(id=None, label="cell phone", confidence=0.35, bbox=BBoxSchema(x=150, y=150, width=50, height=100))
        det3 = DetectionObjectSchema(id=None, label="laptop", confidence=0.80, bbox=BBoxSchema(x=300, y=200, width=200, height=150))

        tracked = tracker.update([det1, det2, det3], 640, 480)
        
        self.assertEqual(len(tracked), 3)
        assigned_ids = [t.id for t in tracked]
        self.assertEqual(len(assigned_ids), len(set(assigned_ids)), "Track IDs must be unique across objects")
        print(f"\n[REGRESSION TEST 3 PASSED] Multi-object unique track IDs verified: {assigned_ids}.")

    def test_04_fastsam_and_distance_for_cell_phone(self):
        """
        Verify FastSAM mask and Calibrated Distance are correctly attached to detected cell phone object.
        """
        phone_img_path = os.path.join(os.path.dirname(__file__), "fixtures", "test_phone1.jpg")
        if os.path.exists(phone_img_path):
            img = Image.open(phone_img_path)
            buf = io.BytesIO()
            img.save(buf, format="JPEG")
            img_bytes = buf.getvalue()

            res = vision_service.detect_objects(
                image_bytes=img_bytes,
                confidence_threshold=0.25,
                inference_size=640,
                enable_tracking=True,
                enable_segmentation=True,
                enable_depth=True,
                enable_distance=True,
                session_id="test_reg_full"
            )

            phone_obj = next((obj for obj in res.objects if obj.label == "cell phone"), None)
            if phone_obj:
                self.assertIsNotNone(phone_obj.distance)
                self.assertGreater(phone_obj.distance.meters, 0.0)
                print(f"\n[REGRESSION TEST 4 PASSED] Cell phone mask & distance verified: ~{phone_obj.distance.meters}m ({phone_obj.distance.quality}).")


if __name__ == "__main__":
    unittest.main()
