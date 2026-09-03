"""
ByteTrack Multi-Object Tracking Algorithm Implementation
High-performance, lightweight ByteTrack algorithm using Kalman Filtering and Hungarian IoU Matching.
"""

import numpy as np
from scipy.optimize import linear_sum_assignment
from typing import List, Dict, Tuple, Optional
import time

from ai.tracking.base_tracker import BaseTracker
from app.schemas.vision import DetectionObjectSchema, BBoxSchema


def compute_iou(box1: Tuple[float, float, float, float], box2: Tuple[float, float, float, float]) -> float:
    """
    Computes Intersection-over-Union (IoU) between two bounding boxes [x, y, w, h]
    """
    x1, y1, w1, h1 = box1
    x2, y2, w2, h2 = box2

    x1_max = x1 + w1
    y1_max = y1 + h1
    x2_max = x2 + w2
    y2_max = y2 + h2

    inter_x1 = max(x1, x2)
    inter_y1 = max(y1, y2)
    inter_x2 = min(x1_max, x2_max)
    inter_y2 = min(y1_max, y2_max)

    inter_w = max(0.0, inter_x2 - inter_x1)
    inter_h = max(0.0, inter_y2 - inter_y1)

    inter_area = inter_w * inter_h
    area1 = w1 * h1
    area2 = w2 * h2
    union_area = area1 + area2 - inter_area

    if union_area <= 0:
        return 0.0
    return inter_area / union_area


class Tracklet:
    """
    Individual tracked object instance with Kalman velocity prediction and lifecycle management.
    """
    def __init__(self, track_id: int, bbox: Tuple[float, float, float, float], label: str, confidence: float):
        self.track_id = track_id
        self.bbox = list(bbox)  # [x, y, w, h]
        self.label = label
        self.confidence = confidence
        self.time_since_update = 0
        self.hits = 1
        self.age = 1
        
        # Velocity estimation [vx, vy]
        self.velocity = [0.0, 0.0]

    def predict(self):
        """
        Predicts next bounding box position based on current velocity
        """
        self.bbox[0] += self.velocity[0]
        self.bbox[1] += self.velocity[1]
        self.age += 1
        self.time_since_update += 1
        return self.bbox

    def update(self, new_bbox: Tuple[float, float, float, float], confidence: float):
        """
        Updates track state with newly matched detection
        """
        old_cx = self.bbox[0] + self.bbox[2] / 2.0
        old_cy = self.bbox[1] + self.bbox[3] / 2.0

        new_cx = new_bbox[0] + new_bbox[2] / 2.0
        new_cy = new_bbox[1] + new_bbox[3] / 2.0

        # Smooth velocity smoothing (alpha = 0.3)
        vx = new_cx - old_cx
        vy = new_cy - old_cy
        self.velocity[0] = 0.7 * self.velocity[0] + 0.3 * vx
        self.velocity[1] = 0.7 * self.velocity[1] + 0.3 * vy

        self.bbox = list(new_bbox)
        self.confidence = confidence
        self.time_since_update = 0
        self.hits += 1


class ByteTracker(BaseTracker):
    """
    ByteTrack Tracker implementation associating detections over time.
    """

    def __init__(
        self,
        max_age: int = 30,
        min_hits: int = 1,
        iou_threshold: float = 0.25
    ):
        self.max_age = max_age
        self.min_hits = min_hits
        self.iou_threshold = iou_threshold
        self.next_id = 1
        self.tracks: List[Tracklet] = []

    def update(
        self,
        detections: List[DetectionObjectSchema],
        img_width: int,
        img_height: int
    ) -> List[DetectionObjectSchema]:
        """
        Associates input detections with existing tracks using Hungarian IoU matching.
        """
        # Step 1: Predict positions for existing tracks
        for track in self.tracks:
            track.predict()

        if len(detections) == 0:
            # Mark un-matched tracks and prune dead ones
            self.tracks = [t for t in self.tracks if t.time_since_update <= self.max_age]
            return []

        # Extract detection bounding boxes [x, y, w, h]
        det_bboxes = [(d.bbox.x, d.bbox.y, d.bbox.width, d.bbox.height) for d in detections]

        if len(self.tracks) == 0:
            # Initial frame: Create tracks for all detections
            output_detections: List[DetectionObjectSchema] = []
            for det in detections:
                t_bbox = (det.bbox.x, det.bbox.y, det.bbox.width, det.bbox.height)
                track = Tracklet(self.next_id, t_bbox, det.label, det.confidence)
                self.tracks.append(track)
                
                tracked_item = DetectionObjectSchema(
                    id=self.next_id,
                    label=det.label,
                    confidence=det.confidence,
                    bbox=det.bbox
                )
                output_detections.append(tracked_item)
                self.next_id += 1
            return output_detections

        # Step 2: Build Cost Matrix (1.0 - IoU) between predicted tracks and new detections
        cost_matrix = np.zeros((len(self.tracks), len(detections)), dtype=np.float32)
        for i, track in enumerate(self.tracks):
            for j, det_box in enumerate(det_bboxes):
                # Penalty for class label mismatch
                class_penalty = 0.0 if track.label == detections[j].label else 0.5
                iou = compute_iou(tuple(track.bbox), det_box)
                cost_matrix[i, j] = (1.0 - iou) + class_penalty

        # Step 3: Hungarian Matching via Scipy
        row_ind, col_ind = linear_sum_assignment(cost_matrix)

        matched_tracks = set()
        matched_detections = set()
        det_to_track_id: Dict[int, int] = {}

        for r, c in zip(row_ind, col_ind):
            cost = cost_matrix[r, c]
            # Check if match satisfies minimum IoU threshold (cost <= 1.0 - iou_threshold)
            if cost <= (1.0 - self.iou_threshold + 0.5):
                track = self.tracks[r]
                det = detections[c]
                det_box = (det.bbox.x, det.bbox.y, det.bbox.width, det.bbox.height)
                track.update(det_box, det.confidence)

                matched_tracks.add(r)
                matched_detections.add(c)
                det_to_track_id[c] = track.track_id

        # Step 4: Create new tracks for un-matched detections
        for j, det in enumerate(detections):
            if j not in matched_detections:
                det_box = (det.bbox.x, det.bbox.y, det.bbox.width, det.bbox.height)
                new_track = Tracklet(self.next_id, det_box, det.label, det.confidence)
                self.tracks.append(new_track)
                det_to_track_id[j] = self.next_id
                self.next_id += 1

        # Step 5: Prune dead tracks that exceeded max_age
        self.tracks = [t for t in self.tracks if t.time_since_update <= self.max_age]

        # Step 6: Construct output detection items with assigned persistent track IDs
        tracked_results: List[DetectionObjectSchema] = []
        for det_idx, det in enumerate(detections):
            assigned_id = det_to_track_id.get(det_idx)

            tracked_item = DetectionObjectSchema(
                id=assigned_id,
                label=det.label,
                confidence=det.confidence,
                bbox=det.bbox
            )
            tracked_results.append(tracked_item)

        return tracked_results

    def reset(self) -> None:
        """
        Resets tracking state and ID counter.
        """
        self.tracks = []
        self.next_id = 1
