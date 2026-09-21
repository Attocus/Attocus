import React, { useRef, useState, useEffect } from 'react';
import { AnnotationStroke, AnnotationPoint } from '../types';

interface AnnotationCanvasProps {
  activeTool: 'pen' | 'highlighter' | 'eraser' | 'text' | 'none';
  activeColor: string;
  isDarkMode?: boolean;
  strokes: AnnotationStroke[];
  onAddStroke: (stroke: AnnotationStroke) => void;
  onEraseStroke?: (strokeId: string) => void;
  width: number;
  height: number;
}

export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  activeTool,
  activeColor,
  isDarkMode,
  strokes,
  onAddStroke,
  onEraseStroke,
  width,
  height
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<AnnotationPoint[]>([]);

  // State for active text input box
  const [textInput, setTextInput] = useState<{ x: number; y: number; visible: boolean } | null>(null);
  const [textValue, setTextValue] = useState('');
  const textInputRef = useRef<HTMLInputElement>(null);

  // رسم الخطوط
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

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
      if (isHighlighter) ctx.globalCompositeOperation = 'multiply';
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 1; i++) {
        const midX = (points[i].x + points[i + 1].x) / 2;
        const midY = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.stroke();
      ctx.restore();
    };

    strokes.forEach(stroke => {
      if (stroke.tool === 'text') {
        // رسم النص على الـ canvas مباشرة
        ctx.save();
        ctx.font = `600 14px 'Inter', sans-serif`;
        ctx.fillStyle = stroke.color;
        ctx.globalAlpha = 1;
        ctx.textAlign = 'right';
        // ظل خفيف لتحسين القراءة
        ctx.shadowColor = isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)';
        ctx.shadowBlur = 4;
        ctx.fillText(stroke.text || '', stroke.textX || 0, stroke.textY || 0);
        ctx.restore();
        return;
      }
      renderSmoothStroke(
        stroke.points,
        stroke.color,
        stroke.width,
        stroke.opacity,
        stroke.tool === 'highlighter'
      );
    });

    if (isDrawing && currentPoints.length > 1 && (activeTool === 'pen' || activeTool === 'highlighter')) {
      renderSmoothStroke(
        currentPoints,
        activeColor,
        activeTool === 'highlighter' ? 22 : 2.5,
        activeTool === 'highlighter' ? 0.35 : 0.85,
        activeTool === 'highlighter'
      );
    }

    // مؤشر الممحاة
    if (isDrawing && activeTool === 'eraser' && currentPoints.length > 0) {
      const last = currentPoints[currentPoints.length - 1];
      ctx.save();
      ctx.beginPath();
      ctx.arc(last.x, last.y, 18, 0, Math.PI * 2);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.restore();
    }
  }, [strokes, currentPoints, isDrawing, width, height, activeColor, activeTool, isDarkMode]);

  // focus على input النص عند ظهوره
  useEffect(() => {
    if (textInput?.visible && textInputRef.current) {
      setTimeout(() => textInputRef.current?.focus(), 30);
    }
  }, [textInput]);

  const hitTestEraser = (x: number, y: number) => {
    const ERASER_RADIUS = 18;
    return strokes.find(stroke => {
      if (stroke.tool === 'text') {
        const tx = stroke.textX || 0;
        const ty = stroke.textY || 0;
        return Math.abs(x - tx) < 100 && Math.abs(y - ty) < 22;
      }
      return stroke.points.some(pt =>
        Math.sqrt((pt.x - x) ** 2 + (pt.y - y) ** 2) < ERASER_RADIUS
      );
    });
  };

  const commitText = () => {
    if (textInput && textValue.trim()) {
      const newStroke: AnnotationStroke = {
        id: `text-${Date.now()}-${Math.random()}`,
        tool: 'text',
        color: activeColor,
        width: 14,
        opacity: 1,
        points: [{ x: textInput.x, y: textInput.y }],
        text: textValue.trim(),
        textX: textInput.x,
        textY: textInput.y
      };
      onAddStroke(newStroke);
    }
    setTextInput(null);
    setTextValue('');
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool === 'none') return;

    // إذا كان هناك input نص مفتوح، أغلقه أولاً
    if (textInput?.visible) {
      commitText();
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'text') {
      setTextValue('');
      setTextInput({ x, y, visible: true });
      return;
    }

    if (activeTool === 'eraser') {
      const hit = hitTestEraser(x, y);
      if (hit && onEraseStroke) onEraseStroke(hit.id);
    }

    setIsDrawing(true);
    setCurrentPoints([{ x, y }]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activeTool === 'none') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'eraser') {
      const hit = hitTestEraser(x, y);
      if (hit && onEraseStroke) onEraseStroke(hit.id);
    }
    setCurrentPoints(prev => [...prev, { x, y }]);
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    if ((activeTool === 'pen' || activeTool === 'highlighter') && currentPoints.length > 1) {
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

  const getCursorStyle = () => {
    if (activeTool === 'none') return 'default';
    if (activeTool === 'eraser') return 'cell';
    if (activeTool === 'text') return 'text';
    if (activeTool === 'highlighter') return 'crosshair';
    return 'crosshair';
  };

  return (
    <div className="absolute inset-0 z-20">
      <canvas
        ref={canvasRef}
        id="study-document-annotation-canvas"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          cursor: getCursorStyle(),
          pointerEvents: activeTool === 'none' ? 'none' : 'auto'
        }}
        className="absolute inset-0 touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />

      {/* Text input box */}
      {textInput?.visible && (
        <div
          className="absolute z-30"
          style={{
            left: Math.min(textInput.x, width - 220),
            top: Math.max(textInput.y - 22, 4)
          }}
        >
          <input
            ref={textInputRef}
            value={textValue}
            onChange={e => setTextValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') commitText();
              if (e.key === 'Escape') { setTextInput(null); setTextValue(''); }
            }}
            onBlur={commitText}
            placeholder="اكتب هنا..."
            dir="rtl"
            className="bg-white/95 backdrop-blur-sm border-2 rounded-xl px-3 py-1.5 text-sm font-semibold outline-none shadow-xl min-w-[140px] max-w-[200px]"
            style={{
              borderColor: activeColor,
              color: activeColor,
              boxShadow: `0 0 0 3px ${activeColor}22`
            }}
          />
          <div className="text-[10px] text-slate-400 mt-0.5 text-center bg-white/80 rounded px-1">
            Enter للحفظ · Esc للإلغاء
          </div>
        </div>
      )}
    </div>
  );
};