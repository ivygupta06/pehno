import React, { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, Heart, Sparkles, Plus, Eye, Layers } from 'lucide-react';
import { GarmentCategory, GarmentItem, ColorTone, Season, Occasion } from '../types/wardrobe';

interface ClosetViewProps {
  wardrobe: GarmentItem[];
  onToggleFavorite: (itemId: string) => void;
  onSelectGarmentToStyle: (garment: GarmentItem) => void;
  onViewItemDetail: (garment: GarmentItem) => void;
  onOpenUpload: () => void;
  onOpenDuplicates?: () => void;
}

const CATEGORIES: { id: GarmentCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'All Items', icon: '✨' },
  { id: 'tops', label: 'Tops', icon: '👚' },
  { id: 'bottoms', label: 'Bottoms', icon: '👖' },
  { id: 'outerwear', label: 'Outerwear', icon: '🧥' },
  { id: 'dresses', label: 'Dresses', icon: '👗' },
  { id: 'shoes', label: 'Shoes', icon: '👟' },
  { id: 'bags', label: 'Bags', icon: '👜' },
  { id: 'accessories', label: 'Accessories', icon: '🕶️' },
];

export const ClosetView: React.FC<ClosetViewProps> = ({
  wardrobe,
  onToggleFavorite,
  onSelectGarmentToStyle,
  onViewItemDetail,
  onOpenUpload,
  onOpenDuplicates,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<GarmentCategory | 'all'>('all');
  const [selectedTone, setSelectedTone] = useState<ColorTone | 'all'>('all');
  const [selectedSeason, setSelectedSeason] = useState<Season | 'all'>('all');
  const [selectedOccasion, setSelectedOccasion] = useState<Occasion | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filtered garments
  const filteredItems = useMemo(() => {
    return wardrobe.filter(item => {
      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      // Color Tone filter
      if (selectedTone !== 'all' && item.colorTone !== selectedTone) {
        return false;
      }
      // Season filter
      if (selectedSeason !== 'all' && !item.seasons.includes(selectedSeason) && !item.seasons.includes('all-season')) {
        return false;
      }
      // Occasion filter
      if (selectedOccasion !== 'all' && !item.occasions.includes(selectedOccasion)) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesColor = item.colorName.toLowerCase().includes(q);
        const matchesSubcat = item.subcategory.toLowerCase().includes(q);
        const matchesTags = item.tags.some(t => t.toLowerCase().includes(q));
        const matchesMaterial = item.material?.toLowerCase().includes(q) || false;
        if (!matchesName && !matchesColor && !matchesSubcat && !matchesTags && !matchesMaterial) {
          return false;
        }
      }
      return true;
    });
  }, [wardrobe, selectedCategory, selectedTone, selectedSeason, selectedOccasion, searchQuery]);

  // Wardrobe palette distribution
  const paletteBreakdown = useMemo(() => {
    const tones: Record<string, number> = {};
    wardrobe.forEach(i => {
      tones[i.colorTone] = (tones[i.colorTone] || 0) + 1;
    });
    return tones;
  }, [wardrobe]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Top Banner / Closet Aesthetic Overview */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-pastel-butter-light via-pastel-cream-100 to-pastel-sage-light p-6 sm:p-8 border border-pastel-sand/60 shadow-soft">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pastel-butter text-pastel-butter-dark text-[11px] font-bold tracking-wider uppercase mb-2">
              Curated Wardrobe Capsule
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-pastel-charcoal tracking-tight">
              Your Digital Wardrobe
            </h1>
            <p className="text-xs sm:text-sm text-pastel-muted mt-2 leading-relaxed">
              Organized by silhouette, seasonal suitability, and color theory harmony. Browse your pieces or let the AI stylist compose your next outfit.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="px-4 py-3 rounded-2xl bg-white/80 backdrop-blur-sm border border-pastel-sand shadow-soft flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-wider text-pastel-muted">Total Pieces</span>
              <span className="font-serif text-2xl font-bold text-pastel-charcoal">{wardrobe.length}</span>
            </div>
            
            <div className="px-4 py-3 rounded-2xl bg-white/80 backdrop-blur-sm border border-pastel-sand shadow-soft flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-wider text-pastel-muted">Pastel & Neutrals</span>
              <span className="font-serif text-2xl font-bold text-pastel-sage-dark">
                {Math.round((((paletteBreakdown['pastel'] || 0) + (paletteBreakdown['neutral'] || 0)) / (wardrobe.length || 1)) * 100)}%
              </span>
            </div>

            {onOpenDuplicates && (
              <button
                onClick={onOpenDuplicates}
                className="px-4 py-3.5 rounded-2xl bg-white/90 hover:bg-white text-pastel-charcoal border border-pastel-sand hover:border-amber-400 font-bold text-xs flex items-center gap-2 shadow-soft hover:shadow-soft-lg transition-all"
                title="Scan and eliminate duplicate garments from your closet"
              >
                <Layers className="w-4 h-4 text-amber-600" />
                <span>Find Duplicates</span>
              </button>
            )}

            <button
              onClick={onOpenUpload}
              className="px-5 py-3.5 rounded-2xl bg-pastel-sage-dark hover:bg-pastel-sage-dark/90 text-white font-bold text-xs flex items-center gap-2 shadow-soft hover:shadow-soft-lg hover:scale-102 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Pieces</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search & Category Pills */}
      <div className="space-y-4">
        {/* Search Bar & Filter Toggle */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pastel-muted" />
            <input
              type="text"
              placeholder="Search by color, garment (e.g. linen, jeans, blazer, sage, silk)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-pastel-sand text-xs text-pastel-charcoal placeholder:text-pastel-muted shadow-soft focus:outline-none focus:border-pastel-sage-medium focus:ring-2 focus:ring-pastel-sage-light"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-pastel-muted hover:text-pastel-charcoal"
              >
                Clear
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-semibold border transition-all ${
              showFilters || selectedTone !== 'all' || selectedSeason !== 'all' || selectedOccasion !== 'all'
                ? 'bg-pastel-charcoal text-white border-pastel-charcoal shadow-soft'
                : 'bg-white text-pastel-charcoal border-pastel-sand hover:bg-pastel-cream-100 shadow-soft'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {(selectedTone !== 'all' || selectedSeason !== 'all' || selectedOccasion !== 'all') && (
              <span className="w-2 h-2 rounded-full bg-pastel-butter" />
            )}
          </button>
        </div>

        {/* Collapsible Filter Bar */}
        {showFilters && (
          <div className="p-4 rounded-2xl bg-white border border-pastel-sand shadow-soft grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fadeIn">
            {/* Color Tone */}
            <div>
              <label className="text-[11px] font-bold text-pastel-muted uppercase tracking-wider block mb-1.5">
                Color Family
              </label>
              <select
                value={selectedTone}
                onChange={(e) => setSelectedTone(e.target.value as any)}
                className="w-full text-xs font-medium py-2 px-3 rounded-xl bg-pastel-cream-100 border border-pastel-sand text-pastel-charcoal focus:outline-none"
              >
                <option value="all">All Tones</option>
                <option value="pastel">Pastels</option>
                <option value="neutral">Neutrals (White, Black, Denim, Oat)</option>
                <option value="earthy">Earthy / Warm</option>
                <option value="vibrant">Vibrant / Statement</option>
              </select>
            </div>

            {/* Season */}
            <div>
              <label className="text-[11px] font-bold text-pastel-muted uppercase tracking-wider block mb-1.5">
                Season
              </label>
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value as any)}
                className="w-full text-xs font-medium py-2 px-3 rounded-xl bg-pastel-cream-100 border border-pastel-sand text-pastel-charcoal focus:outline-none"
              >
                <option value="all">All Seasons</option>
                <option value="spring">Spring</option>
                <option value="summer">Summer</option>
                <option value="fall">Fall</option>
                <option value="winter">Winter</option>
              </select>
            </div>

            {/* Occasion */}
            <div>
              <label className="text-[11px] font-bold text-pastel-muted uppercase tracking-wider block mb-1.5">
                Occasion Suitable
              </label>
              <select
                value={selectedOccasion}
                onChange={(e) => setSelectedOccasion(e.target.value as any)}
                className="w-full text-xs font-medium py-2 px-3 rounded-xl bg-pastel-cream-100 border border-pastel-sand text-pastel-charcoal focus:outline-none"
              >
                <option value="all">All Occasions</option>
                <option value="class">Class / Campus</option>
                <option value="date">Date Night</option>
                <option value="brunch">Brunch & Day Out</option>
                <option value="office">Office / Work</option>
                <option value="party">Party / Evening</option>
                <option value="casual">Casual Outing</option>
              </select>
            </div>
          </div>
        )}

        {/* Category Horizontal Scroll Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map(cat => {
            const count = cat.id === 'all' 
              ? wardrobe.length 
              : wardrobe.filter(i => i.category === cat.id).length;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-pastel-charcoal text-white shadow-soft scale-102'
                    : 'bg-white text-pastel-charcoal border border-pastel-sand hover:bg-pastel-cream-100'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  selectedCategory === cat.id ? 'bg-white/20 text-white' : 'bg-pastel-cream-200 text-pastel-muted'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Wardrobe Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white/60 rounded-3xl border border-dashed border-pastel-sand p-8">
          <p className="font-serif text-xl font-bold text-pastel-charcoal mb-2">No garments found</p>
          <p className="text-xs text-pastel-muted mb-4">Try clearing filters or search query.</p>
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSelectedTone('all');
              setSelectedSeason('all');
              setSelectedOccasion('all');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-full bg-pastel-sage text-pastel-sage-dark text-xs font-bold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredItems.map(item => (
            <div
              key={item.id}
              className="group relative flex flex-col rounded-3xl bg-white border border-pastel-sand overflow-hidden shadow-soft hover:shadow-soft-lg transition-all duration-300"
            >
              {/* Photo Area */}
              <div 
                onClick={() => onViewItemDetail(item)}
                className="relative aspect-[4/5] overflow-hidden bg-pastel-cream-100 cursor-pointer"
              >
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Favorite Heart Badge */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(item.id);
                  }}
                  className="absolute top-3 right-3 p-2 rounded-full bg-white/85 backdrop-blur-sm text-pastel-charcoal hover:scale-110 active:scale-95 transition-all shadow-soft"
                >
                  <Heart
                    className={`w-4 h-4 ${item.isFavorite ? 'text-rose-500 fill-rose-500' : 'text-pastel-charcoal/60'}`}
                  />
                </button>

                {/* Color Dot & Tone Tag */}
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md border border-white/60 shadow-soft">
                  <span
                    className="w-3 h-3 rounded-full border border-black/10 flex-shrink-0"
                    style={{ backgroundColor: item.colorHex }}
                  />
                  <span className="text-[10px] font-semibold text-pastel-charcoal line-clamp-1 max-w-[90px]">
                    {item.colorName}
                  </span>
                </div>
              </div>

              {/* Info Area */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 text-[10px] text-pastel-muted uppercase tracking-wider font-semibold mb-1">
                    <span className="capitalize">{item.category} • {item.fit}</span>
                    <span className="capitalize text-pastel-sage-dark font-bold">{item.aesthetics[0]}</span>
                  </div>
                  <h3 
                    onClick={() => onViewItemDetail(item)}
                    className="font-serif font-bold text-sm text-pastel-charcoal line-clamp-1 group-hover:text-pastel-sage-dark transition-colors cursor-pointer"
                  >
                    {item.name}
                  </h3>
                </div>

                {/* Card Actions */}
                <div className="mt-3.5 pt-3 border-t border-pastel-sand/50 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onViewItemDetail(item)}
                    className="p-1.5 text-pastel-muted hover:text-pastel-charcoal transition-colors"
                    title="View details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onSelectGarmentToStyle(item)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-full bg-pastel-butter hover:bg-pastel-butter-medium text-pastel-butter-dark text-[11px] font-bold shadow-soft transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Style This</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
