import React from 'react';
import { Download, CheckCircle2, RefreshCw, Eye, FileText } from 'lucide-react';
import { ToolResultData, GeneratedFile } from '../types';
import { DocumentStore } from '../services/documentStore';

interface ResultCardProps {
  result: ToolResultData;
  onStartOver: () => void;
  onOpenInViewer?: (file: GeneratedFile) => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  result,
  onStartOver,
  onOpenInViewer,
}) => {
  const handleDownload = (file: GeneratedFile) => {
    DocumentStore.downloadFile(file.data, file.name, file.mimeType);
  };

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-neutral-900">Operation Finished</h3>
          <p className="text-sm text-neutral-600 mt-0.5">{result.summary}</p>
          {result.note && (
            <p className="text-xs text-neutral-500 mt-1">{result.note}</p>
          )}
        </div>
      </div>

      <div className="mt-5 space-y-2.5">
        {result.files.map((file, idx) => (
          <div
            key={idx}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-neutral-200/80 bg-white p-3.5 shadow-2xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">{file.name}</p>
                <p className="text-xs text-neutral-500">{DocumentStore.formatBytes(file.sizeBytes)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {file.mimeType === 'application/pdf' && onOpenInViewer && (
                <button
                  type="button"
                  onClick={() => onOpenInViewer(file)}
                  className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDownload(file)}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-2xs hover:bg-blue-700 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onStartOver}
          className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Process another file
        </button>
      </div>
    </div>
  );
};
