import React from 'react';

interface BusyOverlayProps {
  message: string;
  progress?: number;
}

export const BusyOverlay: React.FC<BusyOverlayProps> = ({ message, progress }) => {
  const percent = progress !== undefined ? Math.round(progress * 100) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div className="mx-4 flex w-full max-w-sm flex-col items-center rounded-2xl bg-white p-6 shadow-2xl text-center">
        <div className="relative mb-4 flex h-14 w-14 items-center justify-center">
          <div className="absolute h-full w-full rounded-full border-4 border-blue-100 animate-pulse" />
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>

        <h3 className="text-base font-semibold text-neutral-800">{message}</h3>

        {percent !== null && (
          <div className="mt-4 w-full">
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-200"
                style={{ width: `${Math.max(5, Math.min(100, percent))}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-neutral-500">{percent}% completed</p>
          </div>
        )}
      </div>
    </div>
  );
};
