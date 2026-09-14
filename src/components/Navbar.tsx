import React, { useState } from 'react';
import { Sparkles, Heart, Shirt, Palette, Settings, User as UserIcon, LogOut, Key, Server, Dices } from 'lucide-react';
import { User } from '../types/auth';
import { isCreatorUser } from '../lib/auth';

interface NavbarProps {
  activeTab: 'closet' | 'stylist' | 'studio' | 'favorites' | 'spin';
  setActiveTab: (tab: 'closet' | 'stylist' | 'studio' | 'favorites' | 'spin') => void;
  closetCount: number;
  favoritesCount: number;
  onOpenSettings: () => void;
  onOpenBackend: () => void;
  currentUser: User | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
  hasGeminiKey: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  closetCount,
  favoritesCount,
  onOpenSettings,
  onOpenBackend,
  currentUser,
  onOpenAuth,
  onSignOut,
  hasGeminiKey,
}) => {
  const [profileDropdown, setProfileDropdown] = useState(false);
  const isCreator = isCreatorUser(currentUser);

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-pastel-sand/60 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Brand */}
          <div 
            onClick={() => setActiveTab('closet')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-pastel-sage to-pastel-lavender flex items-center justify-center shadow-soft text-pastel-charcoal transform transition-transform group-hover:scale-105">
              <Sparkles className="w-6 h-6 text-pastel-charcoal" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-2xl font-bold tracking-tight text-pastel-charcoal">
                  Pehno
                </span>
                <span className="text-xs tracking-widest text-pastel-muted uppercase font-medium">
                  पहनो
                </span>
              </div>
              <p className="text-[11px] text-pastel-muted tracking-wide">
                Smart AI Wardrobe & Stylist
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 p-1.5 rounded-full bg-pastel-cream-200/80 border border-pastel-sand/50 shadow-inner">
            <button
              onClick={() => setActiveTab('closet')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'closet'
                  ? 'bg-white text-pastel-charcoal shadow-soft'
                  : 'text-pastel-charcoal/70 hover:text-pastel-charcoal hover:bg-white/40'
              }`}
            >
              <Shirt className="w-4 h-4" />
              <span>Closet</span>
              <span className="ml-0.5 px-1.5 py-0.5 text-[10px] rounded-full bg-pastel-sage-light text-pastel-sage-dark font-bold">
                {closetCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('stylist')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'stylist'
                  ? 'bg-white text-pastel-charcoal shadow-soft'
                  : 'text-pastel-charcoal/70 hover:text-pastel-charcoal hover:bg-white/40'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>AI Stylist</span>
            </button>

            <button
              onClick={() => setActiveTab('studio')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'studio'
                  ? 'bg-white text-pastel-charcoal shadow-soft'
                  : 'text-pastel-charcoal/70 hover:text-pastel-charcoal hover:bg-white/40'
              }`}
            >
              <Palette className="w-4 h-4 text-purple-500" />
              <span>Mix & Match</span>
            </button>

            <button
              onClick={() => setActiveTab('spin')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'spin'
                  ? 'bg-white text-pastel-charcoal shadow-soft'
                  : 'text-pastel-charcoal/70 hover:text-pastel-charcoal hover:bg-white/40'
              }`}
            >
              <Dices className="w-4 h-4 text-amber-500" />
              <span>Spin Wheel</span>
            </button>

            <button
              onClick={() => setActiveTab('favorites')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'favorites'
                  ? 'bg-white text-pastel-charcoal shadow-soft'
                  : 'text-pastel-charcoal/70 hover:text-pastel-charcoal hover:bg-white/40'
              }`}
            >
              <Heart className={`w-4 h-4 ${favoritesCount > 0 ? 'text-rose-500 fill-rose-500' : 'text-pastel-charcoal/70'}`} />
              <span>Favorites</span>
              {favoritesCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 text-[10px] rounded-full bg-pastel-rose text-pastel-rose-dark font-bold">
                  {favoritesCount}
                </span>
              )}
            </button>
          </nav>

          {/* Right Action Area */}
          <div className="flex items-center gap-2.5">
            
            {/* AI Status Badge */}
            <button
              onClick={onOpenSettings}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                hasGeminiKey
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
              title="Click to configure Gemini API Key"
            >
              <span className={`w-2 h-2 rounded-full ${hasGeminiKey ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span>{hasGeminiKey ? 'Gemini AI Active' : 'Connect Gemini AI'}</span>
            </button>

            {/* User Profile / Auth Button */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setProfileDropdown(!profileDropdown)}
                  className="flex items-center gap-2 p-1.5 pr-3 rounded-full bg-white border border-pastel-sand shadow-soft hover:shadow-soft-lg transition-all"
                  title={currentUser.email}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-pastel-charcoal shadow-xs"
                    style={{ backgroundColor: currentUser.avatarColor || '#D5E5DA' }}
                  >
                    {(currentUser.email || currentUser.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-pastel-charcoal max-w-[150px] truncate">
                    {currentUser.email || currentUser.name}
                  </span>
                </button>

                {/* Profile Dropdown */}
                {profileDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-pastel-sand shadow-soft-lg p-2.5 z-50 animate-fadeIn">
                    <div className="px-2 py-1.5 border-b border-pastel-sand/50 mb-1.5">
                      <p className="text-xs font-bold text-pastel-charcoal truncate" title={currentUser.email}>
                        {currentUser.email}
                      </p>
                      {currentUser.name && currentUser.name !== currentUser.email && (
                        <p className="text-[10px] text-pastel-muted truncate">{currentUser.name}</p>
                      )}
                      <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-pastel-sage-light text-pastel-sage-dark">
                        {currentUser.persona}
                      </span>
                    </div>

                    {isCreator && (
                      <button
                        onClick={() => {
                          setProfileDropdown(false);
                          onOpenBackend();
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-xl text-xs text-pastel-charcoal hover:bg-pastel-cream-100 flex items-center gap-2"
                      >
                        <Server className="w-3.5 h-3.5 text-pastel-sage-dark" />
                        <span>Backend & Database</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setProfileDropdown(false);
                        onOpenSettings();
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-xl text-xs text-pastel-charcoal hover:bg-pastel-cream-100 flex items-center gap-2"
                    >
                      <Key className="w-3.5 h-3.5 text-pastel-muted" />
                      <span>API Settings</span>
                    </button>

                    <button
                      onClick={() => {
                        setProfileDropdown(false);
                        onOpenAuth();
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-xl text-xs text-pastel-charcoal hover:bg-pastel-cream-100 flex items-center gap-2"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-pastel-muted" />
                      <span>Switch Account</span>
                    </button>

                    <button
                      onClick={() => {
                        setProfileDropdown(false);
                        onSignOut();
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-xl text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-pastel-charcoal text-white hover:bg-pastel-charcoal/80 text-xs font-bold shadow-soft hover:shadow-soft-lg transition-all"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Sign In / Join</span>
              </button>
            )}

            {/* Backend Control Button (Creator Only) */}
            {isCreator && (
              <button
                onClick={onOpenBackend}
                title="Creator Control: Backend Server, Users & Database"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-pastel-charcoal/80 bg-white/80 hover:bg-white border border-pastel-sand shadow-2xs hover:shadow-soft transition-all"
              >
                <Server className="w-3.5 h-3.5 text-pastel-sage-dark" />
                <span className="hidden sm:inline text-[11px] font-bold">Backend</span>
              </button>
            )}

            {/* Settings Icon */}
            <button
              onClick={onOpenSettings}
              title="Settings & AI Model"
              className="p-2.5 rounded-full text-pastel-charcoal/70 hover:text-pastel-charcoal hover:bg-pastel-cream-200/80 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-pastel-sand/40">
          <button
            onClick={() => setActiveTab('closet')}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-3 rounded-xl ${
              activeTab === 'closet' ? 'text-pastel-charcoal font-bold' : 'text-pastel-charcoal/60'
            }`}
          >
            <Shirt className="w-4 h-4" />
            <span>Closet ({closetCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('stylist')}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-3 rounded-xl ${
              activeTab === 'stylist' ? 'text-pastel-charcoal font-bold' : 'text-pastel-charcoal/60'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Stylist</span>
          </button>
          <button
            onClick={() => setActiveTab('studio')}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-3 rounded-xl ${
              activeTab === 'studio' ? 'text-pastel-charcoal font-bold' : 'text-pastel-charcoal/60'
            }`}
          >
            <Palette className="w-4 h-4 text-purple-500" />
            <span>Mix Studio</span>
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium py-1 px-3 rounded-xl ${
              activeTab === 'favorites' ? 'text-pastel-charcoal font-bold' : 'text-pastel-charcoal/60'
            }`}
          >
            <Heart className={`w-4 h-4 ${favoritesCount > 0 ? 'text-rose-500 fill-rose-500' : ''}`} />
            <span>Favorites</span>
          </button>
        </div>
      </div>
    </header>
  );
};
