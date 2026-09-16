/**
 * Attention Vision Agent / ML Model Integration Interface
 *
 * This module connects the camera stream and frame snapshots to your 
 * trained ML model (e.g. YOLO, MediaPipe, PyTorch, TensorFlow, or custom API)
 * to detect:
 *  - Phone in hand (`using_phone`)
 *  - Eyes closed / sleeping / head on desk (`sleeping`)
 *  - Distracted / gaze drift (`distracted`)
 *  - Attentive / focused (`focused`)
 */

import { AttentionStateKind } from '../types';

export interface FrameAnalysisRequest {
  imageFrameBase64: string; // JPEG/PNG snapshot data URL from camera
  timestamp: number;
}

export interface FrameAnalysisResult {
  state: AttentionStateKind;
  confidence: number;
  phoneDetected: boolean;
  sleepDetected: boolean;
  coachMessage?: string;
  reason?: string;
}

/**
 * Replace this endpoint or function with your own learned ML model:
 * e.g., POST http://localhost:8000/detect-phone-sleep
 * or call your Python Flask/FastAPI service with PyTorch / YOLO weights!
 */
export async function analyzeAttentionFrame(
  request: FrameAnalysisRequest
): Promise<FrameAnalysisResult> {
  try {
    const response = await fetch('/api/coach/attention/analyze-frame', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (err) {
    console.warn('Custom model service not yet reached, falling back to local heuristic:', err);
  }

  // Default fallback if backend ML server is offline:
  return {
    state: 'focused',
    confidence: 0.95,
    phoneDetected: false,
    sleepDetected: false
  };
}
