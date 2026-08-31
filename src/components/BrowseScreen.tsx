import React, { useState, useRef } from 'react';
import {
  FolderOpen,
  Search,
  FileUp,
  Trash2,
  Download,
  Eye,
  FileText,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { TopBar } from './TopBar';
import { RecentDocument } from '../types';
import { DocumentStore } from '../services/documentStore';

interface BrowseScreenProps {
  recentDocs: RecentDocument[];
  onOpenPdf: (file: File) => void;
  onOpenRecent: (doc: RecentDocument) => void;
  onRemoveRecent: (id: string) => void;
  onClearRecents: () => void;
}

export const BrowseScreen: React.FC<BrowseScreenProps> = ({
  recentDocs,
  onOpenPdf,
  onOpenRecent,
  onRemoveRecent,
  onClearRecents,
}) => {
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredDocs = recentDocs.filter((doc) =>
    doc.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto bg-neutral-50/50 pb-20">
      <TopBar
        title="Document Library"
        subtitle={`${recentDocs.length} saved document${recentDocs.length === 1 ? '' : 's'}`}
        actions={
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <FileUp className="h-3.5 w-3.5" />
            <span>Open PDF</span>
          </button>
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onOpenPdf(file);
            e.target.value = '';
          }
        }}
        className="hidden"
      />

      <div className="p-4 max-w-3xl mx-auto space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recent files..."
            className="w-full rounded-2xl border border-neutral-200/80 bg-white py-2.5 pl-10 pr-4 text-xs text-neutral-900 placeholder-neutral-400 shadow-2xs focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Documents List */}
        {filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-200/80 bg-white p-10 text-center shadow-2xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 mb-3">
              <FolderOpen className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-neutral-800">
              {search ? 'No matching documents' : 'No documents in library'}
            </h3>
            <p className="text-xs text-neutral-500 max-w-xs mt-1">
              {search
                ? 'Try a different search term.'
                : 'Documents you open or process will appear here for fast access.'}
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
            >
              Select a PDF
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                Documents ({filteredDocs.length})
              </span>
              <button
                onClick={onClearRecents}
                className="text-xs font-medium text-neutral-500 hover:text-red-600"
              >
                Clear all
              </button>
            </div>

            <div className="rounded-2xl border border-neutral-200/80 bg-white divide-y divide-neutral-100 shadow-2xs overflow-hidden">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3.5 hover:bg-neutral-50/80 transition-colors"
                >
                  <div
                    onClick={() => onOpenRecent(doc)}
                    className="flex flex-1 items-center gap-3 min-w-0 cursor-pointer"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold text-xs">
                      PDF
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 truncate">
                        {doc.name}
                      </p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {DocumentStore.formatBytes(doc.sizeBytes)} • {doc.pageCount} page
                        {doc.pageCount === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 ml-2">
                    <button
                      onClick={() => onOpenRecent(doc)}
                      className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Open</span>
                    </button>
                    <button
                      onClick={() => onRemoveRecent(doc.id)}
                      className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                      title="Remove file"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
