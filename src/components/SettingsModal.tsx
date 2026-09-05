import React, { useState } from 'react';
import { X, Key, RotateCcw, Trash2, Check, ExternalLink, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { UserSettings } from '../lib/storage';
import { validateGeminiApiKey } from '../lib/geminiStylist';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
  onResetWardrobe: () => void;
  onClearAll: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetWardrobe,
  onClearAll,
}) => {
  const [apiKey, setApiKey] = useState(settings.geminiApiKey || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(
    settings.geminiApiKey && settings.geminiApiKey.length > 15 
      ? { success: true, message: 'Gemini AI is connected and active.' }
      : null
  );

  if (!isOpen) return null;

  const handleTestAndSave = async () => {
    if (!apiKey.trim()) {
      onSaveSettings({ ...settings, geminiApiKey: '' });
      setTestResult({ success: false, message: 'API key cleared. Using built-in local color theory stylist.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const check = await validateGeminiApiKey(apiKey.trim());
    setIsTesting(false);

    if (check.valid) {
      setTestResult({ success: true, message: 'Success! Gemini 2.5 Flash is connected & active.' });
      onSaveSettings({ ...settings, geminiApiKey: apiKey.trim() });
    } else {
      setTestResult({ success: false, message: check.error || 'Invalid API key. Please double check.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pastel-charcoal/40 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-pastel-cream-100 rounded-3xl border border-pastel-sand shadow-soft-lg p-6 sm:p-8 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-pastel-sand/50">
          <div>
            <h2 className="font-serif text-2xl font-bold text-pastel-charcoal">
              AI Settings & Connection
            </h2>
            <p className="text-xs text-pastel-muted mt-0.5">
              Connect Google Gemini to power real-time AI styling and deep vision.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-pastel-charcoal/60 hover:text-pastel-charcoal hover:bg-pastel-cream-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gemini AI API Key Section */}
        <div className="space-y-3 bg-white p-5 rounded-2xl border border-pastel-sand shadow-soft">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-pastel-charcoal flex items-center gap-1.5">
              <Key className="w-4 h-4 text-amber-500" />
              <span>Google Gemini API Key</span>
            </label>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-bold text-pastel-sage-dark hover:underline flex items-center gap-1"
            >
              <span>Get Free Key</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* 30-second guide */}
          <div className="p-3 rounded-xl bg-pastel-butter-light/80 border border-pastel-butter text-[11px] text-pastel-charcoal space-y-1">
            <p className="font-bold text-pastel-butter-dark flex items-center gap-1">
              <span>⚡ How to get your free key (30 seconds):</span>
            </p>
            <ol className="list-decimal list-inside space-y-0.5 text-pastel-charcoal/80 pl-1">
              <li>Open <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="underline font-semibold text-pastel-sage-dark">Google AI Studio</a>.</li>
              <li>Click <strong>"Create API key"</strong> (100% free, no credit card required).</li>
              <li>Copy and paste it below, then click <strong>"Test & Save Key"</strong>.</li>
            </ol>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="password"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-xl bg-pastel-cream-100 border border-pastel-sand text-xs text-pastel-charcoal focus:outline-none focus:border-pastel-sage-medium"
              />
              <button
                onClick={handleTestAndSave}
                disabled={isTesting}
                className="px-4 py-2.5 rounded-xl bg-pastel-sage-dark text-white font-bold text-xs shadow-soft hover:shadow-soft-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Test & Save</span>
                  </>
                )}
              </button>
            </div>

            {/* Test result status badge */}
            {testResult && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {testResult.success ? (
                  <Check className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-pastel-muted pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-pastel-sage-dark" />
            <span>Key is stored only in your local browser storage and sent directly to Google.</span>
          </div>
        </div>

        {/* Wardrobe Data Management */}
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-pastel-muted block">
            Wardrobe Data Management
          </span>

          <div className="space-y-2">
            <button
              onClick={() => {
                if (confirm('Reset wardrobe to the curated 18-piece pastel starter capsule?')) {
                  onResetWardrobe();
                  onClose();
                }
              }}
              className="w-full p-3 rounded-2xl bg-white border border-pastel-sand hover:bg-pastel-cream-50 text-xs font-semibold text-pastel-charcoal flex items-center justify-between shadow-xs transition-all"
            >
              <div className="flex items-center gap-2.5">
                <RotateCcw className="w-4 h-4 text-pastel-sage-dark" />
                <span>Reset to Sample Pastel Wardrobe</span>
              </div>
              <span className="text-[10px] text-pastel-muted">18 items</span>
            </button>

            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete all wardrobe items and saved fits?')) {
                  onClearAll();
                  onClose();
                }
              }}
              className="w-full p-3 rounded-2xl bg-white border border-rose-200 hover:bg-rose-50 text-xs font-semibold text-rose-600 flex items-center justify-between shadow-xs transition-all"
            >
              <div className="flex items-center gap-2.5">
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span>Clear All Saved Wardrobe Data</span>
              </div>
              <span className="text-[10px] text-rose-400">Empty</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
