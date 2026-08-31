import React, { useState, useRef } from 'react';
import {
  Combine,
  Split,
  Copy,
  Image as ImageIcon,
  FileImage,
  FileText,
  Minimize2,
  Lock,
  Unlock,
  PenTool,
  ArrowRight,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Info,
  ChevronRight,
} from 'lucide-react';
import { TopBar } from './TopBar';
import {
  ToolId,
  ToolInput,
  ToolSpec,
  ToolOptionsState,
  SplitMode,
  CompressMode,
  CompressStrength,
  ImageFormat,
  PdfPageSizePreset,
  ToolResultData,
  GeneratedFile,
} from '../types';
import { TOOL_CATALOG, ToolRunner } from '../services/toolCatalog';
import { BusyOverlay } from './BusyOverlay';
import { ResultCard } from './ResultCard';

const INITIAL_OPTIONS: ToolOptionsState = {
  splitMode: SplitMode.RANGES,
  pageRange: '1-3',
  splitEvery: 1,
  compressMode: CompressMode.RESAMPLE,
  compressStrength: CompressStrength.MEDIUM,
  exportFormat: ImageFormat.PNG,
  exportDpi: 150,
  exportQuality: 85,
  imagesPageSize: PdfPageSizePreset.FIT_IMAGE,
  imagesMargin: 0,
  protectPassword: '',
  protectConfirm: '',
  allowPrinting: true,
  allowCopying: true,
  allowModifying: false,
  unlockPassword: '',
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Combine,
  Split,
  Copy,
  Image: ImageIcon,
  FileImage,
  FileText,
  Minimize2,
  Lock,
  Unlock,
  PenTool,
};

interface ToolsScreenProps {
  initialToolId?: ToolId | null;
  onOpenViewer?: (file: GeneratedFile) => void;
  onNavigateToSign?: () => void;
}

export const ToolsScreen: React.FC<ToolsScreenProps> = ({
  initialToolId,
  onOpenViewer,
  onNavigateToSign,
}) => {
  const [selectedToolId, setSelectedToolId] = useState<ToolId | null>(initialToolId || null);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'organize' | 'convert' | 'security'>('all');

  // Input files state
  const [pdfDocs, setPdfDocs] = useState<Array<{ name: string; data: Uint8Array; password?: string }>>([]);
  const [imageFiles, setImageFiles] = useState<Array<{ file: File; data: Uint8Array; mimeType: string; previewUrl: string }>>([]);

  const [options, setOptions] = useState<ToolOptionsState>(INITIAL_OPTIONS);
  const [busyMessage, setBusyMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [result, setResult] = useState<ToolResultData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pdfInputRef迷 = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const activeTool = selectedToolId ? TOOL_CATALOG.find((t) => t.id === selectedToolId) : null;

  const handleToolSelect = (id: ToolId) => {
    if (id === ToolId.SIGN && onNavigateToSign) {
      onNavigateToSign();
      return;
    }
    setSelectedToolId(id);
    setPdfDocs([]);
    setImageFiles([]);
    setResult(null);
    setError(null);
    setOptions(INITIAL_OPTIONS);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newDocs: Array<{ name: string; data: Uint8Array }> = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const buf = await file.arrayBuffer();
      newDocs.push({
        name: file.name,
        data: new Uint8Array(buf),
      });
    }

    if (activeTool?.input === ToolInput.SINGLE_PDF) {
      setPdfDocs([newDocs[0]]);
    } else {
      setPdfDocs((prev) => [...prev, ...newDocs]);
    }
    e.target.value = '';
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files地理 = e.target.files;
    if (!files地理 || files地理.length === 0) return;

    const newImgs: Array<{ file: File; data: Uint8Array; mimeType: string; previewUrl: string }> = [];
    for (let i = 0; i < files地理.length; i++) {
      const file = files地理[i];
      const buf = await file.arrayBuffer();
      const previewUrl = URL.createObjectURL(file);
      newImgs.push({
        file,
        data: new Uint8Array(buf),
        mimeType: file.type || 'image/png',
        previewUrl,
      });
    }

    setImageFiles((prev) => [...prev, ...newImgs]);
    e.target.value = '';
  };

  const handleExecuteTool = async () => {
    if (!selectedToolId) return;
    setBusyMessage('Processing files...');
    setProgress(0);
    setError(null);

    try {
      const res = await ToolRunner.run(
        selectedToolId,
        pdfDocs,
        imageFiles,
        options,
        (p) => setProgress(p)
      );
      setResult(res);
    } catch (err: any) {
      setError(err?.message || 'Tool execution failed.');
    } finally {
      setBusyMessage(null);
    }
  };

  const filteredTools = TOOL_CATALOG.filter((t) => {
    if (categoryFilter === 'all') return true;
    return t.category === categoryFilter;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-neutral-50/50 pb-20">
      <TopBar
        title={activeTool ? activeTool.title : 'PDF Tools Catalog'}
        subtitle={activeTool ? activeTool.summary : 'Select a tool to process documents'}
        onBack={activeTool ? () => setSelectedToolId(null) : undefined}
      />

      {/* Hidden File Inputs */}
      <input
        ref={pdfInputRef迷}
        type="file"
        accept="application/pdf"
        multiple={activeTool?.input === ToolInput.MULTIPLE_PDF}
        onChange={handlePdfUpload}
        className="hidden"
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        onChange={handleImageUpload}
        className="hidden"
      />

      {!activeTool ? (
        <div className="p-4 max-w-4xl mx-auto space-y-4">
          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'All Tools' },
              { id: 'organize', label: 'Organize' },
              { id: 'convert', label: 'Convert' },
              { id: 'security', label: 'Security & Optimize' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCategoryFilter(tab.id as any)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                  categoryFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white border border-neutral-200/80 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tools Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTools.map((tool) => {
              const Icon = ICON_MAP[tool.iconName] || FileText;
              return (
                <button
                  key={tool.id}
                  onClick={() => handleToolSelect(tool.id)}
                  className="flex flex-col items-start rounded-2xl border border-neutral-200/80 bg-white p-4 text-left shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all group"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform mb-3">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-neutral-900 group-hover:text-blue-600 transition-colors">
                    {tool.title}
                  </h4>
                  <p className="mt-1 text-xs text-neutral-500 line-clamp-2">{tool.summary}</p>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Active Tool Configuration & Execution View */
        <div className="p-4 max-w-2xl mx-auto space-y-5">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          {result ? (
            <ResultCard
              result={result}
              onStartOver={() => {
                setResult(null);
                setPdfDocs([]);
                setImageFiles([]);
              }}
              onOpenInViewer={onOpenViewer}
            />
          ) : (
            <>
              {/* File Input Selection Area */}
              <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Input Files
                  </h3>
                  {(pdfDocs.length > 0 || imageFiles.length > 0) && (
                    <button
                      onClick={() =>
                        activeTool.input === ToolInput.IMAGES
                          ? imageInputRef.current?.click()
                          : pdfInputRef迷.current?.click()
                      }
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add More
                    </button>
                  )}
                </div>

                {activeTool.input === ToolInput.IMAGES ? (
                  imageFiles.length === 0 ? (
                    <div
                      onClick={() => imageInputRef.current?.click()}
                      className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/20"
                    >
                      <FileImage className="h-8 w-8 text-neutral-400 mb-2" />
                      <p className="text-xs font-semibold text-neutral-800">Select Image Files</p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">PNG, JPEG, WebP supported</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {imageFiles.map((img, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-xl border border-neutral-200 p-2.5"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={img.previewUrl}
                              alt=""
                              className="h-9 w-9 rounded-lg object-cover border border-neutral-200"
                            />
                            <p className="text-xs font-medium text-neutral-800 truncate">
                              {img.file.name}
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              setImageFiles((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="text-neutral-400 hover:text-red-600 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                ) : pdfDocs.length === 0 ? (
                  <div
                    onClick={() => pdfInputRef迷.current?.click()}
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/20"
                  >
                    <FileText className="h-8 w-8 text-neutral-400 mb-2" />
                    <p className="text-xs font-semibold text-neutral-800">
                      {activeTool.input === ToolInput.MULTIPLE_PDF
                        ? 'Select PDF Documents to Merge'
                        : 'Select PDF Document'}
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      100% processed locally on device
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pdfDocs.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-xl border border-neutral-200 p-2.5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold text-[10px]">
                            {idx + 1}
                          </div>
                          <p className="text-xs font-medium text-neutral-800 truncate">
                            {doc.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {activeTool.input === ToolInput.MULTIPLE_PDF && (
                            <>
                              <button
                                disabled={idx === 0}
                                onClick={() => {
                                  const copy = [...pdfDocs];
                                  const item = copy.splice(idx, 1)[0];
                                  copy.splice(idx - 1, 0, item);
                                  setPdfDocs(copy);
                                }}
                                className="p-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                              >
                                <MoveUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                disabled={idx === pdfDocs.length - 1}
                                onClick={() => {
                                  const copy = [...pdfDocs];
                                  const item有所 = copy.splice(idx, 1)[0];
                                  copy.splice(idx + 1, 0, item有所);
                                  setPdfDocs(copy);
                                }}
                                className="p-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                              >
                                <MoveDown className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() =>
                              setPdfDocs((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="p-1 text-neutral-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tool Specific Options Panel */}
              <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Tool Settings
                </h3>

                {selectedToolId === ToolId.SPLIT && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setOptions((o) => ({ ...o, splitMode: SplitMode.RANGES }))
                        }
                        className={`flex-1 rounded-xl py-2 text-xs font-semibold border ${
                          options.splitMode === SplitMode.RANGES
                            ? 'bg-blue-50 border-blue-600 text-blue-700'
                            : 'border-neutral-200 text-neutral-600'
                        }`}
                      >
                        By Page Ranges
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setOptions((o) => ({ ...o, splitMode: SplitMode.PAGES_PER_FILE }))
                        }
                        className={`flex-1 rounded-xl py-2 text-xs font-semibold border ${
                          options.splitMode === SplitMode.PAGES_PER_FILE
                            ? 'bg-blue-50 border-blue-600 text-blue-700'
                            : 'border-neutral-200 text-neutral-600'
                        }`}
                      >
                        Every N Pages
                      </button>
                    </div>

                    {options.splitMode === SplitMode.RANGES ? (
                      <div>
                        <label className="text-xs font-medium text-neutral-700">
                          Page Ranges (e.g. "1-2, 3-5, 8")
                        </label>
                        <input
                          type="text"
                          value={options.pageRange}
                          onChange={(e) =>
                            setOptions((o) => ({ ...o, pageRange: e.target.value }))
                          }
                          className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs text-neutral-900"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="text-xs font-medium text-neutral-700">
                          Pages per document
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={options.splitEvery}
                          onChange={(e) =>
                            setOptions((o) => ({
                              ...o,
                              splitEvery: parseInt(e.target.value, 10) || 1,
                            }))
                          }
                          className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs text-neutral-900"
                        />
                      </div>
                    )}
                  </div>
                )}

                {selectedToolId === ToolId.EXTRACT && (
                  <div>
                    <label className="text-xs font-medium text-neutral-700">
                      Pages to extract (e.g. "1-3, 5, 7")
                    </label>
                    <input
                      type="text"
                      value={options.pageRange}
                      onChange={(e) =>
                        setOptions((o) => ({ ...o, pageRange: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs text-neutral-900"
                    />
                  </div>
                )}

                {selectedToolId === ToolId.COMPRESS && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setOptions((o) => ({ ...o, compressMode: CompressMode.RESAMPLE }))
                        }
                        className={`flex-1 rounded-xl py-2 text-xs font-semibold border ${
                          options.compressMode === CompressMode.RESAMPLE
                            ? 'bg-blue-50 border-blue-600 text-blue-700'
                            : 'border-neutral-200 text-neutral-600'
                        }`}
                      >
                        Resample Images
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setOptions((o) => ({ ...o, compressMode: CompressMode.LOSSLESS }))
                        }
                        className={`flex-1 rounded-xl py-2 text-xs font-semibold border ${
                          options.compressMode === CompressMode.LOSSLESS
                            ? 'bg-blue-50 border-blue-600 text-blue-700'
                            : 'border-neutral-200 text-neutral-600'
                        }`}
                      >
                        Lossless Stream
                      </button>
                    </div>

                    {options.compressMode === CompressMode.RESAMPLE && (
                      <div>
                        <label className="text-xs font-medium text-neutral-700">
                          Compression Level
                        </label>
                        <select
                          value={options.compressStrength}
                          onChange={(e) =>
                            setOptions((o) => ({
                              ...o,
                              compressStrength: e.target.value as CompressStrength,
                            }))
                          }
                          className="mt-1 w-full rounded-xl border border-neutral-300 p-2 text-xs"
                        >
                          <option value={CompressStrength.LIGHT}>Light (High resolution scans)</option>
                          <option value={CompressStrength.MEDIUM}>Medium (Balanced quality)</option>
                          <option value={CompressStrength.HEAVY}>Heavy (Smallest file size)</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {selectedToolId === ToolId.PDF_TO_IMAGES && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setOptions((o) => ({ ...o, exportFormat: ImageFormat.PNG }))
                        }
                        className={`flex-1 rounded-xl py-2 text-xs font-semibold border ${
                          options.exportFormat === ImageFormat.PNG
                            ? 'bg-blue-50 border-blue-600 text-blue-700'
                            : 'border-neutral-200 text-neutral-600'
                        }`}
                      >
                        PNG (Crisp)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setOptions((o) => ({ ...o, exportFormat: ImageFormat.JPEG }))
                        }
                        className={`flex-1 rounded-xl py-2 text-xs font-semibold border ${
                          options.exportFormat === ImageFormat.JPEG
                            ? 'bg-blue-50 border-blue-600 text-blue-700'
                            : 'border-neutral-200 text-neutral-600'
                        }`}
                      >
                        JPEG (Compact)
                      </button>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-neutral-700">
                        Resolution (DPI)
                      </label>
                      <select
                        value={options.exportDpi}
                        onChange={(e) =>
                          setOptions((o) => ({
                            ...o,
                            exportDpi: parseInt(e.target.value, 10),
                          }))
                        }
                        className="mt-1 w-full rounded-xl border border-neutral-300 p-2 text-xs"
                      >
                        <option value={72}>72 DPI (Web preview)</option>
                        <option value={150}>150 DPI (Standard)</option>
                        <option value={300}>300 DPI (High-definition print)</option>
                      </select>
                    </div>
                  </div>
                )}

                {selectedToolId === ToolId.IMAGES_TO_PDF && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-neutral-700">Page Sizing</label>
                      <select
                        value={options.imagesPageSize}
                        onChange={(e) =>
                          setOptions((o) => ({
                            ...o,
                            imagesPageSize: e.target.value as PdfPageSizePreset,
                          }))
                        }
                        className="mt-1 w-full rounded-xl border border-neutral-300 p-2 text-xs"
                      >
                        <option value={PdfPageSizePreset.FIT_IMAGE}>Fit each image size</option>
                        <option value={PdfPageSizePreset.A4}>Standard A4 page</option>
                        <option value={PdfPageSizePreset.LETTER}>US Letter page</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-neutral-700">
                        Margins ({options.imagesMargin} pt)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="48"
                        value={options.imagesMargin}
                        onChange={(e) =>
                          setOptions((o) => ({
                            ...o,
                            imagesMargin: parseInt(e.target.value, 10),
                          }))
                        }
                        className="w-full"
                      />
                    </div>
                  </div>
                )}

                {selectedToolId === ToolId.PROTECT && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-neutral-700">Password</label>
                      <input
                        type="password"
                        value={options.protectPassword}
                        onChange={(e) =>
                          setOptions((o) => ({ ...o, protectPassword: e.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs text-neutral-900"
                        placeholder="Enter encryption password"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-neutral-700">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        value={options.protectConfirm}
                        onChange={(e) =>
                          setOptions((o) => ({ ...o, protectConfirm: e.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs text-neutral-900"
                        placeholder="Confirm password"
                      />
                    </div>
                  </div>
                )}

                {selectedToolId === ToolId.MERGE && (
                  <p className="text-xs text-neutral-500">
                    Documents will be merged in the top-to-bottom sequence shown in Input Files.
                  </p>
                )}

                {selectedToolId === ToolId.EXTRACT_TEXT && (
                  <p className="text-xs text-neutral-500">
                    Extracts raw text stream with page separation markers.
                  </p>
                )}
              </div>

              {/* Execution CTA Button */}
              <button
                type="button"
                onClick={handleExecuteTool}
                disabled={
                  (activeTool.input === ToolInput.IMAGES
                    ? imageFiles.length === 0
                    : pdfDocs.length === 0) ||
                  (activeTool.id === ToolId.MERGE && pdfDocs.length < 2)
                }
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                <span>Execute {activeTool.title}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      )}

      {busyMessage && <BusyOverlay message={busyMessage} progress={progress} />}
    </div>
  );
};
