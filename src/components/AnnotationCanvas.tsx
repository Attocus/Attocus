import React, { useRef, useState, useEffect, useCallback } from 'react';
import { AnnotationStroke, AnnotationPoint } from '../types';
import { Trash2, Plus, Minus, Move, CornerDownLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface AnnotationCanvasProps {
  activeTool: 'pen' | 'highlighter' | 'eraser' | 'text' | 'none';
  activeColor: string;
  isDarkMode?: boolean;
  strokeWidth?: number;
  strokes: AnnotationStroke[];
  onAddStroke: (stroke: AnnotationStroke) => void;
  onUpdateStroke?: (stroke: AnnotationStroke) => void;
  onEraseStroke?: (strokeId: string) => void;
  width: number;
  height: number;
  baseWidth?: number;
  baseHeight?: number;
}

export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  activeTool,
  activeColor,
  isDarkMode = false,
  strokeWidth,
  strokes,
  onAddStroke,
  onUpdateStroke,
  onEraseStroke,
  width,
  height,
  baseWidth,
  baseHeight
}) => {
  const { isAr, t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Coordinate scaling relative to base dimensions
  const baseW = baseWidth || width;
  const baseH = baseHeight || height;
  const scaleX = width / baseW;
  const scaleY = height / baseH;

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<AnnotationPoint[]>([]);

  // Selected interactive text state
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  // Dragging & Resizing state for interactive text
  const [draggingTextId, setDraggingTextId] = useState<string | null>(null);
  const [resizingTextId, setResizingTextId] = useState<string | null>(null);
  const dragStartPosRef = useRef<{ mouseX: number; mouseY: number; initialX: number; initialY: number; initialW: number; initialH: number }>({
    mouseX: 0,
    mouseY: 0,
    initialX: 0,
    initialY: 0,
    initialW: 0,
    initialH: 0
  });

  // Filter text strokes vs drawing strokes
  const drawingStrokes = strokes.filter(s => s.tool === 'pen' || s.tool === 'highlighter');
  const textStrokes = strokes.filter(s => s.tool === 'text');

  // Canvas drawing effect for Pen & Highlighter
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

    ctx.save();
    ctx.scale(scaleX, scaleY);

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

    // Draw saved lines
    drawingStrokes.forEach(stroke => {
      renderSmoothStroke(
        stroke.points,
        stroke.color,
        stroke.width,
        stroke.opacity,
        stroke.tool === 'highlighter'
      );
    });

    // Draw active drawing line
    if (isDrawing && currentPoints.length > 1 && (activeTool === 'pen' || activeTool === 'highlighter')) {
      const liveWidth = activeTool === 'highlighter' ? (strokeWidth ? Math.max(16, strokeWidth * 5) : 22) : (strokeWidth || 3);
      renderSmoothStroke(
        currentPoints,
        activeColor,
        liveWidth,
        activeTool === 'highlighter' ? 0.35 : 0.85,
        activeTool === 'highlighter'
      );
    }

    // Eraser cursor guide
    if (isDrawing && activeTool === 'eraser' && currentPoints.length > 0) {
      const last = currentPoints[currentPoints.length - 1];
      ctx.save();
      ctx.beginPath();
      ctx.arc(last.x, last.y, 18, 0, Math.PI * 2);
      ctx.strokeStyle = isDarkMode ? '#cbd5e1' : '#64748b';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }, [drawingStrokes, currentPoints, isDrawing, width, height, activeColor, activeTool, isDarkMode, strokeWidth, scaleX, scaleY]);

  // Hit test for eraser (in base coordinates)
  const hitTestEraser = (x: number, y: number) => {
    const ERASER_RADIUS = 20;
    // Check text strokes first
    const hitText = textStrokes.find(stroke => {
      const tx = stroke.textX ?? 0;
      const ty = stroke.textY ?? 0;
      const tw = stroke.boxWidth ?? 180;
      const th = stroke.boxHeight ?? 50;
      return x >= tx - 10 && x <= tx + tw + 10 && y >= ty - 10 && y <= ty + th + 10;
    });
    if (hitText) return hitText;

    // Check drawing strokes
    return drawingStrokes.find(stroke =>
      stroke.points.some(pt => Math.sqrt((pt.x - x) ** 2 + (pt.y - y) ** 2) < ERASER_RADIUS)
    );
  };

  // Pointer interactions on Canvas
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTool === 'none') return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    const dynScaleX = rect.width / baseW;
    const dynScaleY = rect.height / baseH;
    const x = (e.clientX - rect.left) / dynScaleX;
    const y = (e.clientY - rect.top) / dynScaleY;

    if (activeTool === 'text') {
      // Create a brand new interactive text box at click position (in base coordinates)
      const boxW = 200;
      const boxH = 64;
      const clampedX = Math.max(10, Math.min(x - 20, baseW - boxW - 10));
      const clampedY = Math.max(10, Math.min(y - 15, baseH - boxH - 10));

      const newStroke: AnnotationStroke = {
        id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        tool: 'text',
        color: activeColor,
        width: 15,
        opacity: 1,
        points: [{ x: clampedX, y: clampedY }],
        text: '',
        textX: clampedX,
        textY: clampedY,
        boxWidth: boxW,
        boxHeight: boxH,
        fontSize: 15
      };

      onAddStroke(newStroke);
      setSelectedTextId(newStroke.id);
      return;
    }

    if (activeTool === 'eraser') {
      const hit = hitTestEraser(x, y);
      if (hit && onEraseStroke) onEraseStroke(hit.id);
    }

    // Deselect active text when drawing starts
    setSelectedTextId(null);
    setIsDrawing(true);
    setCurrentPoints([{ x, y }]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activeTool === 'none') return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    const dynScaleX = rect.width / baseW;
    const dynScaleY = rect.height / baseH;
    const x = (e.clientX - rect.left) / dynScaleX;
    const y = (e.clientY - rect.top) / dynScaleY;

    if (activeTool === 'eraser') {
      const hit = hitTestEraser(x, y);
      if (hit && onEraseStroke) onEraseStroke(hit.id);
    }

    setCurrentPoints(prev => [...prev, { x, y }]);
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    if ((activeTool === 'pen' || activeTool === 'highlighter') && currentPoints.length > 1) {
      const finalWidth = activeTool === 'highlighter'
        ? (strokeWidth ? Math.max(16, strokeWidth * 5) : 22)
        : (strokeWidth || 3);

      const newStroke: AnnotationStroke = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        tool: activeTool,
        color: activeColor,
        width: finalWidth,
        opacity: activeTool === 'highlighter' ? 0.35 : 0.85,
        points: currentPoints
      };
      onAddStroke(newStroke);
    }
    setIsDrawing(false);
    setCurrentPoints([]);
  };

  // ─── Interactive Text Actions (Drag, Resize, Update, Delete) ─────────────────
  const startDragText = (e: React.PointerEvent, stroke: AnnotationStroke) => {
    e.stopPropagation();
    setSelectedTextId(stroke.id);
    setDraggingTextId(stroke.id);
    dragStartPosRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialX: stroke.textX ?? 20,
      initialY: stroke.textY ?? 20,
      initialW: stroke.boxWidth ?? 200,
      initialH: stroke.boxHeight ?? 60
    };
  };

  const startResizeText = (e: React.PointerEvent, stroke: AnnotationStroke) => {
    e.stopPropagation();
    setSelectedTextId(stroke.id);
    setResizingTextId(stroke.id);
    dragStartPosRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialX: stroke.textX ?? 20,
      initialY: stroke.textY ?? 20,
      initialW: stroke.boxWidth ?? 200,
      initialH: stroke.boxHeight ?? 60
    };
  };

  // Global window listeners for drag & resize
  useEffect(() => {
    const handleWindowPointerMove = (e: PointerEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      const dynScaleX = rect && rect.width > 0 ? rect.width / baseW : scaleX;
      const dynScaleY = rect && rect.height > 0 ? rect.height / baseH : scaleY;

      if (draggingTextId) {
        const stroke = textStrokes.find(s => s.id === draggingTextId);
        if (!stroke) return;
        const deltaX = (e.clientX - dragStartPosRef.current.mouseX) / dynScaleX;
        const deltaY = (e.clientY - dragStartPosRef.current.mouseY) / dynScaleY;

        const currentW = stroke.boxWidth ?? dragStartPosRef.current.initialW;
        const currentH = stroke.boxHeight ?? dragStartPosRef.current.initialH;

        // Keep strictly within workspace bounds in base units
        const newX = Math.max(0, Math.min(dragStartPosRef.current.initialX + deltaX, baseW - currentW));
        const newY = Math.max(0, Math.min(dragStartPosRef.current.initialY + deltaY, baseH - currentH));

        if (onUpdateStroke) {
          onUpdateStroke({
            ...stroke,
            textX: Math.round(newX),
            textY: Math.round(newY),
            points: [{ x: Math.round(newX), y: Math.round(newY) }]
          });
        }
      } else if (resizingTextId) {
        const stroke = textStrokes.find(s => s.id === resizingTextId);
        if (!stroke) return;
        const deltaX = (e.clientX - dragStartPosRef.current.mouseX) / dynScaleX;
        const deltaY = (e.clientY - dragStartPosRef.current.mouseY) / dynScaleY;

        const curX = stroke.textX ?? 0;
        const curY = stroke.textY ?? 0;

        // Resizing dimensions in base units
        const newW = Math.max(120, Math.min(dragStartPosRef.current.initialW + deltaX, baseW - curX));
        const newH = Math.max(40, Math.min(dragStartPosRef.current.initialH + deltaY, baseH - curY));

        if (onUpdateStroke) {
          onUpdateStroke({
            ...stroke,
            boxWidth: Math.round(newW),
            boxHeight: Math.round(newH)
          });
        }
      }
    };

    const handleWindowPointerUp = () => {
      if (draggingTextId) setDraggingTextId(null);
      if (resizingTextId) setResizingTextId(null);
    };

    if (draggingTextId || resizingTextId) {
      window.addEventListener('pointermove', handleWindowPointerMove);
      window.addEventListener('pointerup', handleWindowPointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
    };
  }, [draggingTextId, resizingTextId, textStrokes, baseW, baseH, scaleX, scaleY, onUpdateStroke]);

  // Adjust font size
  const handleScaleFont = (stroke: AnnotationStroke, delta: number) => {
    const currentSize = stroke.fontSize || 15;
    const newSize = Math.max(11, Math.min(40, currentSize + delta));
    if (onUpdateStroke) {
      onUpdateStroke({
        ...stroke,
        fontSize: newSize,
        width: newSize
      });
    }
  };

  // Update text string
  const handleTextChange = (stroke: AnnotationStroke, newText: string) => {
    if (onUpdateStroke) {
      onUpdateStroke({
        ...stroke,
        text: newText
      });
    }
  };

  // Delete text stroke
  const handleDeleteText = (strokeId: string) => {
    if (onEraseStroke) {
      onEraseStroke(strokeId);
    }
    if (selectedTextId === strokeId) {
      setSelectedTextId(null);
    }
  };

  const getCursorStyle = () => {
    if (activeTool === 'none') return 'default';
    if (activeTool === 'eraser') return 'cell';
    if (activeTool === 'text') return 'crosshair';
    if (activeTool === 'highlighter') return 'crosshair';
    return 'crosshair';
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-20 pointer-events-none select-none overflow-hidden"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      {/* 1. Underlying Drawing Canvas */}
      <canvas
        ref={canvasRef}
        id="study-document-annotation-canvas"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          cursor: getCursorStyle(),
          pointerEvents: activeTool === 'none' ? 'none' : 'auto'
        }}
        className="absolute inset-0 touch-none pointer-events-auto"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />

      {/* 2. Interactive Text Elements Layer */}
      {textStrokes.map(stroke => {
        const isSelected = selectedTextId === stroke.id;
        const boxX = (stroke.textX ?? 20) * scaleX;
        const boxY = (stroke.textY ?? 20) * scaleY;
        const boxW = (stroke.boxWidth ?? 200) * scaleX;
        const boxH = (stroke.boxHeight ?? 60) * scaleY;
        const fontSize = (stroke.fontSize ?? 15) * Math.min(scaleX, scaleY);
        const textColor = stroke.color || (isDarkMode ? '#F8FAFC' : '#0F172A');

        return (
          <div
            key={stroke.id}
            id={`annotation-text-${stroke.id}`}
            className={`absolute pointer-events-auto transition-shadow group ${
              isSelected
                ? 'z-40 ring-2 ring-blue-500 rounded-xl shadow-xl'
                : 'z-25 hover:ring-1 hover:ring-blue-400/60 rounded-xl'
            }`}
            style={{
              left: `${boxX}px`,
              top: `${boxY}px`,
              width: `${boxW}px`,
              minHeight: `${boxH}px`
            }}
            onClick={e => {
              e.stopPropagation();
              if (activeTool === 'eraser') {
                handleDeleteText(stroke.id);
              } else {
                setSelectedTextId(stroke.id);
              }
            }}
          >
            {/* Top Toolbar for Selected Text */}
            {isSelected && (
              <div
                className={`absolute left-0 -top-10 flex items-center gap-1 px-2 py-1 rounded-xl shadow-lg border text-xs z-50 animate-in fade-in zoom-in-95 duration-100 ${
                  isDarkMode
                    ? 'bg-slate-800/95 border-slate-700 text-slate-200'
                    : 'bg-white/95 border-slate-200 text-slate-700'
                }`}
                onPointerDown={e => e.stopPropagation()}
              >
                {/* Drag Handle */}
                <div
                  className="cursor-grab active:cursor-grabbing p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center"
                  title={t('text.dragTip', 'اسحب للتحريك')}
                  onPointerDown={e => startDragText(e, stroke)}
                >
                  <Move className="w-3.5 h-3.5" />
                </div>

                <div className="w-[1px] h-3.5 bg-slate-200 dark:bg-slate-700 mx-0.5" />

                {/* Decrease Font */}
                <button
                  type="button"
                  onClick={() => handleScaleFont(stroke, -2)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                  title={t('text.decrease', 'تصغير الخط')}
                >
                  <Minus className="w-3 h-3" />
                </button>

                <span className="text-[10px] font-mono font-bold px-1 select-none">
                  {fontSize}px
                </span>

                {/* Increase Font */}
                <button
                  type="button"
                  onClick={() => handleScaleFont(stroke, 2)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                  title={t('text.increase', 'تكبير الخط')}
                >
                  <Plus className="w-3 h-3" />
                </button>

                <div className="w-[1px] h-3.5 bg-slate-200 dark:bg-slate-700 mx-0.5" />

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => handleDeleteText(stroke.id)}
                  className="p-1 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  title={t('text.delete', 'حذف النص')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* The Text Box Container */}
            <div
              className={`w-full h-full rounded-xl transition-colors relative flex flex-col ${
                isSelected
                  ? isDarkMode
                    ? 'bg-slate-900/90 border border-blue-500/40'
                    : 'bg-white/95 border border-blue-500/40 shadow-sm'
                  : isDarkMode
                  ? 'bg-slate-900/60 hover:bg-slate-900/80 backdrop-blur-2xs'
                  : 'bg-white/60 hover:bg-white/80 backdrop-blur-2xs'
              }`}
            >
              {/* Drag Header on the card */}
              <div
                className={`h-4 w-full flex items-center justify-between px-2 pt-1 cursor-grab active:cursor-grabbing select-none rounded-t-xl ${
                  isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
                }`}
                onPointerDown={e => startDragText(e, stroke)}
              >
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stroke.color }} />
                  <span className="text-[9px] font-semibold text-slate-400">
                    {t('workspace.text', 'نص')}
                  </span>
                </div>
                <Move className="w-2.5 h-2.5 text-slate-400" />
              </div>

              {/* Editable Text Area */}
              <textarea
                value={stroke.text || ''}
                onChange={e => handleTextChange(stroke, e.target.value)}
                placeholder={t('text.placeholder', 'اكتب هنا...')}
                dir={isAr ? 'rtl' : 'ltr'}
                rows={Math.max(1, Math.ceil((stroke.text?.length || 1) / 25))}
                className="w-full flex-1 bg-transparent p-2 text-slate-900 dark:text-slate-100 font-semibold outline-none resize-none overflow-hidden leading-snug"
                style={{
                  fontSize: `${fontSize}px`,
                  color: textColor
                }}
                onFocus={() => setSelectedTextId(stroke.id)}
              />

              {/* Resize Handle at Bottom-Right Corner */}
              {isSelected && (
                <div
                  className="absolute bottom-1 right-1 w-3.5 h-3.5 cursor-se-resize flex items-center justify-center rounded-sm bg-blue-500 text-white shadow-xs hover:scale-110 active:scale-95 transition-transform"
                  title="سحب لتغيير الحجم"
                  onPointerDown={e => startResizeText(e, stroke)}
                >
                  <svg className="w-2 h-2 fill-current" viewBox="0 0 6 6">
                    <polygon points="6 0 6 6 0 6" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};