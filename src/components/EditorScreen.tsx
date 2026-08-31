import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCw,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Type,
  Square,
  PenTool,
  Hash,
  Stamp,
  Crop,
  Download,
  RotateCcw,
  Check,
  Plus,
  Eye,
  Undo,
} from 'lucide-react';
import { TopBar } from './TopBar';
import {
  EditPlan,
  PagePlan,
  PageMark,
  TextMark,
  FillMark,
  InkMark,
  NormalizedPoint,
  NumberPosition,
  NumberFormat,
  WatermarkLayout,
  EditorMode,
} from '../types';
import { PdfEngine } from '../services/pdfEngine';
import { DocumentStore } from '../services/documentStore';
import { BusyOverlay } from './BusyOverlay';

interface EditorScreenProps {
  filename: string;
  data: Uint8Array;
  password?: string;
  onBack: () => void;
  onSaved: (newData: Uint8Array, newFilename: string) => void;
}

export const EditorScreen: React.FC<EditorScreenProps> = ({
  filename,
  data,
  password,
  onBack,
  onSaved,
}) => {
  const [pages, setPages] = useState<PagePlan[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [editorMode, setEditorMode] = useState<EditorMode>('pages');
  const [busyMessage, setBusyMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  // Numbering options
  const [enableNumbers, setEnableNumbers] = useState(false);
  const [numberPosition, setNumberPosition] = useState<NumberPosition>(NumberPosition.BOTTOM_CENTER);
  const [numberFormat, setNumberFormat] = useState<NumberFormat>(NumberFormat.OF_TOTAL);
  const [numberStart, setNumberStart] = useState<number>(1);

  // Watermark options
  const [enableWatermark, setEnableWatermark] = useState(false);
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkLayout, setWatermarkLayout] = useState<WatermarkLayout>(WatermarkLayout.DIAGONAL);
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.25);
  const [watermarkColor, setWatermarkColor] = useState('#999999');

  // Text tool state
  const [newText, setNewText] = useState('Sample Note');
  const [textColor, setTextColor] = useState('#d90429');
  const [textBg, setTextBg] = useState('#ffffff');
  const [textBold, setTextBold] = useState(true);
  const [textSize, setTextSize] = useState(16);

  // Redact tool state
  const [fillColor, setFillColor] = useState('#111111');
  const [fillOpacity, setFillOpacity] = useState(1.0);
  const [isRedaction, setIsRedaction] = useState(true);

  // Ink drawing state
  const [inkColor, setInkColor] = useState('#004b23');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<NormalizedPoint[]>([]);

  // Crop tool state for active page
  const [cropTop, setCropTop] = useState(0);
  const [cropBottom, setCropBottom] = useState(0);
  const [cropLeft, setCropLeft] = useState(0);
  const [cropRight, setCropRight] = useState(0);

  // Canvas refs for live preview and drawing
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize pages from document
  useEffect(() => {
    const init = async () => {
      setBusyMessage('Loading document structure...');
      try {
        const meta = await PdfEngine.readMeta(data, password);
        const initialPages: PagePlan[] = meta.pageSizes.map((size, idx) => ({
          id: `page_${idx}_${Date.now()}`,
          originalPageIndex: idx,
          rotation: 0,
          marks: [],
          aspectRatio: size.aspectRatio,
          widthPt: size.width,
          heightPt: size.height,
        }));
        setPages(initialPages);
      } catch (e: any) {
        console.error(e);
      } finally {
        setBusyMessage(null);
      }
    };
    init();
  }, [data, password]);

  const activePage = pages[activePageIndex];

  // Synchronize crop sliders with active page
  useEffect(() => {
    if (activePage?.crop) {
      setCropTop(activePage.crop.top || 0);
      setCropBottom(activePage.crop.bottom || 0);
      setCropLeft(activePage.crop.left || 0);
      setCropRight(activePage.crop.right || 0);
    } else {
      setCropTop(0);
      setCropBottom(0);
      setCropLeft(0);
      setCropRight(0);
    }
  }, [activePageIndex, activePage]);

  // Render base PDF on canvas whenever active page or its rotation changes
  useEffect(() => {
    if (!activePage || !mainCanvasRef.current) return;
    const render = async () => {
      try {
        await PdfEngine.renderPageToCanvas(
          data,
          activePage.originalPageIndex,
          mainCanvasRef.current!,
          1000,
          password
        );
      } catch (e) {
        console.warn('Canvas render error:', e);
      }
    };
    render();
  }, [activePageIndex, activePage?.originalPageIndex, data, password]);

  // --- Page Operations ---
  const handleRotate = () => {
    if (!activePage) return;
    const nextRot = (activePage.rotation + 90) % 360;
    setPages((prev) =>
      prev.map((p, idx) => (idx === activePageIndex ? { ...p, rotation: nextRot } : p))
    );
  };

  const handleDuplicate = () => {
    if (!activePage) return;
    const copy: PagePlan = {
      ...activePage,
      id: `copy_${Date.now()}_${Math.random()}`,
      marks: [...activePage.marks],
    };
    const nextPages = [...pages];
    nextPages.splice(activePageIndex + 1, 0, copy);
    setPages(nextPages);
    setActivePageIndex(activePageIndex + 1);
  };

  const handleDelete = () => {
    if (pages.length <= 1) {
      alert('Document must contain at least one page.');
      return;
    }
    const nextPages = pages.filter((_, idx) => idx !== activePageIndex);
    setPages(nextPages);
    setActivePageIndex(Math.max(0, activePageIndex - 1));
  };

  const handleMoveLeft = () => {
    if (activePageIndex === 0) return;
    const nextPages = [...pages];
    const item = nextPages.splice(activePageIndex, 1)[0];
    nextPages.splice(activePageIndex - 1, 0, item);
    setPages(nextPages);
    setActivePageIndex(activePageIndex - 1);
  };

  const handleMoveRight = () => {
    if (activePageIndex === pages.length - 1) return;
    const nextPages = [...pages];
    const item = nextPages.splice(activePageIndex, 1)[0];
    nextPages.splice(activePageIndex + 1, 0, item);
    setPages(nextPages);
    setActivePageIndex(activePageIndex + 1);
  };

  // --- Annotation Operations ---
  const handleAddTextMark = (xRatio: number, yRatio: number) => {
    if (!activePage || !newText.trim()) return;
    const mark: TextMark = {
      id: `text_${Date.now()}`,
      type: 'text',
      text: newText,
      x: xRatio,
      y: yRatio,
      fontSize: textSize,
      color: textColor,
      backgroundColor: textBg,
      bold: textBold,
    };
    setPages((prev) =>
      prev.map((p, idx) =>
        idx === activePageIndex ? { ...p, marks: [...p.marks, mark] } : p
      )
    );
  };

  const handleAddFillMark = (xRatio: number, yRatio: number) => {
    if (!activePage) return;
    const mark: FillMark = {
      id: `fill_${Date.now()}`,
      type: 'fill',
      x: Math.max(0, xRatio - 0.15),
      y: Math.max(0, yRatio - 0.05),
      width: 0.3,
      height: 0.08,
      color: fillColor,
      opacity: fillOpacity,
      isRedaction,
    };
    setPages((prev) =>
      prev.map((p, idx) =>
        idx === activePageIndex ? { ...p, marks: [...p.marks, mark] } : p
      )
    );
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (editorMode !== 'text' && editorMode !== 'redact') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    if (editorMode === 'text') {
      handleAddTextMark(x, y);
    } else if (editorMode === 'redact') {
      handleAddFillMark(x, y);
    }
  };

  // Drawing Handlers
  const handleDrawingStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (editorMode !== 'draw') return;
    setIsDrawing(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const pt = {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
    setCurrentStroke([pt]);
  };

  const handleDrawingMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!isDrawing || editorMode !== 'draw') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const pt = {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
    setCurrentStroke((prev) => [...prev, pt]);
  };

  const handleDrawingEnd = () => {
    if (!isDrawing || editorMode !== 'draw') return;
    setIsDrawing(false);
    if (currentStroke.length > 1 && activePage) {
      const mark: InkMark = {
        id: `ink_${Date.now()}`,
        type: 'ink',
        color: inkColor,
        strokeWidth,
        strokes: [currentStroke],
      };
      setPages((prev) =>
        prev.map((p, idx) =>
          idx === activePageIndex ? { ...p, marks: [...p.marks, mark] } : p
        )
      );
    }
    setCurrentStroke([]);
  };

  const handleUndoMark = () => {
    if (!activePage || activePage.marks.length === 0) return;
    setPages((prev) =>
      prev.map((p, idx) =>
        idx === activePageIndex
          ? { ...p, marks: p.marks.slice(0, -1) }
          : p
      )
    );
  };

  const handleApplyCrop = (top: number, bottom: number, left: number, right: number) => {
    setPages((prev) =>
      prev.map((p, idx) =>
        idx === activePageIndex
          ? { ...p, crop: { top, bottom, left, right } }
          : p
      )
    );
  };

  // --- Save / Apply Edit Plan ---
  const handleSaveAndApply = async () => {
    setBusyMessage('Generating edited PDF document...');
    setProgress(0);
    try {
      const plan: EditPlan = {
        pages,
        pageNumbers: enableNumbers
          ? {
              enabled: true,
              position: numberPosition,
              format: numberFormat,
              startFrom: numberStart,
              fontSize: 10,
              margin: 24,
            }
          : undefined,
        watermark: enableWatermark
          ? {
              enabled: true,
              text: watermarkText,
              opacity: watermarkOpacity,
              layout: watermarkLayout,
              fontSize: 42,
              color: watermarkColor,
            }
          : undefined,
      };

      const editedBytes = await PdfEngine.applyPlan(data, plan, (p) => setProgress(p));
      const stem = DocumentStore.stem(filename);
      const newFilename = `${stem}-edited.pdf`;

      DocumentStore.downloadFile(editedBytes, newFilename);
      onSaved(editedBytes, newFilename);
    } catch (err: any) {
      alert(`Could not save changes: ${err?.message || 'Unknown error'}`);
    } finally {
      setBusyMessage(null);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-neutral-100 text-neutral-900 select-none overflow-hidden">
      <TopBar
        title="Page Editor & Annotation"
        subtitle={`${pages.length} pages • Editing page ${activePageIndex + 1}`}
        onBack={onBack}
        actions={
          <button
            onClick={handleSaveAndApply}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Apply & Save</span>
          </button>
        }
      />

      {/* Mode Selector Tabs */}
      <div className="flex w-full items-center justify-between border-b border-neutral-200 bg-white px-3 py-2 overflow-x-auto">
        <div className="flex items-center gap-1">
          <TabButton
            active={editorMode === 'pages'}
            onClick={() => setEditorMode('pages')}
            icon={Sliders}
            label="Pages"
          />
          <TabButton
            active={editorMode === 'crop'}
            onClick={() => setEditorMode('crop')}
            icon={Crop}
            label="Crop"
          />
          <TabButton
            active={editorMode === 'text'}
            onClick={() => setEditorMode('text')}
            icon={Type}
            label="Add Text"
          />
          <TabButton
            active={editorMode === 'redact'}
            onClick={() => setEditorMode('redact')}
            icon={Square}
            label="Redact / Box"
          />
          <TabButton
            active={editorMode === 'draw'}
            onClick={() => setEditorMode('draw')}
            icon={PenTool}
            label="Draw"
          />
          <TabButton
            active={editorMode === 'numbers'}
            onClick={() => setEditorMode('numbers')}
            icon={Hash}
            label="Numbers"
          />
          <TabButton
            active={editorMode === 'watermark'}
            onClick={() => setEditorMode('watermark')}
            icon={Stamp}
            label="Watermark"
          />
        </div>

        {activePage && activePage.marks.length > 0 && (
          <button
            onClick={handleUndoMark}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
            title="Undo last mark on this page"
          >
            <Undo className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Undo Mark</span>
          </button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Thumbnail Sidebar */}
        <div className="w-48 sm:w-56 shrink-0 border-r border-neutral-200 bg-white p-3 overflow-y-auto hidden md:block">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">
            Thumbnails
          </h3>
          <div className="space-y-2.5">
            {pages.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => setActivePageIndex(idx)}
                className={`w-full flex items-center gap-2 rounded-xl p-2 text-left border transition-all ${
                  idx === activePageIndex
                    ? 'border-blue-600 bg-blue-50/50 shadow-2xs'
                    : 'border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 font-bold text-xs text-neutral-700">
                  {idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-neutral-800 truncate">Page {idx + 1}</p>
                  <p className="text-[10px] text-neutral-400">
                    {p.rotation !== 0 ? `${p.rotation}° • ` : ''}
                    {p.marks.length > 0 ? `${p.marks.length} marks` : 'Original'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Center Workspace Canvas */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-auto bg-neutral-200/80 relative">
          {activePage ? (
            <div
              onClick={handleOverlayClick}
              onMouseDown={handleDrawingStart}
              onMouseMove={handleDrawingMove}
              onMouseUp={handleDrawingEnd}
              onTouchStart={handleDrawingStart}
              onTouchMove={handleDrawingMove}
              onTouchEnd={handleDrawingEnd}
              className={`relative bg-white shadow-xl rounded-sm transition-all overflow-hidden ${
                editorMode === 'text' || editorMode === 'redact' || editorMode === 'draw'
                  ? 'cursor-crosshair'
                  : ''
              }`}
              style={{
                width: 'min(580px, 90vw)',
                aspectRatio: `${activePage.aspectRatio > 0 ? activePage.aspectRatio : 0.707}`,
                transform: `rotate(${activePage.rotation}deg)`,
                transition: 'transform 0.2s ease',
              }}
            >
              {/* Underlying Rendered PDF Page */}
              <canvas ref={mainCanvasRef} className="w-full h-full object-contain pointer-events-none block" />

              {/* Crop Box Overlay */}
              {activePage.crop && (
                <div
                  className="absolute border-2 border-dashed border-red-500 bg-red-500/10 pointer-events-none"
                  style={{
                    top: `${activePage.crop.top * 100}%`,
                    bottom: `${activePage.crop.bottom * 100}%`,
                    left: `${activePage.crop.left * 100}%`,
                    right: `${activePage.crop.right * 100}%`,
                  }}
                />
              )}

              {/* Render User Marks */}
              {activePage.marks.map((mark) => {
                if (mark.type === 'text') {
                  const m = mark as TextMark;
                  return (
                    <div
                      key={m.id}
                      className="absolute rounded px-1 text-xs font-semibold shadow-xs select-none"
                      style={{
                        left: `${m.x * 100}%`,
                        top: `${m.y * 100}%`,
                        color: m.color,
                        backgroundColor: m.backgroundColor || 'transparent',
                        fontSize: `${m.fontSize || 14}px`,
                      }}
                    >
                      {m.text}
                    </div>
                  );
                } else if (mark.type === 'fill') {
                  const m = mark as FillMark;
                  return (
                    <div
                      key={m.id}
                      className="absolute pointer-events-none"
                      style={{
                        left: `${m.x * 100}%`,
                        top: `${m.y * 100}%`,
                        width: `${m.width * 100}%`,
                        height: `${m.height * 100}%`,
                        backgroundColor: m.color,
                        opacity: m.isRedaction ? 1 : m.opacity || 0.6,
                      }}
                    />
                  );
                } else if (mark.type === 'ink') {
                  const m = mark as InkMark;
                  return (
                    <svg
                      key={m.id}
                      className="absolute inset-0 w-full h-full pointer-events-none"
                    >
                      {m.strokes.map((stroke, sIdx) => {
                        const pathData = stroke
                          .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x * 100}% ${p.y * 100}%`)
                          .join(' ');
                        return (
                          <path
                            key={sIdx}
                            d={pathData}
                            fill="none"
                            stroke={m.color}
                            strokeWidth={m.strokeWidth}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        );
                      })}
                    </svg>
                  );
                }
                return null;
              })}

              {/* Active Drawing SVG Stroke */}
              {currentStroke.length > 1 && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <path
                    d={currentStroke
                      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x * 100}% ${p.y * 100}%`)
                      .join(' ')}
                    fill="none"
                    stroke={inkColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}

              {/* Live Preview Watermark */}
              {enableWatermark && watermarkText && (
                <div
                  className={`absolute inset-0 flex items-center justify-center pointer-events-none select-none font-bold`}
                  style={{
                    color: watermarkColor,
                    opacity: watermarkOpacity,
                    transform:
                      watermarkLayout === WatermarkLayout.DIAGONAL
                        ? 'rotate(-45deg)'
                        : watermarkLayout === WatermarkLayout.HEADER
                        ? 'translateY(-40%)'
                        : watermarkLayout === WatermarkLayout.FOOTER
                        ? 'translateY(40%)'
                        : 'none',
                    fontSize: 'clamp(18px, 4vw, 42px)',
                  }}
                >
                  {watermarkText}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">No page selected</p>
          )}

          {/* Quick Page Navigator on Canvas */}
          <div className="absolute bottom-4 flex items-center gap-2 bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-xl shadow-md border border-neutral-200">
            <button
              onClick={() => setActivePageIndex((idx) => Math.max(0, idx - 1))}
              disabled={activePageIndex === 0}
              className="p-1 rounded-lg hover:bg-neutral-100 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-semibold text-neutral-700">
              {activePageIndex + 1} / {pages.length}
            </span>
            <button
              onClick={() => setActivePageIndex((idx) => Math.min(pages.length - 1, idx + 1))}
              disabled={activePageIndex === pages.length - 1}
              className="p-1 rounded-lg hover:bg-neutral-100 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Right Side Mode Configuration Panel */}
        <div className="w-80 shrink-0 border-l border-neutral-200 bg-white p-4 overflow-y-auto">
          {editorMode === 'pages' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Page Actions
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <ActionButton
                  onClick={handleRotate}
                  icon={RotateCw}
                  label="Rotate 90°"
                />
                <ActionButton
                  onClick={handleDuplicate}
                  icon={Copy}
                  label="Duplicate"
                />
                <ActionButton
                  onClick={handleMoveLeft}
                  disabled={activePageIndex === 0}
                  icon={ChevronLeft}
                  label="Move Left"
                />
                <ActionButton
                  onClick={handleMoveRight}
                  disabled={activePageIndex === pages.length - 1}
                  icon={ChevronRight}
                  label="Move Right"
                />
              </div>
              <button
                onClick={handleDelete}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete This Page
              </button>
            </div>
          )}

          {editorMode === 'crop' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Crop Margins
              </h3>
              <p className="text-xs text-neutral-500">Trim unwanted borders from this page.</p>

              <div>
                <label className="text-xs font-medium text-neutral-700">Top Crop ({Math.round(cropTop * 100)}%)</label>
                <input
                  type="range"
                  min="0"
                  max="0.4"
                  step="0.01"
                  value={cropTop}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setCropTop(val);
                    handleApplyCrop(val, cropBottom, cropLeft, cropRight);
                  }}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-700">Bottom Crop ({Math.round(cropBottom * 100)}%)</label>
                <input
                  type="range"
                  min="0"
                  max="0.4"
                  step="0.01"
                  value={cropBottom}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setCropBottom(val);
                    handleApplyCrop(cropTop, val, cropLeft, cropRight);
                  }}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-700">Left Crop ({Math.round(cropLeft * 100)}%)</label>
                <input
                  type="range"
                  min="0"
                  max="0.4"
                  step="0.01"
                  value={cropLeft}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setCropLeft(val);
                    handleApplyCrop(cropTop, cropBottom, val, cropRight);
                  }}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-700">Right Crop ({Math.round(cropRight * 100)}%)</label>
                <input
                  type="range"
                  min="0"
                  max="0.4"
                  step="0.01"
                  value={cropRight}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setCropRight(val);
                    handleApplyCrop(cropTop, cropBottom, cropLeft, val);
                  }}
                  className="w-full"
                />
              </div>

              <button
                onClick={() => {
                  setCropTop(0);
                  setCropBottom(0);
                  setCropLeft(0);
                  setCropRight(0);
                  handleApplyCrop(0, 0, 0, 0);
                }}
                className="w-full rounded-xl border border-neutral-200 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
              >
                Reset Crop
              </button>
            </div>
          )}

          {editorMode === 'text' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Text Note Tool
              </h3>
              <p className="text-xs text-neutral-500">Type your text below, then tap anywhere on the page to stamp it.</p>

              <div>
                <label className="text-xs font-medium text-neutral-700">Note Content</label>
                <input
                  type="text"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs text-neutral-900"
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs font-medium text-neutral-700">Text Color</label>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="mt-1 h-8 w-full rounded cursor-pointer"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-neutral-700">Background</label>
                  <input
                    type="color"
                    value={textBg}
                    onChange={(e) => setTextBg(e.target.value)}
                    className="mt-1 h-8 w-full rounded cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-700">Font Size ({textSize}pt)</label>
                <input
                  type="range"
                  min="8"
                  max="36"
                  value={textSize}
                  onChange={(e) => setTextSize(parseInt(e.target.value, 10))}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {editorMode === 'redact' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Redact & Highlight
              </h3>
              <p className="text-xs text-neutral-500">Tap anywhere on the page to place a redaction or highlight block.</p>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isRedact"
                  checked={isRedaction}
                  onChange={(e) => setIsRedaction(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <label htmlFor="isRedact" className="text-xs font-medium text-neutral-800">
                  Permanent Opaque Redaction
                </label>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-700">Box Color</label>
                <input
                  type="color"
                  value={fillColor}
                  onChange={(e) => setFillColor(e.target.value)}
                  className="mt-1 h-8 w-full rounded cursor-pointer"
                />
              </div>

              {!isRedaction && (
                <div>
                  <label className="text-xs font-medium text-neutral-700">Opacity ({Math.round(fillOpacity * 100)}%)</label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={fillOpacity}
                    onChange={(e) => setFillOpacity(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          )}

          {editorMode === 'draw' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Freehand Drawing Pen
              </h3>
              <p className="text-xs text-neutral-500">Draw directly with your mouse or stylus on the page canvas.</p>

              <div>
                <label className="text-xs font-medium text-neutral-700">Ink Color</label>
                <input
                  type="color"
                  value={inkColor}
                  onChange={(e) => setInkColor(e.target.value)}
                  className="mt-1 h-8 w-full rounded cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-700">Stroke Thickness ({strokeWidth}px)</label>
                <input
                  type="range"
                  min="1"
                  max="12"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(parseInt(e.target.value, 10))}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {editorMode === 'numbers' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Page Numbering
              </h3>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enableNum"
                  checked={enableNumbers}
                  onChange={(e) => setEnableNumbers(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <label htmlFor="enableNum" className="text-xs font-medium text-neutral-800">
                  Add Page Numbers to PDF
                </label>
              </div>

              {enableNumbers && (
                <>
                  <div>
                    <label className="text-xs font-medium text-neutral-700">Position</label>
                    <select
                      value={numberPosition}
                      onChange={(e) => setNumberPosition(e.target.value as NumberPosition)}
                      className="mt-1 w-full rounded-xl border border-neutral-300 p-2 text-xs"
                    >
                      <option value={NumberPosition.BOTTOM_CENTER}>Bottom Center</option>
                      <option value={NumberPosition.BOTTOM_RIGHT}>Bottom Right</option>
                      <option value={NumberPosition.BOTTOM_LEFT}>Bottom Left</option>
                      <option value={NumberPosition.TOP_CENTER}>Top Center</option>
                      <option value={NumberPosition.TOP_RIGHT}>Top Right</option>
                      <option value={NumberPosition.TOP_LEFT}>Top Left</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-neutral-700">Format</label>
                    <select
                      value={numberFormat}
                      onChange={(e) => setNumberFormat(e.target.value as NumberFormat)}
                      className="mt-1 w-full rounded-xl border border-neutral-300 p-2 text-xs"
                    >
                      <option value={NumberFormat.PAGE_ONLY}>"1"</option>
                      <option value={NumberFormat.OF_TOTAL}>"1 / 10"</option>
                      <option value={NumberFormat.PAGE_PREFIX}>"Page 1"</option>
                      <option value={NumberFormat.PAGE_OF_TOTAL}>"Page 1 of 10"</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-neutral-700">Start Count From</label>
                    <input
                      type="number"
                      min="1"
                      value={numberStart}
                      onChange={(e) => setNumberStart(parseInt(e.target.value, 10) || 1)}
                      className="mt-1 w-full rounded-xl border border-neutral-300 p-2 text-xs"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {editorMode === 'watermark' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Watermark Overlay
              </h3>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enableWm"
                  checked={enableWatermark}
                  onChange={(e) => setEnableWatermark(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <label htmlFor="enableWm" className="text-xs font-medium text-neutral-800">
                  Enable Watermark
                </label>
              </div>

              {enableWatermark && (
                <>
                  <div>
                    <label className="text-xs font-medium text-neutral-700">Watermark Text</label>
                    <input
                      type="text"
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-neutral-300 p-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-neutral-700">Layout</label>
                    <select
                      value={watermarkLayout}
                      onChange={(e) => setWatermarkLayout(e.target.value as WatermarkLayout)}
                      className="mt-1 w-full rounded-xl border border-neutral-300 p-2 text-xs"
                    >
                      <option value={WatermarkLayout.DIAGONAL}>Diagonal (Center)</option>
                      <option value={WatermarkLayout.CENTER}>Center (Horizontal)</option>
                      <option value={WatermarkLayout.HEADER}>Header</option>
                      <option value={WatermarkLayout.FOOTER}>Footer</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-neutral-700">Opacity ({Math.round(watermarkOpacity * 100)}%)</label>
                    <input
                      type="range"
                      min="0.05"
                      max="0.8"
                      step="0.05"
                      value={watermarkOpacity}
                      onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-neutral-700">Color</label>
                    <input
                      type="color"
                      value={watermarkColor}
                      onChange={(e) => setWatermarkColor(e.target.value)}
                      className="mt-1 h-8 w-full rounded cursor-pointer"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {busyMessage && <BusyOverlay message={busyMessage} progress={progress} />}
    </div>
  );
};

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}> = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
      active
        ? 'bg-blue-600 text-white shadow-2xs'
        : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
    }`}
  >
    <Icon className="h-3.5 w-3.5" />
    <span>{label}</span>
  </button>
);

const ActionButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}> = ({ onClick, disabled, icon: Icon, label }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 transition-colors"
  >
    <Icon className="h-3.5 w-3.5" />
    <span>{label}</span>
  </button>
);
