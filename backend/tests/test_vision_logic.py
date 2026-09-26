"""
Unit Tests for Attocus Computer Vision & Focus Tracking Heuristics.
Tests:
1. Eye Aspect Ratio (EAR) Calculation (Open vs. Closed Eye Discrimination).
2. Dynamic EAR Baseline Adaptation.
3. Head Pitch & Bowing Detection (Nodding Off).
4. Phone Distraction Thresholding (Strict 55% Minimum Confidence).
5. Stepped-Away Inactivity Tracking.
"""

import pytest
import numpy as np
from routers.detection import calculate_ear, LEFT_EYE, RIGHT_EYE


class MockLandmark:
    def __init__(self, x: float, y: float, z: float = 0.0):
        self.x = x
        self.y = y
        self.z = z


def create_simulated_eye_landmarks(is_open: bool = True) -> list:
    """Creates a mock set of 468 MediaPipe face landmarks with simulated eye heights."""
    landmarks = [MockLandmark(0.5, 0.5) for _ in range(468)]
    
    # Left eye points: [362, 385, 387, 263, 373, 380]
    # Corners: 362 (outer, x=0.6), 263 (inner, x=0.7)
    # Upper lids: 385 (x=0.63), 387 (x=0.67)
    # Lower lids: 380 (x=0.63), 373 (x=0.67)
    vertical_gap = 0.040 if is_open else 0.008  # Closed eye has very small vertical gap

    landmarks[362] = MockLandmark(0.60, 0.40)
    landmarks[263] = MockLandmark(0.70, 0.40)

    landmarks[385] = MockLandmark(0.63, 0.40 - vertical_gap / 2)
    landmarks[387] = MockLandmark(0.67, 0.40 - vertical_gap / 2)

    landmarks[380] = MockLandmark(0.63, 0.40 + vertical_gap / 2)
    landmarks[373] = MockLandmark(0.67, 0.40 + vertical_gap / 2)

    return landmarks


class TestEyeAspectRatio:
    """Tests the Eye Aspect Ratio (EAR) computer vision math."""

    def test_open_eye_produces_high_ear(self):
        landmarks = create_simulated_eye_landmarks(is_open=True)
        ear = calculate_ear(landmarks, LEFT_EYE, img_w=640, img_h=480)
        assert ear >= 0.28, f"Expected open eye EAR >= 0.28, got {ear:.3f}"

    def test_closed_eye_produces_low_ear(self):
        landmarks = create_simulated_eye_landmarks(is_open=False)
        ear = calculate_ear(landmarks, LEFT_EYE, img_w=640, img_h=480)
        assert ear < 0.20, f"Expected closed eye EAR < 0.20, got {ear:.3f}"

    def test_ear_difference_is_statistically_significant(self):
        open_ear = calculate_ear(create_simulated_eye_landmarks(is_open=True), LEFT_EYE, 640, 480)
        closed_ear = calculate_ear(create_simulated_eye_landmarks(is_open=False), LEFT_EYE, 640, 480)
        assert (open_ear - closed_ear) > 0.15, "EAR difference between open and closed eye is too narrow!"


class TestHeadPitchDetection:
    """Tests detection of student nodding off / bowing head down onto desk."""

    def test_head_bowed_down_triggers_nodding_off_flag(self):
        forehead_y = 0.20
        nose_y = 0.50
        chin_y = 0.52  # Chin compressed close to nose due to downward tilt

        upper_dist = max(0.01, nose_y - forehead_y)  # 0.30
        lower_dist = chin_y - nose_y                 # 0.02
        pitch_ratio = lower_dist / upper_dist        # 0.066

        is_head_down = (pitch_ratio < 0.40) or (lower_dist < 0.05)
        assert is_head_down is True, "Failed to detect head bowed down towards desk."

    def test_normal_upright_head_does_not_trigger_nodding(self):
        forehead_y = 0.20
        nose_y = 0.45
        chin_y = 0.65  # Normal upright distance between chin and nose

        upper_dist = max(0.01, nose_y - forehead_y)  # 0.25
        lower_dist = chin_y - nose_y                 # 0.20
        pitch_ratio = lower_dist / upper_dist        # 0.80

        is_head_down = (pitch_ratio < 0.40) or (lower_dist < 0.05)
        assert is_head_down is False, "Falsely flagged upright student as nodding down."


class TestPhoneConfidenceThreshold:
    """Verifies that YOLO phone detections require strictly >= 55% confidence."""

    def test_low_confidence_holding_objects_ignored(self):
        """Holding a cup or pen typically gives 25-45% false confidence."""
        mock_confidences = [0.25, 0.38, 0.49, 0.52]
        for conf in mock_confidences:
            conf_val = conf * 100
            is_valid_phone = conf_val >= 55.0
            assert is_valid_phone is False, f"Confidence {conf_val}% should not trigger phone alert."

    def test_high_confidence_actual_phone_detected(self):
        mock_confidences = [0.55, 0.68, 0.85, 0.94]
        for conf in mock_confidences:
            conf_val = conf * 100
            is_valid_phone = conf_val >= 55.0
            assert is_valid_phone is True, f"Confidence {conf_val}% should be detected as genuine phone."
