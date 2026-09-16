import base64
import cv2
import numpy as np
import mediapipe as mp
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. تحميل مودل YOLO للجوال
model = YOLO("./models/yolo11n.pt")

# 2. إعداد MediaPipe Face Mesh
try:
    mp_face_mesh = mp.solutions.face_mesh
except AttributeError:
    import mediapipe.solutions.face_mesh as mp_face_mesh

face_mesh_detector = mp_face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

LEFT_EYE = [362, 385, 387, 263, 373, 380]
RIGHT_EYE = [33, 160, 158, 133, 153, 144]

# عدد الفريمات المتتالية المطلوبة لتأكيد النعاس
SLEEPY_CONSECUTIVE_FRAMES = 6

def calculate_ear(landmarks, eye_points, img_w, img_h):
    coords = [np.array([landmarks[i].x * img_w, landmarks[i].y * img_h]) for i in eye_points]
    v1 = np.linalg.norm(coords[1] - coords[5])
    v2 = np.linalg.norm(coords[2] - coords[4])
    h = np.linalg.norm(coords[0] - coords[3])
    return (v1 + v2) / (2.0 * h)

@app.websocket("/ws/detect")
async def websocket_detect(websocket: WebSocket):
    await websocket.accept()
    
    sleepy_frame_counter = 0
    calibration_ears = []
    baseline_ear = None  # معدل فتح العين الطبيعي للمستخدم

    try:
        while True:
            data = await websocket.receive_text()
            if "," in data:
                data = data.split(",")[1]
            
            img_bytes = base64.b64decode(data)
            np_arr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            if frame is None:
                continue

            h, w, _ = frame.shape

            # أ) كشف الجوال
            results = model.predict(source=frame, classes=[67], conf=0.40, verbose=False)
            phone_detected = len(results[0].boxes) > 0
            confidence = float(results[0].boxes.conf[0]) * 100 if phone_detected else 0.0

            # ب) كشف النعاس والتكيف التلقائي
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mesh_results = face_mesh_detector.process(rgb_frame)
            is_sleepy = False

            if mesh_results.multi_face_landmarks:
                landmarks = mesh_results.multi_face_landmarks[0].landmark
                left_ear = calculate_ear(landmarks, LEFT_EYE, w, h)
                right_ear = calculate_ear(landmarks, RIGHT_EYE, w, h)
                avg_ear = (left_ear + right_ear) / 2.0

                # مرحلة المعايرة التلقائية (أول 30 فريم يتم فيها حفظ مستوى فتح العين الطبيعي)
                if len(calibration_ears) < 30:
                    calibration_ears.append(avg_ear)
                    if len(calibration_ears) == 30:
                        baseline_ear = np.mean(calibration_ears)
                else:
                    # عتبة النعاس تصبح 50% من مستوى فتح العين الطبيعي فقط
                    threshold = baseline_ear * 0.50

                    if avg_ear < threshold:
                        sleepy_frame_counter += 1
                    else:
                        sleepy_frame_counter = 0

                    if sleepy_frame_counter >= SLEEPY_CONSECUTIVE_FRAMES:
                        is_sleepy = True
            else:
                sleepy_frame_counter = 0

            await websocket.send_json({
                "phone_detected": phone_detected,
                "confidence": round(confidence, 1),
                "is_sleepy": is_sleepy
            })

    except WebSocketDisconnect:
        print("Client disconnected")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)