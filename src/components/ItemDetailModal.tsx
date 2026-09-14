import React, { useMemo, useState, useEffect } from 'react';
import { X, Sparkles, Heart, Trash2, Edit3, Check } from 'lucide-react';
import { GarmentCategory, GarmentItem } from '../types/wardrobe';
import { getBestMatchingPartners } from '../lib/stylingEngine';

interface ItemDetailModalProps {
  item: GarmentItem | null;
  wardrobe: GarmentItem[];
  onClose: () => void;
  onToggleFavorite: (itemId: string) => void;
  onDelete: (itemId: string) => void;
  onStyleThis: (garment: GarmentItem) => void;
  onUpdateGarment?: (updated: GarmentItem) => void;
  onSelectGarment?: (garment: GarmentItem) => void;
  onAddGarments?: (newPieces: GarmentItem[]) => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  wardrobe,
  onClose,
  onToggleFavorite,
  onDelete,
  onStyleThis,
  onUpdateGarment,
  onSelectGarment,
  onAddGarments,
}) => {
  if (!item) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editCategory, setEditCategory] = useState<GarmentCategory>(item.category);

  // Sync edit state when item changes
  useEffect(() => {
    if (item) {
      setEditName(item.name);
      setEditCategory(item.category);
      setIsEditing(false);
    }
  }, [item?.id]);

  const handleSaveEdit = () => {
    if (!onUpdateGarment || !item) return;
    const updated: GarmentItem = {
      ...item,
      name: editName.trim() || item.name,
      category: editCategory,
    };
    onUpdateGarment(updated);
    setIsEditing(false);
  };

  // Compute best matching partners using fashion compatibility rules
  const bestMatches = useMemo(() => {
    return getBestMatchingPartners(item, wardrobe, 4);
  }, [item, wardrobe]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pastel-charcoal/40 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-pastel-cream-100 rounded-3xl border border-pastel-sand shadow-soft-lg p-6 sm:p-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/80 hover:bg-white text-pastel-charcoal shadow-soft transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Photo Column */}
          <div className="space-y-3">
            <div className="aspect-[4/5] rounded-3xl overflow-hidden bg-pastel-cream-200 border border-pastel-sand shadow-soft relative">
              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
              <button
                onClick={() => onToggleFavorite(item.id)}
                className="absolute top-3 left-3 p-2.5 rounded-full bg-white/90 backdrop-blur-md text-pastel-charcoal shadow-soft hover:scale-110 transition-all"
              >
                <Heart className={`w-4 h-4 ${item.isFavorite ? 'text-rose-500 fill-rose-500' : 'text-pastel-charcoal/60'}`} />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onClose();
                  onStyleThis(item);
                }}
                className="flex-1 py-3 px-4 rounded-2xl bg-pastel-sage-dark text-white font-bold text-xs flex items-center justify-center gap-2 shadow-soft hover:shadow-soft-lg transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Style In Outfits</span>
              </button>

              <button
                onClick={() => {
                  if (confirm(`Remove "${item.name}" from your wardrobe?`)) {
                    onDelete(item.id);
                    onClose();
                  }
                }}
                className="p-3 rounded-2xl bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 shadow-soft transition-all"
                title="Delete item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Details Column */}
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-pastel-sage text-pastel-sage-dark text-[10px] font-bold uppercase tracking-wider">
                    {item.category}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-pastel-cream-200 text-pastel-charcoal text-[10px] font-semibold capitalize">
                    {item.fit} fit
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-pastel-butter text-pastel-butter-dark text-[10px] font-semibold capitalize">
                    {item.pattern}
                  </span>
                </div>

                {onUpdateGarment && (
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-pastel-sage-dark hover:underline"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{isEditing ? 'Cancel Edit' : 'Edit Category'}</span>
                  </button>
                )}
              </div>

              {/* Editing Form */}
              {isEditing ? (
                <div className="p-3 bg-white rounded-2xl border border-pastel-sand space-y-2 mt-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-pastel-muted block mb-0.5">Garment Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-pastel-cream-100 border border-pastel-sand focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-pastel-muted block mb-0.5">Category</label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value as GarmentCategory)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-pastel-cream-100 border border-pastel-sand font-semibold text-pastel-charcoal focus:outline-none"
                    >
                      <option value="dresses">👗 Dresses</option>
                      <option value="tops">👚 Tops</option>
                      <option value="bottoms">👖 Bottoms</option>
                      <option value="outerwear">🧥 Outerwear & Shrugs</option>
                      <option value="shoes">👟 Shoes</option>
                      <option value="bags">👜 Bags</option>
                      <option value="accessories">🕶️ Accessories</option>
                    </select>
                  </div>
                  <button
                    onClick={handleSaveEdit}
                    className="w-full py-1.5 px-3 rounded-xl bg-pastel-sage-dark text-white text-xs font-bold flex items-center justify-center gap-1 shadow-soft"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </button>
                </div>
              ) : (
                <h2 className="font-serif text-2xl font-bold text-pastel-charcoal">
                  {item.name}
                </h2>
              )}
            </div>

            {/* Color Palette Information */}
            <div className="p-3.5 rounded-2xl bg-white border border-pastel-sand shadow-soft flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl shadow-inner border border-black/10 flex-shrink-0"
                style={{ backgroundColor: item.colorHex }}
              />
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-pastel-muted block">
                  Color & Tone
                </span>
                <p className="text-xs font-bold text-pastel-charcoal">
                  {item.colorName}
                </p>
                <p className="text-[10px] text-pastel-muted uppercase">
                  {item.colorTone} • {item.colorHex}
                </p>
              </div>
            </div>

            {/* Attributes Grid */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-pastel-sand/50">
                <span className="text-pastel-muted">Material</span>
                <span className="font-semibold text-pastel-charcoal">{item.material || 'Cotton Linen'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-pastel-sand/50">
                <span className="text-pastel-muted">Aesthetic</span>
                <span className="font-semibold text-pastel-charcoal capitalize">{item.aesthetics.join(', ')}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-pastel-sand/50">
                <span className="text-pastel-muted">Seasons</span>
                <span className="font-semibold text-pastel-charcoal capitalize">{item.seasons.join(', ')}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-pastel-sand/50">
                <span className="text-pastel-muted">Suitable Occasions</span>
                <span className="font-semibold text-pastel-charcoal capitalize">{item.occasions.join(', ')}</span>
              </div>
            </div>

            {/* Best Matching Wardrobe Partners */}
            <div>
              <div className="flex items-center justify-between gap-1 mb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-pastel-charcoal flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Pairs Best With</span>
                </span>
                <span className="text-[10px] text-pastel-muted font-medium">
                  {item.category === 'dresses'
                    ? '✨ Shrugs, Outerwear & Accessories'
                    : item.category === 'tops'
                    ? '✨ Bottoms, Layers & Accessories'
                    : '✨ Harmonized Pairings'}
                </span>
              </div>

              {bestMatches.length === 0 ? (
                <div className="p-4 rounded-2xl bg-white/60 border border-dashed border-pastel-sand text-center text-xs text-pastel-muted">
                  No matching companion pieces found in closet yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {bestMatches.map((m, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        if (m.isSuggestion) {
                          if (onAddGarments) {
                            onAddGarments([m.item]);
                          }
                        }
                        if (onSelectGarment) {
                          onSelectGarment(m.item);
                        }
                      }}
                      className="p-2 rounded-xl bg-white border border-pastel-sand flex items-center gap-2 shadow-xs cursor-pointer hover:border-pastel-sage-dark hover:shadow-soft hover:scale-[1.02] transition-all group relative"
                      title={m.isSuggestion ? `Add "${m.item.name}" to closet` : `View "${m.item.name}"`}
                    >
                      <div className="relative w-8 h-8 flex-shrink-0">
                        <img src={m.item.imageUrl} alt={m.item.name} className="w-8 h-8 rounded-lg object-cover" />
                        {m.isSuggestion && (
                          <span className="absolute -top-1 -right-1 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pastel-sage-dark opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-pastel-sage-dark"></span>
                          </span>
                        )}
                      </div>
                      <div className="overflow-hidden flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-pastel-charcoal truncate group-hover:text-pastel-sage-dark transition-colors">
                          {m.item.name}
                        </p>
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-[9px] text-pastel-sage-dark font-semibold whitespace-nowrap">
                            {m.score}% Harmony
                          </p>
                          {m.isSuggestion && (
                            <span className="text-[8px] font-bold text-pastel-charcoal/70 bg-pastel-cream-200 px-1 py-0.2 rounded border border-pastel-sand/50">
                              + Closet
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
