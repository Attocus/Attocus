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

  // رسم الخطوط السابقة والخط النشط بدقة متناهية
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ضبط الدقة لشاشات Retina
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    // دالة مساعدة لرسم خطوط ناعمة
    const renderSmoothStroke = (
      points: AnnotationPoint[],
      color: string,
      lineWidth: number,
      opacity: number,
      isHighlighter: boolean
    ) => {
      if (points.length < 2) return;

      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = opacity;

      // استخدام تأثير التظليل الطبيعي للهايلايتر
      if (isHighlighter) {
        ctx.globalCompositeOperation = 'multiply';
      }

      ctx.moveTo(points[0].x, points[0].y);

      // تنعيم المسار باستخدام Quadratic Curves
      for (let i = 1; i < points.length - 1; i++) {
        const midX = (points[i].x + points[i + 1].x) / 2;
        const midY = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
      }

      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.stroke();
      ctx.restore();
    };

    // 1. رسم الخطوط المحفوظة مسبقاً
    strokes.forEach(stroke => {
      renderSmoothStroke(
        stroke.points,
        stroke.color,
        stroke.width,
        stroke.opacity,
        stroke.tool === 'highlighter'
      );
    });

    // 2. رسم الخط الحالي أثناء التدوين
    if (isDrawing && currentPoints.length > 1) {
      renderSmoothStroke(
        currentPoints,
        activeColor,
        activeTool === 'highlighter' ? 22 : 2.5,
        activeTool === 'highlighter' ? 0.35 : 0.85,
        activeTool === 'highlighter'
      );
    }
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
      style={{ width: `${width}px`, height: `${height}px` }}
      className={`absolute inset-0 z-20 touch-none ${activeTool === 'none'
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