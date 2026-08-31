import React from 'react';
import { ShieldCheck, Heart, Code2, Lock, Cpu, Globe } from 'lucide-react';
import { TopBar } from './TopBar';

export const AboutScreen: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto bg-neutral-50/50 pb-20">
      <TopBar title="About AnonPDF" subtitle="Open source, zero tracking PDF suite" />

      <div className="p-4 max-w-2xl mx-auto space-y-5">
        {/* Hero Card */}
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm mb-3">
            <span className="font-extrabold text-xl tracking-tighter">PDF</span>
          </div>
          <h2 className="text-lg font-bold text-neutral-900">AnonPDF</h2>
          <p className="text-xs text-neutral-500 mt-0.5">Version 1.0.0 (Web Edition)</p>
          <p className="text-xs text-neutral-600 max-w-md mx-auto mt-3 leading-relaxed">
            The accessible, client-side PDF utility designed from the ground up for absolute privacy, high performance, and ease of use.
          </p>
        </div>

        {/* Core Principles */}
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Guiding Principles
          </h3>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-neutral-900">Zero Network Permissions</h4>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Your files are never uploaded to any server. All processing runs in your browser via WebAssembly and JavaScript engines.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Cpu className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-neutral-900">No Tracking & No Ads</h4>
                <p className="text-xs text-neutral-500 mt-0.5">
                  No analytics scripts, no marketing trackers, no cookies, and no account requirements.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                <Code2 className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-neutral-900">Free & Open Source</h4>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Committed to open software principles and community accessibility.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Technologies / Credits */}
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Open Source Technologies
          </h3>

          <div className="grid grid-cols-2 gap-2 text-xs text-neutral-600">
            <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
              <span className="font-semibold text-neutral-800">PDF.js</span>
              <p className="text-[11px] text-neutral-400">Page rendering & text search</p>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
              <span className="font-semibold text-neutral-800">PDF-lib</span>
              <p className="text-[11px] text-neutral-400">Vector editing & document assembly</p>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
              <span className="font-semibold text-neutral-800">Lucide Icons</span>
              <p className="text-[11px] text-neutral-400">Visual interface iconography</p>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
              <span className="font-semibold text-neutral-800">JSZip</span>
              <p className="text-[11px] text-neutral-400">Multi-page archive packaging</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
