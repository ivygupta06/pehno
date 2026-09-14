import React, { useState } from 'react';
import { 
  X, Key, RotateCcw, Trash2, Check, ExternalLink, ShieldCheck, 
  AlertCircle, RefreshCw
} from 'lucide-react';
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
      setTestResult({ success: true, message: 'Success! Gemini AI is connected & active.' });
      onSaveSettings({ ...settings, geminiApiKey: apiKey.trim() });
    } else {
      setTestResult({ success: false, message: check.error || 'Invalid API key. Please double check.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-pastel-cream-100 rounded-3xl p-6 max-w-md w-full border border-pastel-sand shadow-soft space-y-6 animate-scale-up relative">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-pastel-sand/60 pb-4">
          <div>
            <h3 className="font-serif text-xl font-bold text-pastel-charcoal">
              Settings & API Configuration
            </h3>
            <p className="text-xs text-pastel-muted">
              Configure your Google Gemini AI Key or manage wardrobe data.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-pastel-cream-200 text-pastel-charcoal transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Google Gemini AI API Key Section */}
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

            <p className="text-[11px] text-pastel-muted leading-relaxed">
              Key format: Must start with <code className="bg-pastel-cream-200 px-1.5 py-0.5 rounded font-mono text-pastel-charcoal">AIzaSy...</code> from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-pastel-sage-dark font-semibold underline">Google AI Studio</a>.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-pastel-muted pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-pastel-sage-dark" />
            <span>Key is stored securely in your local browser and sent directly to Google Gemini.</span>
          </div>
        </div>

        {/* Reset / Clear Section */}
        <div className="space-y-2 pt-2 border-t border-pastel-sand/50">
          <span className="text-xs font-bold uppercase tracking-wider text-pastel-muted block">
            Reset Options
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => {
                if (confirm('Reset wardrobe to the curated sample capsule?')) {
                  onResetWardrobe();
                  onClose();
                }
              }}
              className="p-2.5 rounded-xl bg-white border border-pastel-sand hover:bg-pastel-cream-50 text-xs font-semibold text-pastel-charcoal flex items-center justify-between shadow-2xs transition-all"
            >
              <div className="flex items-center gap-2">
                <RotateCcw className="w-3.5 h-3.5 text-pastel-sage-dark" />
                <span>Reset to Sample</span>
              </div>
            </button>

            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete all garments and outfits?')) {
                  onClearAll();
                  onClose();
                }
              }}
              className="p-2.5 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-xs font-semibold text-rose-600 flex items-center justify-between shadow-2xs transition-all"
            >
              <div className="flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Clear All Pieces</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
