import React, { useState } from 'react';
import { X, RotateCcw, Trash2, Check, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { validateGeminiApiKey } from '../lib/geminiStylist';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetWardrobe: () => void;
  onClearAll: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onResetWardrobe,
  onClearAll,
}) => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const testGeminiConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const check = await validateGeminiApiKey();
    setIsTesting(false);
    setTestResult(check.valid
      ? { success: true, message: 'Gemini AI is securely connected.' }
      : { success: false, message: check.error || 'Gemini is unavailable right now.' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-pastel-cream-100 rounded-3xl p-6 max-w-md w-full border border-pastel-sand shadow-soft space-y-6 animate-scale-up relative">
        <div className="flex items-center justify-between border-b border-pastel-sand/60 pb-4">
          <div>
            <h3 className="font-serif text-xl font-bold text-pastel-charcoal">Settings</h3>
            <p className="text-xs text-pastel-muted">Manage your wardrobe and AI service connection.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-pastel-cream-200 text-pastel-charcoal transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 bg-white p-5 rounded-2xl border border-pastel-sand shadow-soft">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-pastel-sage-dark" />
            <span className="text-xs font-bold uppercase tracking-wider text-pastel-charcoal">Secure Gemini AI</span>
          </div>
          <p className="text-[11px] text-pastel-muted leading-relaxed">
            Gemini runs through Pehno&apos;s protected server. Your browser never receives or stores the API key. Sign in to use AI styling and image analysis.
          </p>
          <button
            onClick={testGeminiConnection}
            disabled={isTesting}
            className="px-4 py-2.5 rounded-xl bg-pastel-sage-dark text-white font-bold text-xs shadow-soft hover:shadow-soft-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isTesting ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>Checking...</span></> : <><Check className="w-3.5 h-3.5" /><span>Test connection</span></>}
          </button>
          {testResult && (
            <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${testResult.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
              {testResult.success ? <Check className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        <div className="space-y-2 pt-2 border-t border-pastel-sand/50">
          <span className="text-xs font-bold uppercase tracking-wider text-pastel-muted block">Reset Options</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button onClick={() => { if (confirm('Reset wardrobe to the curated sample capsule?')) { onResetWardrobe(); onClose(); } }} className="p-2.5 rounded-xl bg-white border border-pastel-sand hover:bg-pastel-cream-50 text-xs font-semibold text-pastel-charcoal flex items-center justify-between shadow-2xs transition-all">
              <span className="flex items-center gap-2"><RotateCcw className="w-3.5 h-3.5 text-pastel-sage-dark" />Reset to Sample</span>
            </button>
            <button onClick={() => { if (confirm('Are you sure you want to delete all garments and outfits?')) { onClearAll(); onClose(); } }} className="p-2.5 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-xs font-semibold text-rose-600 flex items-center justify-between shadow-2xs transition-all">
              <span className="flex items-center gap-2"><Trash2 className="w-3.5 h-3.5 text-rose-500" />Clear All Pieces</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
