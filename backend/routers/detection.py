"""
WebSocket Detection Router for Attocus.
Uses YOLO11n for mobile phone distraction detection and
MediaPipe FaceMesh for eye aspect ratio (EAR) drowsiness detection.
"""

import os
# Force pure-python protobuf implementation to avoid C++ parser mismatch with MediaPipe graphs
os.environ["PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION"] = "python"

import base64
import logging
from pathlib import Path
from typing import Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger("AttocusDetection")
logger.setLevel(logging.INFO)

detection_router = APIRouter(tags=["Detection"])

# Locate YOLO model
POSSIBLE_MODEL_PATHS = [
    Path(__file__).resolve().parent.parent / "models" / "yolo11n.pt",
    Path(__file__).resolve().parent.parent / "yolo11n.pt",
    Path(os.getcwd()) / "models" / "yolo11n.pt",
    Path(os.getcwd()) / "yolo11n.pt",
    Path(os.getcwd()) / "backend" / "models" / "yolo11n.pt",
]

yolo_model: Any = None
face_mesh_detector: Any = None

# 1. Initialize YOLO
try:
    from ultralytics import YOLO
    for p in POSSIBLE_MODEL_PATHS:
        if p.is_file():
            logger.info(f"[Detection] Loading YOLO model from: {p}")
            yolo_model = YOLO(str(p))
            break
    if not yolo_model:
        logger.warning("[Detection] yolo11n.pt not found in candidate paths.")
    else:
        logger.info("[Detection] YOLO model loaded successfully.")
except Exception as err:
    logger.error(f"[Detection] YOLO initialization error: {err}")

# 2. Initialize MediaPipe FaceMesh
try:
    import mediapipe as mp
    mp_face_mesh: Any = getattr(mp, "solutions", None)
    if mp_face_mesh and hasattr(mp_face_mesh, "face_mesh"):
        mp_face_mesh = mp_face_mesh.face_mesh
    else:
        import mediapipe.solutions.face_mesh as mp_face_mesh  # type: ignore

    face_mesh_detector = mp_face_mesh.FaceMesh(
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.4,
        min_tracking_confidence=0.4
    )
    logger.info("[Detection] MediaPipe FaceMesh detector initialized successfully.")
except Exception as err:
    logger.error(f"[Detection] MediaPipe initialization error: {err}")


LEFT_EYE = [362, 385, 387, 263, 373, 380]
RIGHT_EYE = [33, 160, 158, 133, 153, 144]


def calculate_ear(landmarks, eye_points, img_w, img_h):
    import numpy as np
    coords = [np.array([landmarks[i].x * img_w, landmarks[i].y * img_h]) for i in eye_points]
    v1 = np.linalg.norm(coords[1] - coords[5])
    v2 = np.linalg.norm(coords[2] - coords[4])
    h = np.linalg.norm(coords[0] - coords[3])
    return (v1 + v2) / (2.0 * h) if h != 0 else 0.0


@detection_router.websocket("/ws/detect")
async def websocket_detect(websocket: WebSocket):
    await websocket.accept()
    logger.info("[Detection] WebSocket client connected to /ws/detect")
    
    sleepy_frame_counter = 0
    away_frame_counter = 0
    calibration_ears = []
    baseline_ear = 0.28  # Default open-eye baseline so it detects drowsiness immediately

    try:
        while True:
            data = await websocket.receive_text()
            if "," in data:
                data = data.split(",")[1]

            if not yolo_model and not face_mesh_detector:
                await websocket.send_json({
                    "phone_detected": False,
                    "confidence": 0.0,
                    "is_sleepy": False,
                    "is_away": False,
                    "error": "No CV models available"
                })
                continue

            import cv2
            import numpy as np

            img_bytes = base64.b64decode(data)
            np_arr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            if frame is None:
                continue

            h, w, _ = frame.shape
            phone_detected = False
            confidence = 0.0
            is_sleepy = False
            is_away = False

            # 1. Phone detection using YOLO (class 67 is cell phone in COCO)
            # Raised threshold to 0.55 (55%) to prevent false positives from holding a cup/mug, drinking, or resting hand
            if yolo_model:
                try:
                    results: Any = yolo_model.predict(source=frame, classes=[67], conf=0.55, verbose=False)
                    if results and len(results[0].boxes) > 0:
                        conf_val = float(results[0].boxes.conf[0]) * 100
                        if conf_val >= 55.0:
                            phone_detected = True
                            confidence = conf_val
                            logger.info(f"[Detection] 📱 Phone spotted! Confidence: {confidence:.1f}%")
                except Exception as yolo_err:
                    logger.warning(f"[Detection] YOLO inference error: {yolo_err}")

            # 2. Face tracking: Drowsiness vs Stepped Away
            if face_mesh_detector:
                try:
                    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    mesh_results: Any = face_mesh_detector.process(rgb_frame)
                    multi_face_landmarks = getattr(mesh_results, "multi_face_landmarks", None)

                    if multi_face_landmarks:
                        away_frame_counter = 0
                        landmarks = multi_face_landmarks[0].landmark
                        left_ear = calculate_ear(landmarks, LEFT_EYE, w, h)
                        right_ear = calculate_ear(landmarks, RIGHT_EYE, w, h)
                        avg_ear = (left_ear + right_ear) / 2.0

                        # Smooth baseline adaptation - ONLY when eyes are clearly open!
                        if avg_ear > 0.24 and len(calibration_ears) < 30:
                            calibration_ears.append(avg_ear)
                            baseline_ear = float(np.mean(calibration_ears))

                        # Closed eye threshold: at least 0.21 or 75% of baseline
                        threshold = max(0.21, min(0.24, (baseline_ear or 0.28) * 0.75))

                        # Check head pitch (nodding off / bowing head down towards chest/desk)
                        forehead_y = landmarks[10].y
                        nose_y = landmarks[1].y
                        chin_y = landmarks[152].y
                        upper_dist = max(0.01, nose_y - forehead_y)
                        lower_dist = chin_y - nose_y
                        pitch_ratio = lower_dist / upper_dist
                        is_head_down = (pitch_ratio < 0.40) or (lower_dist < 0.05)

                        is_eyes_closed = (avg_ear < threshold) or (left_ear < 0.20 and right_ear < 0.20)

                        if is_eyes_closed or is_head_down:
                            sleepy_frame_counter += 1
                        else:
                            sleepy_frame_counter = max(0, sleepy_frame_counter - 1)

                        if sleepy_frame_counter >= 2:
                            is_sleepy = True
                            logger.info(f"[Detection] 😴 Sleep detected! EAR={avg_ear:.3f} (thresh={threshold:.3f}), head_down={is_head_down}")
                    else:
                        # No face visible in frame: Student stepped away from desk
                        sleepy_frame_counter = 0
                        away_frame_counter += 1
                        if away_frame_counter >= 3:
                            is_away = True
                            phone_detected = False
                            logger.info("[Detection] 🚶‍♂️ Student stepped away from desk!")
                except Exception as mp_err:
                    logger.warning(f"[Detection] MediaPipe inference error: {mp_err}")

            await websocket.send_json({
                "phone_detected": phone_detected,
                "confidence": round(confidence, 1),
                "is_sleepy": is_sleepy,
                "is_away": is_away
            })

    except WebSocketDisconnect:
        logger.info("[Detection] WebSocket client disconnected.")
    except Exception as err:
        logger.error(f"[Detection] WebSocket error: {err}")
