import React, { useState, useEffect } from 'react';
import { X, Server, Users, Activity, Trash2, ExternalLink, RefreshCw, Database } from 'lucide-react';
import { User } from '../types/auth';
import { fetchServerUsers, fetchServerActivity, deleteServerUser, clearServerActivity, ServerActivity } from '../lib/auth';

interface BackendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackendModal: React.FC<BackendModalProps> = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [activity, setActivity] = useState<ServerActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'activity'>('users');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [u, a] = await Promise.all([fetchServerUsers(), fetchServerActivity()]);
      setUsers(u);
      setActivity(a);
    } catch (e) {
      console.error('Failed to load backend data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Delete user "${name || id}"?`)) return;
    const ok = await deleteServerUser(id);
    if (ok) {
      loadData();
    } else {
      alert('Could not delete user.');
    }
  };

  const handleClearActivity = async () => {
    if (!confirm('Clear all audit logs?')) return;
    const ok = await clearServerActivity();
    if (ok) {
      loadData();
    }
  };

  const timeAgo = (ts?: number) => {
    if (!ts) return 'Never';
    const diff = Math.floor((Date.now() - Number(ts)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(Number(ts)).toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pastel-charcoal/40 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col bg-white rounded-3xl border border-pastel-sand shadow-soft-lg overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-pastel-sand/60 flex items-center justify-between bg-pastel-cream-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pastel-sage-light flex items-center justify-center text-pastel-sage-dark shadow-xs">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-xl font-bold text-pastel-charcoal">Backend Control Center</h2>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Port 5001 Active
                </span>
              </div>
              <p className="text-xs text-pastel-muted">Live view of registered accounts, login history & local database</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="http://localhost:5001"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pastel-cream-200 hover:bg-pastel-cream-300 text-xs font-semibold text-pastel-charcoal transition-all border border-pastel-sand"
            >
              <span>Full Web Dashboard</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-pastel-charcoal/60 hover:text-pastel-charcoal hover:bg-pastel-cream-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Database Notice Card */}
        <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-pastel-cream-100/80 border border-pastel-sand/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-pastel-charcoal">
            <Database className="w-4 h-4 text-pastel-sage-dark flex-shrink-0" />
            <div>
              <span className="font-bold">Database File: </span>
              <code className="bg-white px-1.5 py-0.5 rounded border border-pastel-sand text-[11px] font-mono text-pastel-charcoal">
                src/data/db/users.json
              </code>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={isLoading}
              className="text-xs font-semibold text-pastel-sage-dark hover:underline flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <a
              href="http://localhost:5001/api/auth/users"
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-semibold text-pastel-charcoal/70 hover:text-pastel-charcoal underline"
            >
              View Raw JSON
            </a>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="px-6 pt-4 flex items-center justify-between border-b border-pastel-sand/50">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('users')}
              className={`pb-3 px-1 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
                activeTab === 'users'
                  ? 'border-pastel-sage-dark text-pastel-charcoal'
                  : 'border-transparent text-pastel-muted hover:text-pastel-charcoal'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Registered Accounts ({users.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`pb-3 px-1 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
                activeTab === 'activity'
                  ? 'border-pastel-sage-dark text-pastel-charcoal'
                  : 'border-transparent text-pastel-muted hover:text-pastel-charcoal'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Audit Log & Logins ({activity.length})</span>
            </button>
          </div>

          {activeTab === 'activity' && activity.length > 0 && (
            <button
              onClick={handleClearActivity}
              className="text-[11px] font-semibold text-rose-500 hover:text-rose-700 pb-3"
            >
              Clear Log
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 max-h-[50vh]">
          {activeTab === 'users' ? (
            <div className="space-y-2">
              {users.length === 0 ? (
                <div className="py-12 text-center text-xs text-pastel-muted">
                  No accounts found in database. Create an account via Sign In / Join.
                </div>
              ) : (
                users.map(u => (
                  <div
                    key={u.id}
                    className="p-3.5 rounded-2xl bg-pastel-cream-50 border border-pastel-sand/80 flex items-center justify-between gap-3 text-xs hover:bg-pastel-cream-100/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-pastel-charcoal shadow-xs"
                        style={{ backgroundColor: u.avatarColor || '#D5E5DA' }}
                      >
                        {(u.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-pastel-charcoal">{u.name}</span>
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-white border border-pastel-sand text-pastel-charcoal/80">
                            {u.persona}
                          </span>
                        </div>
                        <div className="text-[11px] text-pastel-muted font-mono">{u.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div className="hidden sm:block text-[11px]">
                        <div className="text-pastel-charcoal/80">
                          Active: <span className="font-semibold">{timeAgo(u.lastLoginAt)}</span>
                        </div>
                        <div className="text-[10px] text-pastel-muted">
                          Created: {timeAgo(u.createdAt)}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteUser(u.id, u.name)}
                        className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete this user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-2 font-mono text-xs">
              {activity.length === 0 ? (
                <div className="py-12 text-center text-xs font-sans text-pastel-muted">
                  No login or registration activity logged yet.
                </div>
              ) : (
                activity.map(act => {
                  const isLogin = act.type === 'LOGIN';
                  const isReg = act.type === 'REGISTER';
                  const badgeColor = isLogin
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : isReg
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-purple-100 text-purple-800 border-purple-200';

                  return (
                    <div
                      key={act.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border ${badgeColor}`}>
                            {act.type}
                          </span>
                          <span className="font-bold text-slate-900">{act.email}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-sans">{timeAgo(act.timestamp)}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 font-sans flex items-center justify-between">
                        <span>{act.details}</span>
                        <span className="text-[10px] text-slate-400">{act.browser}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-pastel-sand/50 bg-pastel-cream-50 flex items-center justify-between text-xs">
          <span className="text-pastel-muted text-[11px]">
            Backend Server: <code className="text-pastel-charcoal font-semibold">http://localhost:5001</code>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-pastel-charcoal text-white font-bold text-xs shadow-soft hover:bg-pastel-charcoal/80 transition-all"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
