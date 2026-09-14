import React, { useState, useEffect } from 'react';
import { Sparkles, Heart, RefreshCw, ExternalLink, Key, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { GarmentItem, Outfit, Occasion } from '../types/wardrobe';
import { generateOccasionOutfits, generateItemOutfits } from '../lib/stylingEngine';
import { generateOutfitsWithGemini, styleItemWithGemini } from '../lib/geminiStylist';

interface StylistViewProps {
  wardrobe: GarmentItem[];
  preselectedItem?: GarmentItem | null;
  onSaveOutfitToFavorites: (outfit: Outfit) => void;
  isOutfitSaved: (outfitId: string) => boolean;
  onViewItemDetail: (garment: GarmentItem) => void;
  geminiApiKey?: string;
  onOpenSettings: () => void;
}

const OCCASIONS: { id: Occasion; label: string; icon: string; desc: string }[] = [
  { id: 'class', label: 'Class / Campus', icon: '🎒', desc: 'Comfortable, layered, collegiate chic' },
  { id: 'date', label: 'Date Night', icon: '🕯️', desc: 'Romantic silhouettes & subtle glow' },
  { id: 'brunch', label: 'Sunday Brunch', icon: '🥐', desc: 'Pastel radiance, breezy linens, sunlight' },
  { id: 'office', label: 'Office / Work', icon: '💼', desc: 'Tailored smart casual & clean lines' },
  { id: 'party', label: 'Party / Night Out', icon: '🪩', desc: 'High-contrast evening statements' },
  { id: 'casual', label: 'Casual Day Out', icon: '☕', desc: 'Effortless everyday staple combinations' },
  { id: 'weekend', label: 'Weekend Leisure', icon: '🌿', desc: 'Relaxed unstudied comfort' },
];

export const StylistView: React.FC<StylistViewProps> = ({
  wardrobe,
  preselectedItem,
  onSaveOutfitToFavorites,
  isOutfitSaved,
  onViewItemDetail,
  geminiApiKey,
  onOpenSettings,
}) => {
  const [activeMode, setActiveMode] = useState<'occasion' | 'item'>(preselectedItem ? 'item' : 'occasion');
  const [selectedOccasion, setSelectedOccasion] = useState<Occasion>('class');
  const [selectedGarment, setSelectedGarment] = useState<GarmentItem | null>(preselectedItem || wardrobe[0] || null);
  const [generatedOutfits, setGeneratedOutfits] = useState<Outfit[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSource, setGenerationSource] = useState<'gemini' | 'local'>('local');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasApiKey = Boolean(geminiApiKey && geminiApiKey.trim().length > 15);

  // Sync when preselectedItem updates
  useEffect(() => {
    if (preselectedItem) {
      setActiveMode('item');
      setSelectedGarment(preselectedItem);
    }
  }, [preselectedItem]);

  // Generate recommendations
  const generateFits = async () => {
    if (wardrobe.length === 0) return;
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      if (hasApiKey) {
        // Real Gemini 1.5 Flash Call!
        if (activeMode === 'occasion') {
          const geminiFits = await generateOutfitsWithGemini(wardrobe, selectedOccasion, geminiApiKey!);
          setGeneratedOutfits(geminiFits);
          setGenerationSource('gemini');
        } else if (selectedGarment) {
          const geminiFits = await styleItemWithGemini(selectedGarment, wardrobe, geminiApiKey!);
          setGeneratedOutfits(geminiFits);
          setGenerationSource('gemini');
        }
      } else {
        // Built-in Color Theory Engine with a soft delay for delightful styling animation
        await new Promise(r => setTimeout(r, 600));
        if (activeMode === 'occasion') {
          const fits = generateOccasionOutfits(wardrobe, selectedOccasion, 3);
          setGeneratedOutfits(fits);
          setGenerationSource('local');
        } else if (selectedGarment) {
          const fits = generateItemOutfits(selectedGarment, wardrobe);
          setGeneratedOutfits(fits);
          setGenerationSource('local');
        }
      }
    } catch (err: any) {
      console.warn('Gemini generation error, falling back to local engine:', err.message);
      setErrorMessage(`Gemini message: ${err.message}. Switched to local color theory engine.`);
      
      // Fallback to local
      if (activeMode === 'occasion') {
        setGeneratedOutfits(generateOccasionOutfits(wardrobe, selectedOccasion, 3));
      } else if (selectedGarment) {
        setGeneratedOutfits(generateItemOutfits(selectedGarment, wardrobe));
      }
      setGenerationSource('local');
    } finally {
      setIsGenerating(false);
    }
  };

  // Initial load
  useEffect(() => {
    generateFits();
  }, [activeMode, selectedOccasion, selectedGarment]);

  const handleSaveFavorite = (outfit: Outfit) => {
    onSaveOutfitToFavorites(outfit);
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#D5E5DA', '#FEF08A', '#E9D5FF', '#FCE7F3', '#BAE6FD'],
      });
    } catch (e) {}
  };

  const handleExternalSearch = (query: string) => {
    const url = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Top AI Engine Connection Banner */}
      <div className={`p-4 sm:p-5 rounded-3xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        hasApiKey
          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
          : 'bg-gradient-to-r from-pastel-butter-light via-pastel-cream-100 to-pastel-lavender-light border-pastel-sand'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-soft ${
            hasApiKey ? 'bg-emerald-500 text-white' : 'bg-white text-pastel-charcoal'
          }`}>
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif font-bold text-sm text-pastel-charcoal">
                {hasApiKey ? 'Google Gemini 2.5 Flash Connected' : 'Connect Gemini AI for Deep Stylist Recommendations'}
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                hasApiKey ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {hasApiKey ? 'Active AI' : 'Using Local Color Theory'}
              </span>
            </div>
            <p className="text-xs text-pastel-muted mt-0.5">
              {hasApiKey
                ? 'Gemini inspects your actual garment cuts, palettes, and fabrics to compose personalized fits.'
                : 'Pehno is currently using its built-in color harmony engine. Connect your free Google AI Studio key in 30 seconds.'}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenSettings}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold shadow-soft hover:shadow-soft-lg hover:scale-102 transition-all flex-shrink-0 ${
            hasApiKey
              ? 'bg-white text-emerald-800 border border-emerald-300'
              : 'bg-pastel-sage-dark text-white'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>{hasApiKey ? 'Manage Key' : 'Connect Free Gemini Key'}</span>
        </button>
      </div>

      {/* Header Banner */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pastel-lavender text-pastel-lavender-dark text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Fashion Matching & Styling Assistant</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-pastel-charcoal">
          Curated Outfit Generator
        </h1>
        <p className="text-xs sm:text-sm text-pastel-muted leading-relaxed">
          Generates cohesive outfits using color theory (crisp white + blue jeans, soft pastel complements, and tonal layering) paired with volume balance rules.
        </p>

        {/* Mode Selector Tabs */}
        <div className="inline-flex p-1 bg-pastel-cream-200 rounded-full border border-pastel-sand mt-2">
          <button
            onClick={() => setActiveMode('occasion')}
            className={`px-5 py-2 rounded-full text-xs font-bold tracking-wide transition-all ${
              activeMode === 'occasion'
                ? 'bg-white text-pastel-charcoal shadow-soft'
                : 'text-pastel-charcoal/70 hover:text-pastel-charcoal'
            }`}
          >
            🗓️ Pick for an Occasion
          </button>
          <button
            onClick={() => setActiveMode('item')}
            className={`px-5 py-2 rounded-full text-xs font-bold tracking-wide transition-all ${
              activeMode === 'item'
                ? 'bg-white text-pastel-charcoal shadow-soft'
                : 'text-pastel-charcoal/70 hover:text-pastel-charcoal'
            }`}
          >
            ✨ Style a Specific Piece
          </button>
        </div>
      </div>

      {/* Mode Controls */}
      {activeMode === 'occasion' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-pastel-muted">
              Choose Occasion to Style:
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {OCCASIONS.map(occ => (
              <button
                key={occ.id}
                onClick={() => setSelectedOccasion(occ.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                  selectedOccasion === occ.id
                    ? 'bg-pastel-charcoal text-white border-pastel-charcoal shadow-soft scale-102 font-bold'
                    : 'bg-white text-pastel-charcoal border-pastel-sand hover:bg-pastel-cream-100 shadow-soft'
                }`}
              >
                <span className="text-xl mb-1">{occ.icon}</span>
                <span className="text-xs font-medium">{occ.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Mode: Style a specific item */
        <div className="space-y-4 bg-white/80 p-5 rounded-3xl border border-pastel-sand shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-pastel-muted">
              Select any piece in your closet to style around:
            </span>
            <span className="text-[11px] font-semibold text-pastel-sage-dark">
              Selected: {selectedGarment?.name || 'None'}
            </span>
          </div>

          {/* Garment Carousel */}
          <div className="flex items-center gap-3 overflow-x-auto pb-3 scrollbar-none">
            {wardrobe.map(item => (
              <button
                key={item.id}
                onClick={() => setSelectedGarment(item)}
                className={`relative flex-shrink-0 w-24 rounded-2xl overflow-hidden border-2 transition-all group ${
                  selectedGarment?.id === item.id
                    ? 'border-pastel-charcoal scale-105 shadow-soft-lg'
                    : 'border-transparent opacity-75 hover:opacity-100'
                }`}
              >
                <div className="aspect-square bg-pastel-cream-100">
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-1.5 bg-white text-left">
                  <p className="text-[10px] font-bold text-pastel-charcoal truncate">{item.name}</p>
                  <p className="text-[9px] text-pastel-muted truncate capitalize">{item.colorName}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Prominent Primary "Generate Fits" Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-3xl bg-white border border-pastel-sand shadow-soft">
        <div className="flex items-center gap-2 text-xs text-pastel-muted">
          <span className="w-2 h-2 rounded-full bg-pastel-sage-dark" />
          <span>
            Target: <strong className="text-pastel-charcoal capitalize">{activeMode === 'occasion' ? selectedOccasion : selectedGarment?.name}</strong>
          </span>
          <span>•</span>
          <span>Engine: <strong className="text-pastel-charcoal">{generationSource === 'gemini' ? 'Gemini 2.5 Flash' : 'Built-in Color Theory'}</strong></span>
        </div>

        <button
          onClick={generateFits}
          disabled={isGenerating}
          className="w-full sm:w-auto px-6 py-3 rounded-full bg-gradient-to-r from-pastel-sage-medium via-pastel-sage-dark to-pastel-charcoal text-white font-bold text-xs shadow-soft hover:shadow-soft-lg hover:scale-102 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-pastel-butter" />
              <span>Styling Fits with {hasApiKey ? 'Gemini AI' : 'Color Theory'}...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-pastel-butter" />
              <span>{hasApiKey ? 'Generate AI Outfits with Gemini' : 'Generate Outfit Combinations'}</span>
            </>
          )}
        </button>
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Loading Skeleton during generation */}
      {isGenerating ? (
        <div className="text-center py-20 bg-white/70 rounded-3xl border border-pastel-sand p-8 space-y-4 animate-pulse">
          <div className="w-16 h-16 rounded-3xl bg-pastel-lavender/50 text-pastel-lavender-dark flex items-center justify-center mx-auto">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>
          <div>
            <h3 className="font-serif text-2xl font-bold text-pastel-charcoal">
              Analyzing Colors, Silhouettes & Accessories...
            </h3>
            <p className="text-xs text-pastel-muted max-w-md mx-auto mt-1">
              Matching your closet pieces for {selectedOccasion.toUpperCase()} using color harmony rules and proportional balance.
            </p>
          </div>
        </div>
      ) : (
        /* Generated Outfits Showcase */
        <div className="space-y-8">
          {generatedOutfits.map((outfit, index) => {
            const isSaved = isOutfitSaved(outfit.id);

            // Inviolable fashion rule: A dress is a 1-piece outfit. Never render with top or bottom!
            const dressItem = outfit.dress || (outfit.top?.category === 'dresses' ? outfit.top : (outfit.bottom?.category === 'dresses' ? outfit.bottom : undefined));
            const topItem = dressItem ? undefined : outfit.top;
            const bottomItem = dressItem ? undefined : outfit.bottom;

            const outfitGarments = [
              topItem,
              bottomItem,
              dressItem,
              outfit.outerwear,
              outfit.shoes,
              outfit.bag,
              outfit.accessory,
            ].filter((g): g is GarmentItem => Boolean(g));

            return (
              <div
                key={outfit.id}
                className="rounded-3xl bg-white border border-pastel-sand shadow-soft hover:shadow-soft-lg transition-all overflow-hidden p-6 sm:p-8"
              >
                {/* Outfit Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-pastel-sand/60">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-1 rounded-full bg-pastel-sage text-pastel-sage-dark text-[11px] font-bold tracking-wider uppercase">
                        Look #{index + 1}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-pastel-butter text-pastel-butter-dark text-[11px] font-bold">
                        {outfit.colorHarmonyType}
                      </span>
                      <span className="text-xs text-pastel-muted">
                        • {outfit.vibe.toUpperCase()}
                      </span>
                    </div>
                    <h2 className="font-serif text-2xl font-bold text-pastel-charcoal mt-1.5">
                      {outfit.title}
                    </h2>
                    <p className="text-xs text-pastel-muted mt-0.5">
                      {outfit.description}
                    </p>
                  </div>

                  {/* Compatibility Score & Save */}
                  <div className="flex items-center gap-3">
                    <div className="px-4 py-2 rounded-2xl bg-pastel-cream-100 border border-pastel-sand flex flex-col items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-pastel-muted">Match Score</span>
                      <span className="font-serif text-xl font-bold text-pastel-sage-dark">
                        {outfit.compatibilityScore}%
                      </span>
                    </div>

                    <button
                      onClick={() => handleSaveFavorite(outfit)}
                      className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs shadow-soft transition-all ${
                        isSaved
                          ? 'bg-rose-50 text-rose-600 border border-rose-200'
                          : 'bg-pastel-charcoal hover:bg-pastel-charcoal/90 text-white hover:scale-102'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-500 text-rose-500' : ''}`} />
                      <span>{isSaved ? 'Saved in Favorites' : 'Save Fit'}</span>
                    </button>
                  </div>
                </div>

                {/* Garment Grid (Closet Pieces in this outfit) */}
                <div className="mt-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-pastel-muted mb-3">
                    Outfit Components from Your Wardrobe ({outfitGarments.length} Pieces)
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {outfitGarments.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => onViewItemDetail(item)}
                        className="group cursor-pointer rounded-2xl bg-pastel-cream-50 border border-pastel-sand p-2.5 hover:border-pastel-sage-medium transition-all shadow-sm"
                      >
                        <div className="aspect-square rounded-xl overflow-hidden bg-pastel-cream-200 mb-2 relative">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <span
                            className="absolute bottom-1.5 left-1.5 w-2.5 h-2.5 rounded-full border border-black/20"
                            style={{ backgroundColor: item.colorHex }}
                          />
                        </div>
                        <span className="text-[9px] uppercase font-bold tracking-wider text-pastel-muted block">
                          {item.category}
                        </span>
                        <p className="text-xs font-semibold text-pastel-charcoal line-clamp-1 group-hover:text-pastel-sage-dark">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-pastel-muted line-clamp-1">
                          {item.colorName}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Why This Works & Styling Tips */}
                <div className="mt-6 p-4 rounded-2xl bg-pastel-cream-100/70 border border-pastel-sand/60">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-pastel-charcoal flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Why This Outfit Works</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {outfit.stylingNotes.map((note, nIdx) => (
                      <li key={nIdx} className="text-xs text-pastel-charcoal/80 flex items-start gap-2">
                        <span className="text-pastel-sage-dark font-bold">•</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* External Suggestions / "Complete the Look" (Missing Pieces) */}
                {outfit.externalSuggestions && outfit.externalSuggestions.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-pastel-sand/60">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-pastel-charcoal flex items-center gap-1.5">
                          <span>✨ Complete the Look (Recommended Additions)</span>
                        </h4>
                        <p className="text-[11px] text-pastel-muted mt-0.5">
                          Elevate this fit with missing pieces not currently in your wardrobe:
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {outfit.externalSuggestions.map((sugg) => (
                        <div
                          key={sugg.id}
                          className="p-3.5 rounded-2xl bg-gradient-to-r from-pastel-butter-light to-pastel-cream-100 border border-pastel-sand/70 flex items-start justify-between gap-3"
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-black/10 flex-shrink-0"
                                style={{ backgroundColor: sugg.colorHex }}
                              />
                              <span className="text-xs font-bold text-pastel-charcoal">
                                {sugg.name}
                              </span>
                              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-md bg-white text-pastel-muted font-semibold">
                                {sugg.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-pastel-muted leading-snug">
                              {sugg.reasoning}
                            </p>
                          </div>

                          <button
                            onClick={() => handleExternalSearch(sugg.searchQuery)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-pastel-cream-200 border border-pastel-sand text-[10px] font-bold text-pastel-charcoal whitespace-nowrap shadow-xs hover:shadow-soft transition-all flex-shrink-0"
                            title="Find similar pieces online"
                          >
                            <span>Inspo / Shop</span>
                            <ExternalLink className="w-3 h-3 text-pastel-muted" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
