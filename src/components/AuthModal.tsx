import React, { useState } from 'react';
import { X, Sparkles, LogIn, UserPlus, Lock, Mail, User as UserIcon, RefreshCw } from 'lucide-react';
import { User, StylePersona } from '../types/auth';
import { signIn, signUp } from '../lib/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

const PERSONAS: { id: StylePersona; label: string; icon: string; desc: string }[] = [
  { id: 'romantic', label: 'Pastel Romantic', icon: '🌸', desc: 'Soft pastel tones, silk slips & delicate florals' },
  { id: 'minimalist', label: 'Quiet Luxury Minimalist', icon: '✨', desc: 'Clean lines, oat cream palettes & timeless basics' },
  { id: 'streetwear', label: 'Urban Streetwear', icon: '👟', desc: 'Relaxed denim, oversized tees & retro kicks' },
  { id: 'preppy', label: 'Old Money Preppy', icon: '🏛️', desc: 'Pleated skirts, tailored blazers & chunky loafers' },
  { id: 'casual', label: 'Effortless Daily Casual', icon: '☕', desc: 'White top, vintage blue jeans & comfort' },
];

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [persona, setPersona] = useState<StylePersona>('romantic');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    try {
      if (tab === 'signup') {
        if (!cleanName) throw new Error('Please enter your name.');
        if (!cleanEmail) throw new Error('Please enter your email.');
        if (cleanPassword.length < 8) throw new Error('Password must be at least 8 characters.');
        const user = await signUp(cleanName, cleanEmail, cleanPassword, persona);
        onSuccess(user);
        onClose();
      } else {
        if (!cleanEmail || !cleanPassword) throw new Error('Please enter both email and password.');
        const user = await signIn(cleanEmail, cleanPassword);
        onSuccess(user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const user = await signIn('demo@pehno.style', 'password123');
      onSuccess(user);
      onClose();
    } catch (e) {
      try {
        const user = await signUp('Demo User', 'demo@pehno.style', 'password123', 'romantic');
        onSuccess(user);
        onClose();
      } catch (err: any) {
        setError(err.message || 'Demo login failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pastel-charcoal/40 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-pastel-cream-100 rounded-3xl border border-pastel-sand shadow-soft-lg p-6 sm:p-8">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-pastel-charcoal/60 hover:text-pastel-charcoal hover:bg-pastel-cream-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pastel-sage to-pastel-lavender flex items-center justify-center shadow-soft mx-auto text-pastel-charcoal">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-pastel-charcoal">
            {tab === 'signin' ? 'Welcome Back to Pehno' : 'Create Your Wardrobe'}
          </h2>
          <p className="text-xs text-pastel-muted">
            {tab === 'signin'
              ? 'Sign in to access your saved fits, favorites, and digital closet.'
              : 'Join Pehno for AI-curated outfits and personal styling.'}
          </p>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-pastel-cream-200 rounded-2xl border border-pastel-sand mb-5">
          <button
            type="button"
            onClick={() => { setTab('signin'); setError(null); }}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'signin' ? 'bg-white text-pastel-charcoal shadow-soft' : 'text-pastel-charcoal/70'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('signup'); setError(null); }}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'signup' ? 'bg-white text-pastel-charcoal shadow-soft' : 'text-pastel-charcoal/70'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium space-y-1.5 animate-shake">
              <p>{error}</p>
              {error.includes('already exists') && (
                <button
                  type="button"
                  onClick={() => { setTab('signin'); setError(null); }}
                  className="text-[11px] font-bold text-pastel-sage-dark hover:underline flex items-center gap-1 mt-1"
                >
                  <span>Already registered? Click here to Sign In →</span>
                </button>
              )}
              {error.includes('No account found') && (
                <button
                  type="button"
                  onClick={() => { setTab('signup'); setError(null); }}
                  className="text-[11px] font-bold text-pastel-sage-dark hover:underline flex items-center gap-1 mt-1"
                >
                  <span>New user? Click here to Create an Account →</span>
                </button>
              )}
              {error.includes('password') && (
                <p className="text-[10px] text-rose-500 font-normal">
                  Demo hint: Default demo password is <code className="bg-rose-100 px-1 py-0.5 rounded font-mono font-bold">password123</code>
                </p>
              )}
            </div>
          )}

          {tab === 'signup' && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-pastel-muted block mb-1">
                Your Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-pastel-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-pastel-sand text-xs text-pastel-charcoal focus:outline-none focus:border-pastel-sage-medium"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-pastel-muted block mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-pastel-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                placeholder="username@gmail.com"
                value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-pastel-sand text-xs text-pastel-charcoal focus:outline-none focus:border-pastel-sage-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-pastel-muted block mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-pastel-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                placeholder="••••••••"
                value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                  required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-pastel-sand text-xs text-pastel-charcoal focus:outline-none focus:border-pastel-sage-medium"
              />
            </div>
          </div>

          {/* Style Persona (Sign Up Only) */}
          {tab === 'signup' && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-pastel-muted block mb-1.5">
                Select Your Style Aesthetic
              </label>
              <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {PERSONAS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPersona(p.id)}
                    className={`p-2 text-left rounded-xl border flex items-center gap-2.5 transition-all ${
                      persona === p.id
                        ? 'bg-pastel-sage-light border-pastel-sage-dark text-pastel-charcoal font-bold'
                        : 'bg-white border-pastel-sand text-pastel-charcoal/80 hover:bg-pastel-cream-50'
                    }`}
                  >
                    <span className="text-base">{p.icon}</span>
                    <div className="overflow-hidden">
                      <div className="text-xs font-semibold">{p.label}</div>
                      <div className="text-[10px] text-pastel-muted truncate">{p.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-2xl bg-pastel-sage-dark text-white font-bold text-xs shadow-soft hover:shadow-soft-lg hover:scale-101 active:scale-98 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Connecting to Server...</span>
              </>
            ) : (
              <>
                {tab === 'signin' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                <span>{tab === 'signin' ? 'Sign In to Wardrobe' : 'Complete Registration'}</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Login */}
        <div className="mt-5 pt-4 border-t border-pastel-sand/50 text-center">
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            className="text-xs font-semibold text-pastel-sage-dark hover:underline flex items-center justify-center gap-1.5 mx-auto"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Quick Demo: Sign In as demo@pehno.style</span>
          </button>
        </div>
      </div>
    </div>
  );
};
