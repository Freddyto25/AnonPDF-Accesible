import React, { useRef } from 'react';
import {
  FileUp,
  PenTool,
  Combine,
  Minimize2,
  FolderOpen,
  Clock,
  Trash2,
  ChevronRight,
  ShieldCheck,
  Split,
  Copy,
  Image as ImageIcon,
  FileImage,
  FileText,
  Lock,
  Unlock,
  Sliders,
} from 'lucide-react';
import { RecentDocument, ScreenType, ToolId } from '../types';
import { DocumentStore } from '../services/documentStore';

interface HomeScreenProps {
  recentDocs: RecentDocument[];
  onOpenPdf: (file: File) => void;
  onOpenRecent: (doc: RecentDocument) => void;
  onNavigate: (screen: ScreenType) => void;
  onOpenTool: (toolId: ToolId) => void;
  onClearRecents: () => void;
  onRemoveRecent: (id: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  recentDocs,
  onOpenPdf,
  onOpenRecent,
  onNavigate,
  onOpenTool,
  onClearRecents,
  onRemoveRecent,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onOpenPdf(file);
      e.target.value = '';
    }
  };

  const quickTools = [
    {
      label: 'Sign PDF',
      desc: 'Draw & place signature',
      icon: PenTool,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100/70',
      action: () => onNavigate('sign'),
    },
    {
      label: 'Merge PDFs',
      desc: 'Combine multiple files',
      icon: Combine,
      color: 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100/70',
      action: () => onOpenTool(ToolId.MERGE),
    },
    {
      label: 'Compress',
      desc: 'Reduce file size',
      icon: Minimize2,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100/70',
      action: () => onOpenTool(ToolId.COMPRESS),
    },
    {
      label: 'Page Editor',
      desc: 'Reorder, crop & redact',
      icon: Sliders,
      color: 'bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100/70',
      action: () => fileInputRef.current?.click(),
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-neutral-50/50 pb-16">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Main Upload Dropzone Banner */}
      <div className="px-4 pt-5 pb-2">
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file && file.type === 'application/pdf') {
              onOpenPdf(file);
            }
          }}
          className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 bg-white p-8 text-center transition-all hover:border-blue-500 hover:bg-blue-50/20 cursor-pointer shadow-xs"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-transform group-hover:scale-110 shadow-2xs">
            <FileUp className="h-7 w-7" />
          </div>
          <h2 className="mt-3 text-base font-semibold text-neutral-900">
            Open or Drop a PDF File
          </h2>
          <p className="mt-1 text-xs text-neutral-500 max-w-xs">
            Select a document to read, annotate, redact, watermark, or edit. Everything runs strictly in your browser.
          </p>
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            Choose File
          </button>
        </div>
      </div>

      {/* Quick Action Grid */}
      <div className="px-4 py-3">
        <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {quickTools.map((t, idx) => {
            const Icon = t.icon;
            return (
              <button
                key={idx}
                onClick={t.action}
                className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${t.color}`}
              >
                <Icon className="h-5 w-5 mb-2" />
                <span className="text-xs font-semibold text-neutral-900">{t.label}</span>
                <span className="text-[11px] text-neutral-500 mt-0.5">{t.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Files */}
      {recentDocs.length > 0 && (
        <div className="px-4 py-3">
          <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-neutral-500">
              <Clock className="h-3.5 w-3.5" />
              <h3 className="text-xs font-semibold uppercase tracking-wider">
                Recent Documents
              </h3>
            </div>
            <button
              onClick={onClearRecents}
              className="text-[11px] font-medium text-neutral-500 hover:text-red-600 transition-colors"
            >
              Clear
            </button>
          </div>

          <div className="space-y-1.5 rounded-2xl border border-neutral-200/80 bg-white p-2 shadow-2xs">
            {recentDocs.slice(0, 5).map((doc) => (
              <div
                key={doc.id}
                className="group flex items-center justify-between rounded-xl p-2.5 hover:bg-neutral-50 transition-colors"
              >
                <div
                  onClick={() => onOpenRecent(doc)}
                  className="flex flex-1 items-center gap-3 min-w-0 cursor-pointer"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <span className="text-[10px] font-bold">PDF</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {doc.name}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {DocumentStore.formatBytes(doc.sizeBytes)} • {doc.pageCount} page
                      {doc.pageCount === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onRemoveRecent(doc.id)}
                    className="opacity-0 group-hover:opacity-100 flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-600 transition-all"
                    title="Remove from recents"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onOpenRecent(doc)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Featured Tools Grid */}
      <div className="px-4 py-3">
        <div className="mb-2.5 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            PDF Tool Catalog
          </h3>
          <button
            onClick={() => onNavigate('tools')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            See all
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <ToolCard
            title="Split PDF"
            desc="Extract pages or split into multiple files by range"
            icon={Split}
            onClick={() => onOpenTool(ToolId.SPLIT)}
          />
          <ToolCard
            title="PDF to Images"
            desc="Export pages as high-resolution PNG or JPEG"
            icon={ImageIcon}
            onClick={() => onOpenTool(ToolId.PDF_TO_IMAGES)}
          />
          <ToolCard
            title="Images to PDF"
            desc="Convert pictures or scanned pages to a clean PDF"
            icon={FileImage}
            onClick={() => onOpenTool(ToolId.IMAGES_TO_PDF)}
          />
          <ToolCard
            title="Extract Text"
            desc="Extract text in reading order to .txt file"
            icon={FileText}
            onClick={() => onOpenTool(ToolId.EXTRACT_TEXT)}
          />
          <ToolCard
            title="Protect with Password"
            desc="Add password and control print/copy permissions"
            icon={Lock}
            onClick={() => onOpenTool(ToolId.PROTECT)}
          />
          <ToolCard
            title="Unlock PDF"
            desc="Remove passwords from protected documents"
            icon={Unlock}
            onClick={() => onOpenTool(ToolId.UNLOCK)}
          />
        </div>
      </div>

      {/* Privacy Guarantee Note */}
      <div className="mx-4 mt-3 rounded-2xl border border-neutral-200/80 bg-white p-4 text-center shadow-2xs">
        <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <h4 className="mt-2 text-xs font-semibold text-neutral-900">
          Privacy-First Architecture
        </h4>
        <p className="mt-1 text-[11px] text-neutral-500 max-w-md mx-auto">
          AnonPDF performs 100% of all PDF rendering, parsing, modification, encryption, and signatures directly in your browser. No files or metadata ever leave your computer.
        </p>
      </div>
    </div>
  );
};

const ToolCard: React.FC<{
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}> = ({ title, desc, icon: Icon, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-3 rounded-xl border border-neutral-200/80 bg-white p-3.5 text-left shadow-2xs hover:border-blue-300 hover:bg-blue-50/20 transition-all group"
  >
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
      <Icon className="h-4 w-4" />
    </div>
    <div className="min-w-0 flex-1">
      <h4 className="text-xs font-semibold text-neutral-900 group-hover:text-blue-600 transition-colors">
        {title}
      </h4>
      <p className="text-[11px] text-neutral-500 truncate mt-0.5">{desc}</p>
    </div>
    <ChevronRight className="h-4 w-4 text-neutral-300 group-hover:text-neutral-500 transition-colors" />
  </button>
);
