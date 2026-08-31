import React, { useState, useRef, useEffect } from 'react';
import {
  PenTool,
  RotateCcw,
  Check,
  ChevronLeft,
  ChevronRight,
  FileUp,
  Download,
  Move,
  Maximize2,
  Trash2,
} from 'lucide-react';
import { TopBar } from './TopBar';
import { PdfEngine } from '../services/pdfEngine';
import { DocumentStore } from '../services/documentStore';
import { BusyOverlay } from './BusyOverlay';
import { ResultCard } from './ResultCard';
import { ToolResultData } from '../types';

interface SignScreenProps {
  initialData?: Uint8Array | null;
  initialFilename?: string;
  onBack: () => void;
}

export const SignScreen: React.FC<SignScreenProps> = ({
  initialData,
  initialFilename,
  onBack,
}) => {
  const [docData, setDocData] = useState<Uint8Array | null>(initialData || null);
  const [docName, setDocName] = useState<string>(initialFilename || '');
  const [pageCount, setPageCount] = useState<number>(1);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
  const [aspectRatio, setAspectRatio] = useState<number>(0.707);

  // Signature Pad State
  const [penColor, setPenColor] = useState<'#000000' | '#003049'>('#000000');
  const [strokes, setStrokes] = useState<Array<Array<{ x: number; y: number }>>>([]);
  const [currentStroke, setCurrentStroke] = useState<Array<{ x: number; y: number }>>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signaturePng, setSignaturePng] = useState<Uint8Array | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  // Placement State
  const [step, setStep] = useState<'draw' | 'place' | 'result'>('draw');
  const [stampX, setStampX] = useState<number>(0.5); // 0..1 ratio
  const [stampY, setStampY] = useState<number>(0.8); // 0..1 ratio
  const [stampWidthRatio, setStampWidthRatio] = useState<number>(0.3); // 30% of page width

  const [busyMessage, setBusyMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ToolResultData | null>(null);

  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const pageCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load document meta if provided
  useEffect(() => {
    if (!docData) return;
    const loadMeta = async () => {
      try {
        const meta = await PdfEngine.readMeta(docData);
        setPageCount(meta.pageCount || 1);
        if (meta.pageSizes[0]) {
          setAspectRatio(meta.pageSizes[0].aspectRatio);
        }
      } catch (e) {
        console.warn('Meta read error in sign:', e);
      }
    };
    loadMeta();
  }, [docData]);

  // Render PDF page when placing signature
  useEffect(() => {
    if (step !== 'place' || !docData || !pageCanvasRef.current) return;
    const renderPage = async () => {
      try {
        await PdfEngine.renderPageToCanvas(
          docData,
          selectedPageIndex,
          pageCanvasRef.current!,
          1000
        );
      } catch (e) {
        console.warn('Page render error in sign:', e);
      }
    };
    renderPage();
  }, [step, docData, selectedPageIndex]);

  // Handle Signature Drawing
  const handleSignStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    setCurrentStroke([{ x, y }]);
  };

  const handleSignMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    setCurrentStroke((prev) => [...prev, { x, y }]);
  };

  const handleSignEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke.length > 1) {
      setStrokes((prev) => [...prev, currentStroke]);
    }
    setCurrentStroke([]);
  };

  // Re-draw signature pad
  useEffect(() => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = penColor;

    const all = [...strokes, ...(currentStroke.length > 0 ? [currentStroke] : [])];
    for (const stroke of all) {
      if (stroke.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    }
  }, [strokes, currentStroke, penColor]);

  const handleClearSignature = () => {
    setStrokes([]);
    setCurrentStroke([]);
    setSignaturePng(null);
    setSignatureDataUrl(null);
  };

  const handleUndoSignature = () => {
    setStrokes((prev) => prev.slice(0, -1));
  };

  // Convert Drawn Signature to PNG Uint8Array
  const handleProceedToPlacement = async () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas || strokes.length === 0) {
      alert('Please draw your signature first.');
      return;
    }

    if (!docData) {
      fileInputRef.current?.click();
      return;
    }

    // Crop signature canvas to bounding box with transparent background
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = canvas.width;
    croppedCanvas.height = canvas.height;
    const ctx = croppedCanvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = penColor;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const stroke of strokes) {
        if (stroke.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(stroke[0].x, stroke[0].y);
        for (let i = 1; i < stroke.length; i++) {
          ctx.lineTo(stroke[i].x, stroke[i].y);
        }
        ctx.stroke();
      }
    }

    const dataUrl = croppedCanvas.toDataURL('image/png');
    setSignatureDataUrl(dataUrl);

    const blob = await new Promise<Blob | null>((resolve) =>
      croppedCanvas.toBlob((b) => resolve(b), 'image/png')
    );
    if (blob) {
      const buffer = await blob.arrayBuffer();
      setSignaturePng(new Uint8Array(buffer));
      setStep('place');
    }
  };

  // Stamp and produce final signed PDF
  const handleApplySignature = async () => {
    if (!docData || !signaturePng) return;
    setBusyMessage('Applying signature to document...');
    try {
      const signedData = await PdfEngine.stampImage(
        docData,
        signaturePng,
        selectedPageIndex,
        stampX,
        stampY,
        stampWidthRatio
      );

      const stem = DocumentStore.stem(docName || 'document');
      const filename = `${stem}-signed.pdf`;
      const blobUrl = URL.createObjectURL(new Blob([signedData as any], { type: 'application/pdf' }));

      const res: ToolResultData = {
        summary: `Document signed successfully on page ${selectedPageIndex + 1}.`,
        files: [
          {
            name: filename,
            data: signedData,
            sizeBytes: signedData.byteLength,
            mimeType: 'application/pdf',
            blobUrl,
          },
        ],
      };

      setResult(res);
      setStep('result');
    } catch (err: any) {
      alert(`Signature failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setBusyMessage(null);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-neutral-50 text-neutral-900 overflow-hidden select-none">
      <TopBar
        title="Sign Document"
        subtitle={
          step === 'draw'
            ? 'Step 1: Draw your signature'
            : step === 'place'
            ? `Step 2: Position on page ${selectedPageIndex + 1} of ${pageCount}`
            : 'Signature Complete'
        }
        onBack={onBack}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            const buf = await file.arrayBuffer();
            setDocData(new Uint8Array(buf));
            setDocName(file.name);
            setStep('place');
          }
        }}
        className="hidden"
      />

      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center">
        {step === 'draw' && (
          <div className="w-full max-w-md rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <PenTool className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-neutral-900">Draw Signature</h3>
              </div>

              {/* Pen Color Selector */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPenColor('#000000')}
                  className={`h-6 w-6 rounded-full bg-black border-2 transition-all ${
                    penColor === '#000000' ? 'border-blue-500 scale-110' : 'border-transparent'
                  }`}
                  title="Black Pen"
                />
                <button
                  type="button"
                  onClick={() => setPenColor('#003049')}
                  className={`h-6 w-6 rounded-full bg-[#003049] border-2 transition-all ${
                    penColor === '#003049' ? 'border-blue-500 scale-110' : 'border-transparent'
                  }`}
                  title="Dark Blue Pen"
                />
              </div>
            </div>

            {/* Signature Canvas Pad */}
            <div className="relative rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50/70 overflow-hidden cursor-crosshair">
              <canvas
                ref={signatureCanvasRef}
                width={400}
                height={200}
                onMouseDown={handleSignStart}
                onMouseMove={handleSignMove}
                onMouseUp={handleSignEnd}
                onTouchStart={handleSignStart}
                onTouchMove={handleSignMove}
                onTouchEnd={handleSignEnd}
                className="w-full h-48 block"
              />
              <div className="absolute bottom-6 left-6 right-6 border-b border-neutral-300 pointer-events-none" />
              <span className="absolute bottom-2 left-6 text-[10px] text-neutral-400 pointer-events-none">
                Sign on the line above
              </span>
            </div>

            {/* Actions */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleUndoSignature}
                  disabled={strokes.length === 0}
                  className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Undo
                </button>
                <button
                  type="button"
                  onClick={handleClearSignature}
                  disabled={strokes.length === 0}
                  className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear
                </button>
              </div>

              <button
                type="button"
                onClick={handleProceedToPlacement}
                disabled={strokes.length === 0}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <span>Continue</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 'place' && docData && (
          <div className="w-full max-w-4xl flex flex-col md:flex-row items-center gap-6">
            {/* Main Placement Page Canvas */}
            <div className="flex-1 flex flex-col items-center">
              <div
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setStampX((e.clientX - rect.left) / rect.width);
                  setStampY((e.clientY - rect.top) / rect.height);
                }}
                className="relative bg-white shadow-xl rounded-sm overflow-hidden cursor-pointer"
                style={{
                  width: 'min(480px, 90vw)',
                  aspectRatio: `${aspectRatio > 0 ? aspectRatio : 0.707}`,
                }}
              >
                <canvas ref={pageCanvasRef} className="w-full h-full object-contain block pointer-events-none" />

                {/* Stamp Signature Overlay Box */}
                {signatureDataUrl && (
                  <div
                    className="absolute border-2 border-blue-500 bg-blue-500/10 rounded-sm flex items-center justify-center pointer-events-none transition-all shadow-md"
                    style={{
                      left: `${stampX * 100}%`,
                      top: `${stampY * 100}%`,
                      width: `${stampWidthRatio * 100}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <img
                      src={signatureDataUrl}
                      alt="Signature"
                      className="w-full h-auto object-contain pointer-events-none"
                    />
                  </div>
                )}
              </div>

              {/* Page Navigator */}
              {pageCount > 1 && (
                <div className="mt-3 flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl shadow-xs border border-neutral-200">
                  <button
                    onClick={() => setSelectedPageIndex((idx) => Math.max(0, idx - 1))}
                    disabled={selectedPageIndex === 0}
                    className="p-1 rounded-lg hover:bg-neutral-100 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-semibold text-neutral-700">
                    Page {selectedPageIndex + 1} of {pageCount}
                  </span>
                  <button
                    onClick={() => setSelectedPageIndex((idx) => Math.min(pageCount - 1, idx + 1))}
                    disabled={selectedPageIndex === pageCount - 1}
                    className="p-1 rounded-lg hover:bg-neutral-100 disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Placement Controls Sidebar */}
            <div className="w-full md:w-72 rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Signature Placement
              </h3>
              <p className="text-xs text-neutral-500">
                Tap anywhere on the page to reposition the signature stamp.
              </p>

              <div>
                <label className="text-xs font-medium text-neutral-700">
                  Signature Size ({Math.round(stampWidthRatio * 100)}%)
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="0.6"
                  step="0.02"
                  value={stampWidthRatio}
                  onChange={(e) => setStampWidthRatio(parseFloat(e.target.value))}
                  className="mt-1 w-full"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('draw')}
                  className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Redraw
                </button>
                <button
                  type="button"
                  onClick={handleApplySignature}
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
                >
                  Sign & Save
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'result' && result && (
          <div className="w-full max-w-lg">
            <ResultCard
              result={result}
              onStartOver={() => {
                setStep('draw');
                handleClearSignature();
                setResult(null);
              }}
            />
          </div>
        )}
      </div>

      {busyMessage && <BusyOverlay message={busyMessage} />}
    </div>
  );
};
