import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldCheck,
  Trash2,
  Moon,
  Clock,
  HardDrive,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { TopBar } from './TopBar';
import { DocumentStore, AppPreferencesState } from '../services/documentStore';

interface SettingsScreenProps {
  onClearAllData: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onClearAllData }) => {
  const [prefs, setPrefs] = useState<AppPreferencesState>(DocumentStore.getPreferences());
  const [savedNote, setSavedNote] = useState<string | null>(null);

  const handleToggle = (key: keyof AppPreferencesState) => {
    const updated = DocumentStore.savePreferences({ [key]: !prefs[key] });
    setPrefs(updated);
    setSavedNote('Preference saved.');
    setTimeout(() => setSavedNote(null), 2000);
  };

  const handleClearEverything = async () => {
    if (confirm('Are you sure you want to clear all locally cached documents and settings?')) {
      await DocumentStore.clearRecents();
      onClearAllData();
      setSavedNote('All local cache cleared successfully.');
      setTimeout(() => setSavedNote(null), 2000);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-neutral-50/50 pb-20">
      <TopBar title="Settings" subtitle="Preferences and privacy controls" />

      <div className="p-4 max-w-2xl mx-auto space-y-5">
        {savedNote && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-700 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4" />
            <span>{savedNote}</span>
          </div>
        )}

        {/* Privacy Card */}
        <div className="rounded-2xl border border-blue-200/80 bg-blue-50/40 p-5 shadow-2xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">100% Private & Local</h3>
              <p className="text-xs text-neutral-600">Zero tracking, no telemetry, no servers</p>
            </div>
          </div>
          <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
            AnonPDF has no account system, no telemetry, no tracking cookies, and never transmits your files over any network. All PDF rendering, vector manipulation, and digital stamping execute directly on your processor.
          </p>
        </div>

        {/* Preferences Section */}
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Reading & History
          </h3>

          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-neutral-400" />
              <div>
                <p className="text-sm font-semibold text-neutral-800">Remember Recent Documents</p>
                <p className="text-xs text-neutral-400">Keep recent files in browser storage for quick access</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={prefs.rememberRecents}
              onChange={() => handleToggle('rememberRecents')}
              className="h-5 w-5 rounded text-blue-600 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between py-1 border-t border-neutral-100">
            <div className="flex items-center gap-3">
              <Moon className="h-4 w-4 text-neutral-400" />
              <div>
                <p className="text-sm font-semibold text-neutral-800">Inverted High-Contrast Theme</p>
                <p className="text-xs text-neutral-400">Enable dark reading mode by default in viewer</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={prefs.invertColors}
              onChange={() => handleToggle('invertColors')}
              className="h-5 w-5 rounded text-blue-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Data & Storage Section */}
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Storage & Data Management
          </h3>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HardDrive className="h-4 w-4 text-neutral-400" />
              <div>
                <p className="text-sm font-semibold text-neutral-800">Local Browser Cache</p>
                <p className="text-xs text-neutral-400">Clear all cached files, recent history, and temp files</p>
              </div>
            </div>
            <button
              onClick={handleClearEverything}
              className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear Cache</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
