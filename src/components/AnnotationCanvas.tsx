import React, { useRef, useState, useEffect } from 'react';
import { AnnotationStroke, AnnotationPoint } from '../types';

interface AnnotationCanvasProps {
  activeTool: 'pen' | 'highlighter' | 'none';
  activeColor: string;
  strokes: AnnotationStroke[];
  onAddStroke: (stroke: AnnotationStroke) => void;
  width: number;
  height: number;
}

export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  activeTool,
  activeColor,
  strokes,
  onAddStroke,
  width,
  height
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<AnnotationPoint[]>([]);

  // Redraw whenever strokes change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

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

    // Draw active stroke
    if (isDrawing && currentPoints.length > 1) {
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

    ctx.globalAlpha = 1.0;
  }, [strokes, currentPoints, isDrawing, width, height, activeColor, activeTool]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool === 'none') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawing(true);
    setCurrentPoints([{ x, y }]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activeTool === 'none') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentPoints(prev => [...prev, { x, y }]);
  };

  const handlePointerUp = () => {
    if (!isDrawing || activeTool === 'none') return;
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
    setIsDrawing(false);
    setCurrentPoints([]);
  };

  return (
    <canvas
      ref={canvasRef}
      id="study-document-annotation-canvas"
      width={width}
      height={height}
      className={`absolute inset-0 z-20 ${
        activeTool === 'none'
          ? 'pointer-events-none'
          : activeTool === 'highlighter'
          ? 'cursor-crosshair'
          : 'cursor-cell'
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    />
  );
};
