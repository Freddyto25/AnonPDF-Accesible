import React, { useState, useEffect, useRef } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Moon,
  Sun,
  Search,
  Sliders,
  PenTool,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  ArrowRight,
  Maximize2,
} from 'lucide-react';
import { TopBar } from './TopBar';
import { PdfEngine, SearchResult } from '../services/pdfEngine';
import { DocumentStore } from '../services/documentStore';

interface ViewerScreenProps {
  filename: string;
  data: Uint8Array;
  password?: string;
  onBack: () => void;
  onEdit: () => void;
  onSign: () => void;
}

export const ViewerScreen: React.FC<ViewerScreenProps> = ({
  filename,
  data,
  password,
  onBack,
  onEdit,
  onSign,
}) => {
  const [pageCount, setPageCount] = useState<number>(0);
  const [pageSizes, setPageSizes] = useState<Array<{ width: number; height: number; aspectRatio: number }>>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1.0);
  const [invertColors, setInvertColors] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search dialog
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);

  // Jump to page dialog
  const [isJumpOpen, setIsJumpOpen] = useState<boolean>(false);
  const [jumpPageInput, setJumpPageInput] = useState<string>('');

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        const meta迷 = await PdfEngine.readMeta(data, password);
        setPageCount(meta迷.pageCount);
        setPageSizes(meta迷.pageSizes);
        await DocumentStore.saveRecentDocument(filename, data, meta迷.pageCount);
      } catch (err: any) {
        setError(err.message || 'Could not load PDF document.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [data, filename, password]);

  const scrollToPage = (pageIdx: number) => {
    const target = pageRefs.current[pageIdx];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrentPage(pageIdx + 1);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const hits = await PdfEngine.searchDocument(data, searchQuery, password);
      setSearchResults(hits);
    } catch (err) {
      console.warn('Search failed:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(jumpPageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= pageCount) {
      scrollToPage(p - 1);
      setIsJumpOpen(false);
    }
  };

  const handleDownload = () => {
    DocumentStore.downloadFile(data, filename);
  };

  return (
    <div className="flex h-screen flex-col bg-neutral-900 text-white select-none">
      <TopBar
        title={filename}
        subtitle={`${pageCount} page${pageCount === 1 ? '' : 's'}`}
        onBack={onBack}
        actions={
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-600 hover:bg-neutral-100 transition-colors"
              title="Search in document"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              onClick={() => setInvertColors(!invertColors)}
              className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                invertColors ? 'bg-amber-100 text-amber-700' : 'text-neutral-600 hover:bg-neutral-100'
              }`}
              title="Invert colors (Night mode)"
            >
              {invertColors ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={onSign}
              className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors"
              title="Sign Document"
            >
              <PenTool className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign</span>
            </button>
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
              title="Edit & Organize Pages"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Edit Pages</span>
            </button>
          </div>
        }
      />

      {/* Main Viewer Canvas Area */}
      <div
        ref={containerRef}
        className={`flex-1 overflow-y-auto overflow-x-auto p-4 transition-colors ${
          invertColors ? 'bg-neutral-950' : 'bg-neutral-800'
        }`}
      >
        {loading && (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-9 w-9 animate-spin rounded-full border-3 border-blue-500 border-t-transparent" />
              <p className="text-xs text-neutral-400">Rendering document...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex h-full items-center justify-center p-4">
            <div className="rounded-2xl bg-red-950/60 border border-red-800 p-6 text-center text-red-200 max-w-md">
              <p className="text-sm font-semibold mb-2">Could not open PDF</p>
              <p className="text-xs text-red-300">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="mx-auto flex flex-col items-center gap-6 pb-20">
            {Array.from({ length: pageCount }, (_, i) => (
              <div
                key={i}
                ref={(el) => (pageRefs.current[i] = el)}
                className={`relative shadow-2xl rounded-sm transition-transform duration-100 ${
                  invertColors ? 'invert-filter' : ''
                }`}
                style={{
                  width: `${Math.min(1000, 680 * zoom)}px`,
                  maxWidth: '100%',
                }}
              >
                <PdfPageView
                  data={data}
                  pageIndex={i}
                  zoom={zoom}
                  password={password}
                  aspectRatio={pageSizes[i]?.aspectRatio || 0.707}
                />
                <div className="absolute bottom-2 right-2 rounded-md bg-neutral-900/70 px-2 py-0.5 text-[10px] text-white backdrop-blur-xs pointer-events-none">
                  {i + 1}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Bottom Bar Controls */}
      {!loading && !error && (
        <div className="sticky bottom-0 z-20 flex items-center justify-between border-t border-neutral-800 bg-neutral-900/95 px-4 py-2.5 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsJumpOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-neutral-800 px-3 py-1 text-xs font-medium text-neutral-200 hover:bg-neutral-700 transition-colors"
            >
              <span>{currentPage}</span>
              <span className="text-neutral-500">/</span>
              <span>{pageCount}</span>
            </button>
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-neutral-800 p-1">
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
              disabled={zoom <= 0.5}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-300 hover:bg-neutral-700 disabled:opacity-30 transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setZoom(1.0)}
              className="px-2 py-0.5 text-[11px] font-semibold text-neutral-300 hover:text-white"
              title="Reset Zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={() => setZoom((z) => Math.min(3.0, z + 0.25))}
              disabled={zoom >= 3.0}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-300 hover:bg-neutral-700 disabled:opacity-30 transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
            title="Download PDF"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Download</span>
          </button>
        </div>
      )}

      {/* Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-xs p-4 pt-16">
          <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 p-5 shadow-2xl animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Find in Document</h3>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search text..."
                autoFocus
                className="flex-1 rounded-xl border border-neutral-700 bg-neutral-800 px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!searchQuery.trim() || isSearching}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </form>

            {searchResults && (
              <div className="mt-4 max-h-60 overflow-y-auto space-y-2">
                {searchResults.length === 0 ? (
                  <p className="text-xs text-neutral-400 py-3 text-center">No matches found.</p>
                ) : (
                  searchResults.map((hit, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        scrollToPage(hit.pageIndex);
                        setIsSearchOpen(false);
                      }}
                      className="w-full flex items-start justify-between rounded-xl bg-neutral-800/80 p-3 text-left hover:bg-neutral-800 hover:border-neutral-700 border border-transparent transition-all"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                          Page {hit.pageIndex + 1}
                        </span>
                        <p className="text-xs text-neutral-300 mt-0.5 line-clamp-2">{hit.snippet}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-neutral-500 shrink-0 mt-1" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Jump to Page Modal */}
      {isJumpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-xs rounded-2xl bg-neutral-900 border border-neutral-800 p-5 shadow-2xl">
            <h3 className="text-sm font-semibold text-white mb-2">Go to Page</h3>
            <p className="text-xs text-neutral-400 mb-4">Enter a page number between 1 and {pageCount}</p>
            <form onSubmit={handleJumpSubmit} className="space-y-4">
              <input
                type="number"
                min="1"
                max={pageCount}
                value={jumpPageInput}
                onChange={(e) => setJumpPageInput(e.target.value)}
                placeholder="Page number"
                autoFocus
                className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3.5 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsJumpOpen(false)}
                  className="rounded-xl px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Go
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Canvas Page Renderer with lazy rendering
const PdfPageView: React.FC<{
  data: Uint8Array;
  pageIndex: number;
  zoom: number;
  password?: string;
  aspectRatio: number;
}> = ({ data, pageIndex, zoom, password, aspectRatio }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let active = true;
    const render = async () => {
      if (!canvasRef.current) return;
      try {
        const targetWidth = Math.floor(Math.min(1400, 900 * zoom));
        await PdfEngine.renderPageToCanvas(
          data,
          pageIndex,
          canvasRef.current,
          targetWidth,
          password
        );
        if (active) setRendered(true);
      } catch (e) {
        console.warn(`Render error on page ${pageIndex}:`, e);
      }
    };
    render();
    return () => {
      active = false;
    };
  }, [data, pageIndex, zoom, password]);

  return (
    <div
      className="relative w-full bg-white overflow-hidden rounded-sm"
      style={{
        aspectRatio: `${aspectRatio > 0 ? aspectRatio : 0.707}`,
      }}
    >
      <canvas ref={canvasRef} className="w-full h-auto block" />
      {!rendered && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-100">
          <span className="text-xs font-medium text-neutral-400">{pageIndex + 1}</span>
        </div>
      )}
    </div>
  );
};
