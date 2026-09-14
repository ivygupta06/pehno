import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Key, RotateCcw, Trash2, Check, ExternalLink, ShieldCheck, 
  AlertCircle, RefreshCw, Download, Upload, CloudUpload, CloudDownload, RefreshCw as SyncIcon,
  Database, Users, Activity, Terminal
} from 'lucide-react';
import { 
  UserSettings, exportWardrobeBackup, importWardrobeBackup, 
  pushToSharedServer, pullFromSharedServer 
} from '../lib/storage';
import { validateGeminiApiKey } from '../lib/geminiStylist';
import { GarmentItem, Outfit } from '../types/wardrobe';
import { User } from '../types/auth';
import { fetchServerUsers, fetchServerActivity, ServerActivity } from '../lib/auth';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
  onResetWardrobe: () => void;
  onClearAll: () => void;
  wardrobe: GarmentItem[];
  favorites: Outfit[];
  onSyncWardrobe: (items: GarmentItem[], favorites: Outfit[]) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetWardrobe,
  onClearAll,
  wardrobe,
  favorites,
  onSyncWardrobe,
}) => {
  const [apiKey, setApiKey] = useState(settings.geminiApiKey || '');
  const [isTesting, setIsTesting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [serverUsers, setServerUsers] = useState<User[]>([]);
  const [serverActivity, setServerActivity] = useState<ServerActivity[]>([]);
  const [loadingServerStats, setLoadingServerStats] = useState(false);

  const loadServerStats = async () => {
    setLoadingServerStats(true);
    try {
      const [u, a] = await Promise.all([fetchServerUsers(), fetchServerActivity()]);
      setServerUsers(u);
      setServerActivity(a);
    } catch (e) {}
    finally {
      setLoadingServerStats(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadServerStats();
    }
  }, [isOpen]);
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

  // Push current browser's closet to shared local server
  const handlePushShared = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    const res = await pushToSharedServer(wardrobe, favorites);
    setIsSyncing(false);
    if (res.success) {
      setSyncStatus({
        type: 'success',
        text: `Saved ${wardrobe.length} items to shared project sync! Now open your other browser (e.g. Brave or Safari) and click "Pull".`,
      });
    } else {
      setSyncStatus({
        type: 'error',
        text: `Could not save to shared server: ${res.error}`,
      });
    }
  };

  // Pull shared closet into this browser
  const handlePullShared = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    const res = await pullFromSharedServer();
    setIsSyncing(false);
    if (res.success && res.exists && res.wardrobe) {
      onSyncWardrobe(res.wardrobe, res.favorites || []);
      setSyncStatus({
        type: 'success',
        text: `Synced! Loaded ${res.wardrobe.length} pieces from the shared closet into this browser.`,
      });
    } else if (res.success && !res.exists) {
      setSyncStatus({
        type: 'info',
        text: 'No shared closet file found yet. First open the browser that has your clothes (e.g. Safari) and click "Push This Browser\'s Closet".',
      });
    } else {
      setSyncStatus({
        type: 'error',
        text: `Sync error: ${res.error}`,
      });
    }
  };

  // Export closet to a downloadable JSON file
  const handleExportJSON = () => {
    const backup = exportWardrobeBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pehno-closet-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSyncStatus({
      type: 'success',
      text: `Exported ${wardrobe.length} items to JSON file! You can import this file into any browser.`,
    });
  };

  // Import closet from JSON file
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const res = importWardrobeBackup(json);
        if (res.success) {
          onSyncWardrobe(res.wardrobe, res.favorites);
          setSyncStatus({
            type: 'success',
            text: `Successfully imported ${res.wardrobe.length} garments into this browser!`,
          });
        } else {
          setSyncStatus({
            type: 'error',
            text: res.error || 'Failed to import backup.',
          });
        }
      } catch (err: any) {
        setSyncStatus({
          type: 'error',
          text: 'Invalid JSON file: ' + err.message,
        });
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pastel-charcoal/40 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-pastel-cream-100 rounded-3xl border border-pastel-sand shadow-soft-lg p-6 sm:p-8 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-pastel-sand/50">
          <div>
            <h2 className="font-serif text-2xl font-bold text-pastel-charcoal">
              Settings & Wardrobe Sync
            </h2>
            <p className="text-xs text-pastel-muted mt-0.5">
              Sync between Safari & Brave, backup your closet, or configure Gemini AI.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-pastel-charcoal/60 hover:text-pastel-charcoal hover:bg-pastel-cream-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Safari & Brave Cross-Browser Sync */}
        <div className="space-y-3 bg-white p-5 rounded-2xl border border-pastel-sand shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-pastel-charcoal flex items-center gap-1.5">
              <SyncIcon className="w-4 h-4 text-purple-600" />
              <span>Cross-Browser Sync (Safari ⟷ Brave)</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pastel-cream-100 text-pastel-charcoal border border-pastel-sand">
              Current: {wardrobe.length} items
            </span>
          </div>

          <p className="text-[11px] text-pastel-muted leading-relaxed">
            Browsers keep their data in separate sandboxes. To sync your <strong>Safari</strong> and <strong>Brave</strong> closets:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={handlePushShared}
              disabled={isSyncing}
              className="p-3 rounded-xl bg-pastel-cream-50 hover:bg-pastel-cream-200 border border-pastel-sand text-left transition-all group"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-pastel-charcoal mb-0.5">
                <CloudUpload className="w-4 h-4 text-pastel-sage-dark group-hover:scale-110 transition-transform" />
                <span>1. Push to Shared Sync</span>
              </div>
              <p className="text-[10px] text-pastel-muted">
                Save this browser's {wardrobe.length} items to the local shared file.
              </p>
            </button>

            <button
              onClick={handlePullShared}
              disabled={isSyncing}
              className="p-3 rounded-xl bg-pastel-cream-50 hover:bg-pastel-cream-200 border border-pastel-sand text-left transition-all group"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-pastel-charcoal mb-0.5">
                <CloudDownload className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
                <span>2. Pull from Shared Sync</span>
              </div>
              <p className="text-[10px] text-pastel-muted">
                Load the shared closet into this browser.
              </p>
            </button>
          </div>

          {/* Backup File Export / Import */}
          <div className="pt-2 border-t border-pastel-sand/50 flex items-center justify-between gap-2">
            <button
              onClick={handleExportJSON}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white border border-pastel-sand hover:bg-pastel-cream-100 text-xs font-semibold text-pastel-charcoal shadow-2xs transition-all"
            >
              <Download className="w-3.5 h-3.5 text-pastel-sage-dark" />
              <span>Export File (JSON)</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white border border-pastel-sand hover:bg-pastel-cream-100 text-xs font-semibold text-pastel-charcoal shadow-2xs transition-all"
            >
              <Upload className="w-3.5 h-3.5 text-purple-600" />
              <span>Import File (JSON)</span>
            </button>
          </div>

          {/* Status Message */}
          {syncStatus && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                syncStatus.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : syncStatus.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              {syncStatus.type === 'success' ? (
                <Check className="w-4 h-4 flex-shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
              )}
              <span className="leading-snug">{syncStatus.text}</span>
            </div>
          )}
        </div>

        {/* Central Server Database & Activity Inspector */}
        <div className="space-y-4 bg-white p-5 rounded-2xl border border-pastel-sand shadow-soft">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-pastel-charcoal">
                Server Database & Activity Log
              </span>
            </div>
            <button
              onClick={loadServerStats}
              disabled={loadingServerStats}
              className="flex items-center gap-1 text-[11px] text-pastel-sage-dark font-semibold hover:underline"
            >
              <RefreshCw className={`w-3 h-3 ${loadingServerStats ? 'animate-spin' : ''}`} />
              <span>Refresh Log</span>
            </button>
          </div>

          <p className="text-[11px] text-pastel-muted leading-relaxed">
            All user accounts, logins, and wardrobe items are stored in your central local server database (<code className="bg-pastel-cream-100 px-1 rounded">src/data/db/</code>).
          </p>

          {/* Registered Accounts */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-pastel-muted flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <span>Registered Accounts ({serverUsers.length})</span>
            </span>

            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {serverUsers.map(u => (
                <div
                  key={u.id}
                  className="p-2.5 rounded-xl bg-pastel-cream-50 border border-pastel-sand/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-pastel-charcoal"
                      style={{ backgroundColor: u.avatarColor || '#D5E5DA' }}
                    >
                      {u.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <div className="font-bold text-pastel-charcoal">{u.name}</div>
                      <div className="text-[10px] text-pastel-muted">{u.email}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-white border border-pastel-sand text-pastel-charcoal">
                    {u.persona}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Live Activity / Login Stream */}
          <div className="space-y-2 pt-2 border-t border-pastel-sand/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-pastel-muted flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-purple-600" />
              <span>Recent Activity & Logins</span>
            </span>

            <div className="space-y-1.5 max-h-40 overflow-y-auto font-mono text-[11px]">
              {serverActivity.length === 0 ? (
                <div className="text-pastel-muted text-xs p-2">No activity logged yet.</div>
              ) : (
                serverActivity.slice(0, 8).map(act => (
                  <div
                    key={act.id}
                    className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 flex items-start justify-between gap-2"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 font-bold text-[10px]">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                          act.type === 'LOGIN' ? 'bg-emerald-100 text-emerald-800' :
                          act.type === 'REGISTER' ? 'bg-blue-100 text-blue-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {act.type}
                        </span>
                        <span className="text-slate-900">{act.email}</span>
                        <span className="text-[9px] text-slate-500 font-normal">({act.browser})</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{act.details}</div>
                    </div>
                    <span className="text-[9px] text-slate-400 whitespace-nowrap">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Terminal Hint */}
          <div className="flex items-center gap-2 text-[10px] text-slate-600 bg-slate-100 p-2.5 rounded-xl border border-slate-200 font-mono">
            <Terminal className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
            <span>Terminal: Real-time [PEHNO DB] logs are printing in your Vite console!</span>
          </div>
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
              Key format: Must start with <code className="bg-pastel-cream-200 px-1.5 py-0.5 rounded font-mono text-pastel-charcoal">AIzaSy...</code> from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-pastel-sage-dark font-semibold underline">Google AI Studio</a>. (Do not use OAuth Client IDs or Cloud Console service accounts).
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-pastel-muted pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-pastel-sage-dark" />
            <span>Key is stored in your local browser and sent directly to Google Gemini.</span>
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

