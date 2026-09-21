import React, { useRef, useState, useEffect } from 'react';
import { AnnotationStroke, AnnotationPoint } from '../types';

interface AnnotationCanvasProps {
  activeTool: 'pen' | 'highlighter' | 'eraser' | 'none';
  activeColor: string;
  strokes: AnnotationStroke[];
  onAddStroke: (stroke: AnnotationStroke) => void;
  onEraseStrokes?: (updatedStrokes: AnnotationStroke[]) => void;
  width: number;
  height: number;
}

function sqr(x: number) {
  return x * x;
}

function dist2(v: { x: number; y: number }, w: { x: number; y: number }) {
  return sqr(v.x - w.x) + sqr(v.y - w.y);
}

function distToSegmentSquared(
  p: { x: number; y: number },
  v: { x: number; y: number },
  w: { x: number; y: number }
) {
  const l2 = dist2(v, w);
  if (l2 === 0) return dist2(p, v);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist2(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
}

function isStrokeHit(stroke: AnnotationStroke, x: number, y: number, radius: number): boolean {
  const r2 = sqr(radius + stroke.width / 2);
  const p = { x, y };
  if (stroke.points.length === 1) {
    return dist2(p, stroke.points[0]) <= r2;
  }
  for (let i = 0; i < stroke.points.length - 1; i++) {
    if (distToSegmentSquared(p, stroke.points[i], stroke.points[i + 1]) <= r2) {
      return true;
    }
  }
  return false;
}

export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  activeTool,
  activeColor,
  strokes,
  onAddStroke,
  onEraseStrokes,
  width,
  height
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<AnnotationPoint[]>([]);
  const [eraserPos, setEraserPos] = useState<{ x: number; y: number } | null>(null);

  const ERASER_RADIUS = 16;

  // Redraw whenever strokes or active drawing change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Draw all completed strokes
    strokes.forEach(stroke => {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = stroke.opacity;

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });

    // Draw active drawing stroke (pen or highlighter)
    if (isDrawing && activeTool !== 'eraser' && currentPoints.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = activeTool === 'highlighter' ? 22 : 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = activeTool === 'highlighter' ? 0.35 : 0.85;

      ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
      for (let i = 1; i < currentPoints.length; i++) {
        ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
      }
      ctx.stroke();
    }

    // Draw visual eraser feedback indicator if eraser is active and hovering
    if (activeTool === 'eraser' && eraserPos) {
      ctx.beginPath();
      ctx.arc(eraserPos.x, eraserPos.y, ERASER_RADIUS, 0, Math.PI * 2);
      ctx.strokeStyle = isDrawing ? '#E11D48' : '#94A3B8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = isDrawing ? 'rgba(225, 29, 72, 0.15)' : 'rgba(148, 163, 184, 0.1)';
      ctx.fill();
    }

    ctx.globalAlpha = 1.0;
  }, [strokes, currentPoints, isDrawing, width, height, activeColor, activeTool, eraserPos]);

  // Erase any strokes intersecting with (x, y)
  const eraseAtPosition = (x: number, y: number) => {
    if (!onEraseStrokes) return;
    const remaining = strokes.filter(s => !isStrokeHit(s, x, y, ERASER_RADIUS));
    if (remaining.length !== strokes.length) {
      onEraseStrokes(remaining);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool === 'none') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);

    if (activeTool === 'eraser') {
      setEraserPos({ x, y });
      eraseAtPosition(x, y);
    } else {
      setCurrentPoints([{ x, y }]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool === 'none') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'eraser') {
      setEraserPos({ x, y });
      if (isDrawing) {
        eraseAtPosition(x, y);
      }
    } else if (isDrawing) {
      setCurrentPoints(prev => [...prev, { x, y }]);
    }
  };

  const handlePointerUp = () => {
    if (isDrawing && activeTool !== 'eraser' && activeTool !== 'none') {
      if (currentPoints.length > 1) {
        const newStroke: AnnotationStroke = {
          id: `stroke-${Date.now()}-${Math.random()}`,
          tool: activeTool,
          color: activeColor,
          width: activeTool === 'highlighter' ? 22 : 2.5,
          opacity: activeTool === 'highlighter' ? 0.35 : 0.85,
          points: currentPoints
        };
        onAddStroke(newStroke);
      }
    }
    setIsDrawing(false);
    setCurrentPoints([]);
  };

  const handlePointerLeave = () => {
    handlePointerUp();
    if (activeTool === 'eraser') {
      setEraserPos(null);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      id="study-document-annotation-canvas"
      width={width}
      height={height}
      className={`absolute inset-0 z-20 ${activeTool === 'none'
          ? 'pointer-events-none'
          : activeTool === 'eraser'
            ? 'cursor-none'
            : activeTool === 'highlighter'
              ? 'cursor-crosshair'
              : 'cursor-cell'
        }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    />
  );
};
