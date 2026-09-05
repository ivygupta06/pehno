import React, { useState, useEffect } from 'react';
import { X, Trash2, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { GarmentItem } from '../types/wardrobe';
import { findWardrobeDuplicates, DuplicateCluster } from '../lib/duplicateDetector';

interface DuplicatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  wardrobe: GarmentItem[];
  onEliminateGarment: (itemId: string) => void;
  onEliminateMultiple: (itemIds: string[]) => void;
}

export const DuplicatesModal: React.FC<DuplicatesModalProps> = ({
  isOpen,
  onClose,
  wardrobe,
  onEliminateGarment,
  onEliminateMultiple,
}) => {
  const [clusters, setClusters] = useState<DuplicateCluster[]>([]);
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsScanning(true);
      findWardrobeDuplicates(wardrobe)
        .then(res => {
          setClusters(res);
          setIsScanning(false);
        })
        .catch(() => setIsScanning(false));
    }
  }, [isOpen, wardrobe]);

  if (!isOpen) return null;

  const totalDuplicates = clusters.reduce((acc, c) => acc + c.duplicates.length, 0);

  const handleEliminateAll = () => {
    const idsToEliminate: string[] = [];
    clusters.forEach(c => {
      c.duplicates.forEach(d => {
        idsToEliminate.push(d.item.id);
      });
    });
    if (idsToEliminate.length > 0) {
      onEliminateMultiple(idsToEliminate);
      setClusters([]);
    }
  };

  const handleEliminateSingle = (itemId: string) => {
    onEliminateGarment(itemId);
    setClusters(prev =>
      prev
        .map(c => ({
          ...c,
          duplicates: c.duplicates.filter(d => d.item.id !== itemId),
        }))
        .filter(c => c.duplicates.length > 0)
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pastel-charcoal/40 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-pastel-cream-100 rounded-3xl border border-pastel-sand shadow-soft-lg flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-pastel-sand/60 bg-white/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-soft">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-pastel-charcoal flex items-center gap-2">
                <span>Wardrobe Duplicate Scanner</span>
                {!isScanning && (
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-sans font-bold ${
                    totalDuplicates > 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {totalDuplicates} {totalDuplicates === 1 ? 'Duplicate' : 'Duplicates'} Found
                  </span>
                )}
              </h2>
              <p className="text-xs text-pastel-muted">
                Scan your closet for identical photos or redundant pieces and clean them with 1 click.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-pastel-charcoal/60 hover:text-pastel-charcoal hover:bg-pastel-cream-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isScanning ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-10 h-10 border-3 border-pastel-sage-dark border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-pastel-charcoal">Analyzing images and visual fingerprints...</p>
              <p className="text-[11px] text-pastel-muted">Comparing perceptual hashes & silhouette color harmony across {wardrobe.length} items</p>
            </div>
          ) : clusters.length === 0 ? (
            <div className="text-center py-16 bg-white/60 rounded-3xl border border-dashed border-pastel-sand p-8 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-soft">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-lg font-bold text-pastel-charcoal">Your Wardrobe is Perfectly Clean!</h3>
                <p className="text-xs text-pastel-muted max-w-md mx-auto">
                  No duplicate photos or redundant duplicate types were found across all {wardrobe.length} items in your closet.
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-full bg-pastel-charcoal text-white text-xs font-bold hover:bg-pastel-charcoal/80 transition-all shadow-soft"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Batch action banner */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-amber-800 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    Found <strong>{totalDuplicates}</strong> redundant {totalDuplicates === 1 ? 'item' : 'items'} in your wardrobe that can be safely eliminated.
                  </span>
                </div>
                <button
                  onClick={handleEliminateAll}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-soft shrink-0 flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminate All {totalDuplicates} Duplicates</span>
                </button>
              </div>

              {/* Duplicate Clusters List */}
              {clusters.map((cluster) => (
                <div
                  key={cluster.id}
                  className="p-5 rounded-2xl bg-white border border-pastel-sand/70 shadow-soft space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-pastel-sand/40 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-pastel-sage-light text-pastel-sage-dark">
                        {cluster.category}
                      </span>
                      <h4 className="text-xs font-bold text-pastel-charcoal">
                        Group: {cluster.primaryItem.name}
                      </h4>
                    </div>
                    <span className="text-[11px] text-pastel-muted">
                      1 primary + {cluster.duplicates.length} duplicate
                    </span>
                  </div>

                  {/* Comparison Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Primary Item Card */}
                    <div className="p-3 rounded-xl bg-pastel-cream-50 border border-emerald-200 flex items-center gap-3">
                      <img
                        src={cluster.primaryItem.imageUrl}
                        alt={cluster.primaryItem.name}
                        className="w-16 h-16 rounded-xl object-cover bg-pastel-sand/30 shrink-0 border border-pastel-sand"
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <span className="inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          Primary (Keep)
                        </span>
                        <p className="text-xs font-bold text-pastel-charcoal truncate">{cluster.primaryItem.name}</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-pastel-muted">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: cluster.primaryItem.colorHex }}
                          />
                          <span>{cluster.primaryItem.colorName}</span>
                          <span>•</span>
                          <span className="capitalize">{cluster.primaryItem.subcategory}</span>
                        </div>
                      </div>
                    </div>

                    {/* Duplicate Items Cards */}
                    {cluster.duplicates.map((dup) => (
                      <div
                        key={dup.item.id}
                        className="p-3 rounded-xl bg-rose-50/50 border border-rose-200 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <img
                            src={dup.item.imageUrl}
                            alt={dup.item.name}
                            className="w-16 h-16 rounded-xl object-cover bg-pastel-sand/30 shrink-0 border border-rose-200"
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <span className="inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                              {dup.confidence}% Match
                            </span>
                            <p className="text-xs font-bold text-pastel-charcoal truncate">{dup.item.name}</p>
                            <p className="text-[10px] text-pastel-muted truncate">{dup.reason}</p>
                          </div>
                        </div>

                        {/* Eliminate button */}
                        <button
                          onClick={() => handleEliminateSingle(dup.item.id)}
                          title="Eliminate this redundant item"
                          className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Eliminate</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-pastel-sand/60 bg-white/70 flex items-center justify-between">
          <p className="text-[11px] text-pastel-muted">
            Eliminating a duplicate permanently deletes the redundant piece while preserving the primary item.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-pastel-charcoal text-white text-xs font-bold hover:bg-pastel-charcoal/80 transition-all shadow-soft"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
