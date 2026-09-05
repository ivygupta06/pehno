import React, { useState, useMemo } from 'react';
import { Sparkles, Heart, Shuffle, Trash2, Plus, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { GarmentCategory, GarmentItem, Outfit, Occasion } from '../types/wardrobe';
import { calculateCompatibilityScore } from '../lib/stylingEngine';

interface OutfitStudioProps {
  wardrobe: GarmentItem[];
  onSaveOutfit: (outfit: Outfit) => void;
}

export const OutfitStudio: React.FC<OutfitStudioProps> = ({
  wardrobe,
  onSaveOutfit,
}) => {
  const [selectedTop, setSelectedTop] = useState<GarmentItem | undefined>(wardrobe.find(i => i.category === 'tops'));
  const [selectedBottom, setSelectedBottom] = useState<GarmentItem | undefined>(wardrobe.find(i => i.category === 'bottoms'));
  const [selectedOuter, setSelectedOuter] = useState<GarmentItem | undefined>(undefined);
  const [selectedShoe, setSelectedShoe] = useState<GarmentItem | undefined>(wardrobe.find(i => i.category === 'shoes'));
  const [selectedBag, setSelectedBag] = useState<GarmentItem | undefined>(wardrobe.find(i => i.category === 'bags'));
  const [selectedAcc, setSelectedAcc] = useState<GarmentItem | undefined>(wardrobe.find(i => i.category === 'accessories'));
  
  // Custom outfit naming
  const [customTitle, setCustomTitle] = useState('My Curated Pastel Fit');
  const [targetOccasion, setTargetOccasion] = useState<Occasion>('class');

  // Slot selector drawer state
  const [pickingCategory, setPickingCategory] = useState<GarmentCategory | null>(null);

  // Real-time evaluation
  const evaluation = useMemo(() => {
    const items = [selectedTop, selectedBottom, selectedOuter, selectedShoe, selectedBag, selectedAcc];
    return calculateCompatibilityScore(items, targetOccasion);
  }, [selectedTop, selectedBottom, selectedOuter, selectedShoe, selectedBag, selectedAcc, targetOccasion]);

  // Randomize / Surprise me
  const handleRandomize = () => {
    const tops = wardrobe.filter(i => i.category === 'tops');
    const bottoms = wardrobe.filter(i => i.category === 'bottoms');
    const outers = wardrobe.filter(i => i.category === 'outerwear');
    const shoes = wardrobe.filter(i => i.category === 'shoes');
    const bags = wardrobe.filter(i => i.category === 'bags');
    const accs = wardrobe.filter(i => i.category === 'accessories');

    if (tops.length > 0) setSelectedTop(tops[Math.floor(Math.random() * tops.length)]);
    if (bottoms.length > 0) setSelectedBottom(bottoms[Math.floor(Math.random() * bottoms.length)]);
    if (shoes.length > 0) setSelectedShoe(shoes[Math.floor(Math.random() * shoes.length)]);
    if (bags.length > 0) setSelectedBag(bags[Math.floor(Math.random() * bags.length)]);
    if (accs.length > 0) setSelectedAcc(accs[Math.floor(Math.random() * accs.length)]);
    setSelectedOuter(Math.random() > 0.5 && outers.length > 0 ? outers[Math.floor(Math.random() * outers.length)] : undefined);
  };

  const handleClear = () => {
    setSelectedTop(undefined);
    setSelectedBottom(undefined);
    setSelectedOuter(undefined);
    setSelectedShoe(undefined);
    setSelectedBag(undefined);
    setSelectedAcc(undefined);
  };

  const handleSaveFit = () => {
    const newOutfit: Outfit = {
      id: `custom-fit-${Date.now()}`,
      title: customTitle || 'Custom Look',
      description: `${evaluation.harmonyType} • Styled in Studio`,
      top: selectedTop,
      bottom: selectedBottom,
      outerwear: selectedOuter,
      shoes: selectedShoe,
      bag: selectedBag,
      accessory: selectedAcc,
      occasion: targetOccasion,
      compatibilityScore: evaluation.score,
      colorHarmonyType: evaluation.harmonyType,
      stylingNotes: evaluation.reasons,
      vibe: 'chic',
      createdAt: Date.now(),
    };

    onSaveOutfit(newOutfit);

    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#D5E5DA', '#FEF08A', '#E9D5FF', '#FCE7F3'],
      });
    } catch (e) {}
  };

  const renderSlotCard = (
    category: GarmentCategory,
    item: GarmentItem | undefined,
    setItem: (item: GarmentItem | undefined) => void,
    title: string,
    icon: string
  ) => {
    return (
      <div className="relative group rounded-3xl bg-white border border-pastel-sand p-4 shadow-soft hover:shadow-soft-lg transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between pb-2 border-b border-pastel-sand/40">
          <span className="text-xs font-bold uppercase tracking-wider text-pastel-muted flex items-center gap-1.5">
            <span>{icon}</span>
            <span>{title}</span>
          </span>
          {item && (
            <button
              onClick={() => setItem(undefined)}
              className="p-1 text-pastel-muted hover:text-pastel-charcoal transition-colors"
              title="Remove piece"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Garment Image or Empty placeholder */}
        <div className="my-3">
          {item ? (
            <div
              onClick={() => setPickingCategory(category)}
              className="cursor-pointer space-y-2"
            >
              <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-pastel-cream-100 relative group-hover:scale-102 transition-transform">
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                <span
                  className="absolute bottom-2 left-2 w-3 h-3 rounded-full border border-black/20"
                  style={{ backgroundColor: item.colorHex }}
                />
              </div>
              <div>
                <p className="text-xs font-bold text-pastel-charcoal truncate">{item.name}</p>
                <p className="text-[10px] text-pastel-muted capitalize truncate">{item.colorName}</p>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setPickingCategory(category)}
              className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-pastel-sand hover:border-pastel-sage-medium bg-pastel-cream-50 flex flex-col items-center justify-center gap-2 text-pastel-muted hover:text-pastel-charcoal transition-all"
            >
              <Plus className="w-6 h-6 text-pastel-sage-dark" />
              <span className="text-xs font-semibold">Select {title}</span>
            </button>
          )}
        </div>

        <button
          onClick={() => setPickingCategory(category)}
          className="w-full py-1.5 px-3 rounded-xl bg-pastel-cream-100 hover:bg-pastel-cream-200 text-pastel-charcoal text-[11px] font-semibold transition-colors"
        >
          {item ? 'Change' : '+ Add'}
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Studio Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-pastel-sand/60">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pastel-sage text-pastel-sage-dark text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Styling Studio</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-pastel-charcoal">
            Mix & Match Outfit Canvas
          </h1>
          <p className="text-xs sm:text-sm text-pastel-muted mt-1">
            Swap individual tops, bottoms, shoes, bags, and accessories to compose your dream fit with live color harmony feedback.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleRandomize}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-pastel-sand text-xs font-bold text-pastel-charcoal hover:bg-pastel-cream-100 shadow-soft transition-all"
          >
            <Shuffle className="w-4 h-4 text-purple-600" />
            <span>Surprise Me</span>
          </button>

          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-pastel-sand text-xs font-semibold text-pastel-muted hover:text-pastel-charcoal shadow-soft transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear</span>
          </button>

          <button
            onClick={handleSaveFit}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-pastel-charcoal hover:bg-pastel-charcoal/90 text-white text-xs font-bold shadow-soft hover:shadow-soft-lg hover:scale-102 transition-all"
          >
            <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
            <span>Save This Fit</span>
          </button>
        </div>
      </div>

      {/* Live Compatibility Meter Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-pastel-butter-light via-pastel-cream-100 to-pastel-lavender-light border border-pastel-sand shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-pastel-muted">
              Live Harmony Analysis:
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white text-pastel-charcoal font-bold text-xs shadow-xs">
              {evaluation.harmonyType}
            </span>
          </div>
          <ul className="text-xs text-pastel-charcoal/80 space-y-1 pt-1">
            {evaluation.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-pastel-sage-dark font-bold">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Score Ring / Badge */}
        <div className="flex items-center gap-4 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-pastel-sand shadow-soft flex-shrink-0">
          <div className="text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-pastel-muted block">Match Score</span>
            <span className="font-serif text-3xl font-bold text-pastel-sage-dark">
              {evaluation.score}%
            </span>
          </div>
          <div className="h-10 w-[1px] bg-pastel-sand" />
          <div className="flex flex-col">
            <label className="text-[10px] font-bold uppercase tracking-wider text-pastel-muted mb-1">Fit For:</label>
            <select
              value={targetOccasion}
              onChange={(e) => setTargetOccasion(e.target.value as Occasion)}
              className="text-xs font-semibold py-1 px-2 rounded-xl bg-pastel-cream-100 border border-pastel-sand text-pastel-charcoal focus:outline-none"
            >
              <option value="class">🎒 Class</option>
              <option value="date">🕯️ Date Night</option>
              <option value="brunch">🥐 Brunch</option>
              <option value="office">💼 Office</option>
              <option value="party">🪩 Party</option>
              <option value="casual">☕ Casual</option>
            </select>
          </div>
        </div>
      </div>

      {/* Outfit Title Input */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-bold uppercase tracking-wider text-pastel-muted">Fit Name:</label>
        <input
          type="text"
          value={customTitle}
          onChange={(e) => setCustomTitle(e.target.value)}
          placeholder="e.g. Sunday Morning Latte Run"
          className="flex-1 max-w-md px-4 py-2 rounded-xl bg-white border border-pastel-sand text-xs font-semibold text-pastel-charcoal focus:outline-none focus:border-pastel-sage-medium"
        />
      </div>

      {/* Interactive Slots Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {renderSlotCard('tops', selectedTop, setSelectedTop, 'Top Piece', '👚')}
        {renderSlotCard('bottoms', selectedBottom, setSelectedBottom, 'Bottom Piece', '👖')}
        {renderSlotCard('outerwear', selectedOuter, setSelectedOuter, 'Outerwear Layer', '🧥')}
        {renderSlotCard('shoes', selectedShoe, setSelectedShoe, 'Footwear', '👟')}
        {renderSlotCard('bags', selectedBag, setSelectedBag, 'Bag & Carry', '👜')}
        {renderSlotCard('accessories', selectedAcc, setSelectedAcc, 'Accessory Accent', '🕶️')}
      </div>

      {/* Drawer / Modal to Pick Items for a Slot */}
      {pickingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pastel-charcoal/40 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-pastel-cream-100 rounded-3xl border border-pastel-sand shadow-soft-lg p-6">
            <div className="flex items-center justify-between pb-4 border-b border-pastel-sand/50">
              <h3 className="font-serif text-xl font-bold text-pastel-charcoal capitalize">
                Select {pickingCategory} from Your Closet
              </h3>
              <button
                onClick={() => setPickingCategory(null)}
                className="p-1.5 rounded-full hover:bg-pastel-cream-200 text-pastel-charcoal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 mt-4">
              {wardrobe
                .filter(i => i.category === pickingCategory)
                .map(item => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (pickingCategory === 'tops') setSelectedTop(item);
                      if (pickingCategory === 'bottoms') setSelectedBottom(item);
                      if (pickingCategory === 'outerwear') setSelectedOuter(item);
                      if (pickingCategory === 'shoes') setSelectedShoe(item);
                      if (pickingCategory === 'bags') setSelectedBag(item);
                      if (pickingCategory === 'accessories') setSelectedAcc(item);
                      setPickingCategory(null);
                    }}
                    className="cursor-pointer group rounded-2xl bg-white border border-pastel-sand p-2.5 hover:border-pastel-sage-medium hover:shadow-soft transition-all"
                  >
                    <div className="aspect-square rounded-xl overflow-hidden bg-pastel-cream-200 mb-2 relative">
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <span
                        className="absolute bottom-1.5 left-1.5 w-2.5 h-2.5 rounded-full border border-black/20"
                        style={{ backgroundColor: item.colorHex }}
                      />
                    </div>
                    <p className="text-xs font-bold text-pastel-charcoal truncate group-hover:text-pastel-sage-dark">{item.name}</p>
                    <p className="text-[10px] text-pastel-muted capitalize truncate">{item.colorName}</p>
                  </div>
                ))}
            </div>

            {wardrobe.filter(i => i.category === pickingCategory).length === 0 && (
              <div className="text-center py-10 text-pastel-muted text-xs">
                No items in this category yet. Head to Closet and click "Add Pieces" to upload one!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
