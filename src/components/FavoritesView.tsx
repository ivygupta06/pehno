import React, { useState, useMemo } from 'react';
import { Heart, Trash2, Calendar, Star, Sparkles } from 'lucide-react';
import { Outfit, Occasion, GarmentItem } from '../types/wardrobe';

interface FavoritesViewProps {
  favorites: Outfit[];
  onRemoveFavorite: (outfitId: string) => void;
  onUpdateFavorite: (updated: Outfit) => void;
  onNavigateToStylist: () => void;
  onViewItemDetail: (garment: GarmentItem) => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  favorites,
  onRemoveFavorite,
  onUpdateFavorite,
  onNavigateToStylist,
  onViewItemDetail,
}) => {
  const [selectedOccasion, setSelectedOccasion] = useState<Occasion | 'all'>('all');

  // Identify duplicate saved fits that have identical top/bottom/dress/shoe pieces
  const duplicateFitIds = useMemo(() => {
    const seen = new Set<string>();
    const dupes = new Set<string>();
    for (const f of favorites) {
      const key = `${f.top?.id || ''}_${f.bottom?.id || ''}_${f.dress?.id || ''}_${f.shoes?.id || ''}`;
      if (key !== '___') {
        if (seen.has(key)) {
          dupes.add(f.id);
        } else {
          seen.add(key);
        }
      }
    }
    return dupes;
  }, [favorites]);

  const filteredFavorites = useMemo(() => {
    if (selectedOccasion === 'all') return favorites;
    return favorites.filter(f => f.occasion === selectedOccasion);
  }, [favorites, selectedOccasion]);

  const handleToggleStar = (outfit: Outfit, starVal: number) => {
    const updated = {
      ...outfit,
      rating: outfit.rating === starVal ? 0 : starVal,
    };
    onUpdateFavorite(updated);
  };

  const handleUpdateNotes = (outfit: Outfit, notes: string) => {
    onUpdateFavorite({ ...outfit, userNotes: notes });
  };

  const handleEliminateDuplicateFits = () => {
    duplicateFitIds.forEach(id => onRemoveFavorite(id));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-pastel-sand/60">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pastel-rose text-pastel-rose-dark text-xs font-bold uppercase tracking-wider mb-2">
            <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
            <span>Saved Capsule Fits</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-pastel-charcoal">
            Your Favorite Outfits ({favorites.length})
          </h1>
          <p className="text-xs sm:text-sm text-pastel-muted mt-1">
            Personal lookbook of your best-rated combinations, notes on where you wore them, and outfit formulas.
          </p>
        </div>

        {/* Occasion Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {['all', 'class', 'date', 'brunch', 'office', 'party', 'casual'].map(occ => (
            <button
              key={occ}
              onClick={() => setSelectedOccasion(occ as any)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                selectedOccasion === occ
                  ? 'bg-pastel-charcoal text-white shadow-soft'
                  : 'bg-white text-pastel-charcoal border border-pastel-sand hover:bg-pastel-cream-100'
              }`}
            >
              {occ === 'all' ? 'All Fits' : occ}
            </button>
          ))}
        </div>
      </div>

      {/* Duplicate Fits Banner */}
      {duplicateFitIds.size > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5 text-amber-900 text-xs font-semibold">
            <Trash2 className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Found <strong>{duplicateFitIds.size} duplicate {duplicateFitIds.size === 1 ? 'fit' : 'fits'}</strong> with identical wardrobe garment combinations.
            </span>
          </div>
          <button
            onClick={handleEliminateDuplicateFits}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-soft flex items-center justify-center gap-1.5 shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminate Duplicate Fits</span>
          </button>
        </div>
      )}

      {/* Grid of Saved Outfits */}
      {filteredFavorites.length === 0 ? (
        <div className="text-center py-20 bg-white/70 rounded-3xl border border-dashed border-pastel-sand p-8 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-pastel-rose/40 text-pastel-rose-dark flex items-center justify-center mx-auto">
            <Heart className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-serif text-2xl font-bold text-pastel-charcoal">
              No Favorite Outfits Saved Yet
            </h3>
            <p className="text-xs text-pastel-muted max-w-md mx-auto mt-1">
              Browse recommendations from the AI Stylist or build your own in the Mix & Match Studio, then click the heart icon to save them here!
            </p>
          </div>
          <button
            onClick={onNavigateToStylist}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-pastel-sage-dark text-white font-bold text-xs shadow-soft hover:shadow-soft-lg hover:scale-102 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Outfit Recommendations</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredFavorites.map(outfit => {
            // Inviolable fashion rule: A dress is a 1-piece outfit. Never render with top or bottom!
            const dressItem = outfit.dress || (outfit.top?.category === 'dresses' ? outfit.top : (outfit.bottom?.category === 'dresses' ? outfit.bottom : undefined));
            const topItem = dressItem ? undefined : outfit.top;
            const bottomItem = dressItem ? undefined : outfit.bottom;

            const garments = [
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
                className="rounded-3xl bg-white border border-pastel-sand p-6 shadow-soft hover:shadow-soft-lg transition-all flex flex-col justify-between"
              >
                {/* Card Top */}
                <div>
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-pastel-sand/40">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-pastel-sage text-pastel-sage-dark text-[10px] font-bold uppercase">
                        {outfit.occasion}
                      </span>
                      <span className="text-[11px] font-bold text-pastel-muted">
                        {outfit.compatibilityScore}% Compatibility
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* 5-star rating */}
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            onClick={() => handleToggleStar(outfit, star)}
                            className="p-0.5 text-amber-400 hover:scale-110 transition-transform"
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                (outfit.rating || 0) >= star ? 'fill-amber-400' : 'text-pastel-sand'
                              }`}
                            />
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => onRemoveFavorite(outfit.id)}
                        className="p-1.5 rounded-full text-pastel-muted hover:text-rose-500 hover:bg-rose-50 transition-colors"
                        title="Remove from favorites"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-serif text-xl font-bold text-pastel-charcoal mt-3">
                    {outfit.title}
                  </h3>
                  <p className="text-xs text-pastel-muted mt-0.5">
                    {outfit.colorHarmonyType}
                  </p>

                  {/* Garments Thumbnails Grid */}
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 my-4">
                    {garments.map((g, idx) => (
                      <div
                        key={idx}
                        onClick={() => onViewItemDetail(g)}
                        className="cursor-pointer group aspect-square rounded-xl overflow-hidden bg-pastel-cream-100 border border-pastel-sand relative"
                        title={`${g.name} (${g.colorName})`}
                      >
                        <img src={g.imageUrl} alt={g.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <span
                          className="absolute bottom-1 left-1 w-2 h-2 rounded-full border border-black/20"
                          style={{ backgroundColor: g.colorHex }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Styling reasons */}
                  <div className="space-y-1 my-3 bg-pastel-cream-50 p-3 rounded-2xl border border-pastel-sand/50">
                    {outfit.stylingNotes.slice(0, 2).map((note, nIdx) => (
                      <p key={nIdx} className="text-[11px] text-pastel-charcoal/80 flex items-start gap-1.5">
                        <span className="text-pastel-sage-dark font-bold">•</span>
                        <span>{note}</span>
                      </p>
                    ))}
                  </div>
                </div>

                {/* Card Bottom / Personal Wear Notes */}
                <div className="pt-3 border-t border-pastel-sand/40">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Calendar className="w-3.5 h-3.5 text-pastel-muted" />
                    <span className="text-[10px] uppercase font-bold tracking-wider text-pastel-muted">
                      Personal Styling Notes:
                    </span>
                  </div>
                  <input
                    type="text"
                    value={outfit.userNotes || ''}
                    placeholder="e.g. Wore with gold hoops on Sunday brunch..."
                    onChange={(e) => handleUpdateNotes(outfit, e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded-xl bg-pastel-cream-100 border border-transparent hover:border-pastel-sand focus:border-pastel-sage-medium focus:outline-none text-pastel-charcoal placeholder:text-pastel-muted"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
