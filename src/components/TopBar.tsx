import React from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

interface TopBarProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({
  title,
  subtitle,
  onBack,
  actions,
}) => {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-neutral-200/80 bg-white/95 px-4 backdrop-blur-md">
      <div className="flex items-center gap-3 min-w-0">
        {onBack ? (
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200 transition-colors"
            title="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
            <span className="font-bold text-sm tracking-tighter">PDF</span>
          </div>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-neutral-900 truncate">
              {title}
            </h1>
            {!onBack && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                <ShieldCheck className="h-3 w-3" />
                100% Client-Side
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-neutral-500 truncate">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5">{actions}</div>
    </header>
  );
};
