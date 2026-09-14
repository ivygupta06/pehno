import React, { useState } from 'react';
import { X, Upload, Sparkles, Check, RefreshCw, Trash2, Key, ExternalLink, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { GarmentCategory, GarmentItem } from '../types/wardrobe';
import { analyzeImageLocally, analyzeImageWithGemini, compressAndResizeImage, RawDetectedGarment } from '../lib/visionEngine';
import { formatGarmentName } from '../lib/colorTheory';
import { validateGeminiApiKey } from '../lib/geminiStylist';
import { checkGarmentDuplicate, DuplicateMatch } from '../lib/duplicateDetector';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddGarments: (items: GarmentItem[]) => void;
  geminiApiKey?: string;
  onSaveApiKey?: (key: string) => void;
  wardrobe?: GarmentItem[];
  onReplaceGarment?: (replacedId: string, newItem: GarmentItem) => void;
}

const SAMPLE_PRESETS = [
  {
    mode: 'single' as const,
    label: '✨ Test Single Item',
    url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=700&auto=format&fit=crop&q=80',
    description: 'Baby blue pastel knit tank',
  },
  {
    mode: 'multi-item' as const,
    label: '✨ Test Multi-Item Flatlay',
    url: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=700&auto=format&fit=crop&q=80',
    description: 'Flatlay with denim jacket, knit, and accessories on linen',
  },
  {
    mode: 'ootd' as const,
    label: '✨ Test OOTD / Worn Outfit',
    url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=700&auto=format&fit=crop&q=80',
    description: 'User wearing yellow sweater, wide-leg pants, and sneakers',
  },
];

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onAddGarments,
  geminiApiKey,
  onSaveApiKey,
  wardrobe = [],
  onReplaceGarment,
}) => {
  // Default to 'single' as users most frequently upload individual pieces
  const [mode, setMode] = useState<'single' | 'multi-item' | 'ootd'>('single');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedGarments, setDetectedGarments] = useState<RawDetectedGarment[]>([]);
  const [analysisSummary, setAnalysisSummary] = useState<string>('');
  const [duplicateMatches, setDuplicateMatches] = useState<Record<number, DuplicateMatch>>({});
  const [replaceTargetMap, setReplaceTargetMap] = useState<Record<number, string>>({});
  const [activeKey, setActiveKey] = useState(geminiApiKey || '');
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [isConnectingKey, setIsConnectingKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentKey = activeKey || geminiApiKey || '';
  const hasValidKey = Boolean(currentKey && currentKey.trim().length > 15);

  const handleConnectKey = async () => {
    if (!keyInput.trim()) return;
    setIsConnectingKey(true);
    setKeyError(null);

    const check = await validateGeminiApiKey(keyInput.trim());
    setIsConnectingKey(false);

    if (check.valid) {
      setActiveKey(keyInput.trim());
      if (onSaveApiKey) onSaveApiKey(keyInput.trim());
      setIsEditingKey(false);
      setKeyInput('');
      // If there is already an image uploaded, re-run with Gemini!
      if (imagePreview) {
        runDetection(imagePreview, mode, keyInput.trim());
      }
    } else {
      setKeyError(check.error || 'Invalid API key. Please check your key from Google AI Studio.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const rawBase64 = event.target?.result as string;
        const { dataUrl } = await compressAndResizeImage(rawBase64, 800);
        setImagePreview(dataUrl);
        runDetection(dataUrl, mode, currentKey);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePresetSelect = (preset: typeof SAMPLE_PRESETS[0]) => {
    setMode(preset.mode);
    setImagePreview(preset.url);
    runDetection(preset.url, preset.mode, currentKey);
  };

  const runDetection = async (
    imgSrc: string,
    selectedMode: 'single' | 'multi-item' | 'ootd',
    keyToUse: string = currentKey
  ) => {
    setIsAnalyzing(true);
    setDetectedGarments([]);
    setAnalysisSummary('');
    setDuplicateMatches({});
    setReplaceTargetMap({});

    try {
      let garmentsFound: RawDetectedGarment[] = [];
      let summaryText = '';

      let effectiveImgSrc = imgSrc;
      if (!effectiveImgSrc.startsWith('data:image')) {
        try {
          const resized = await compressAndResizeImage(imgSrc, 800);
          effectiveImgSrc = resized.dataUrl;
        } catch (e) {}
      }

      if (keyToUse && keyToUse.trim().length > 15 && effectiveImgSrc.startsWith('data:image')) {
        const geminiResult = await analyzeImageWithGemini(effectiveImgSrc, keyToUse, selectedMode);
        garmentsFound = geminiResult.garments.map(g => ({
          ...g,
          name: formatGarmentName(g.name, g.colorName, g.category, g.subcategory),
        }));
        summaryText = geminiResult.summary;
      } else {
        await new Promise(r => setTimeout(r, 600));
        const localResult = await analyzeImageLocally(effectiveImgSrc, selectedMode);
        garmentsFound = localResult.garments.map(g => ({
          ...g,
          name: formatGarmentName(g.name, g.colorName, g.category, g.subcategory),
        }));
        summaryText = localResult.summary;
      }

      setDetectedGarments(garmentsFound);
      setAnalysisSummary(summaryText);

      // Run duplicate check against existing closet
      if (wardrobe && wardrobe.length > 0 && garmentsFound.length > 0) {
        const matches: Record<number, DuplicateMatch> = {};
        for (let i = 0; i < garmentsFound.length; i++) {
          const match = await checkGarmentDuplicate(garmentsFound[i], wardrobe);
          if (match) {
            matches[i] = match;
          }
        }
        setDuplicateMatches(matches);
      }
    } catch (err: any) {
      console.warn('AI analysis fallback triggered:', err.message);
      const fallbackResult = await analyzeImageLocally(imgSrc, selectedMode);
      const cleanedFallback = fallbackResult.garments.map(g => ({
        ...g,
        name: formatGarmentName(g.name, g.colorName, g.category, g.subcategory),
      }));
      setDetectedGarments(cleanedFallback);
      setAnalysisSummary(`${fallbackResult.summary} (Local Fallback: ${err.message})`);

      if (wardrobe && wardrobe.length > 0 && cleanedFallback.length > 0) {
        const matches: Record<number, DuplicateMatch> = {};
        for (let i = 0; i < cleanedFallback.length; i++) {
          const match = await checkGarmentDuplicate(cleanedFallback[i], wardrobe);
          if (match) {
            matches[i] = match;
          }
        }
        setDuplicateMatches(matches);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateItem = (index: number, field: keyof RawDetectedGarment, val: any) => {
    setDetectedGarments(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleDeleteItem = (index: number) => {
    setDetectedGarments(prev => prev.filter((_, i) => i !== index));
    setDuplicateMatches(prev => {
      const copy: Record<number, DuplicateMatch> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const num = Number(k);
        if (num < index) copy[num] = v;
        else if (num > index) copy[num - 1] = v;
      });
      return copy;
    });
  };

  const handleEliminateDuplicate = (index: number) => {
    handleDeleteItem(index);
  };

  const handleEliminateAllDuplicates = () => {
    const dupIndices = new Set(Object.keys(duplicateMatches).map(Number));
    setDetectedGarments(prev => prev.filter((_, idx) => !dupIndices.has(idx)));
    setDuplicateMatches({});
    setReplaceTargetMap({});
  };

  const handleToggleReplace = (index: number, existingId: string) => {
    setReplaceTargetMap(prev => {
      const copy = { ...prev };
      if (copy[index] === existingId) {
        delete copy[index];
      } else {
        copy[index] = existingId;
      }
      return copy;
    });
  };

  const handleDismissDuplicate = (index: number) => {
    setDuplicateMatches(prev => {
      const copy = { ...prev };
      delete copy[index];
      return copy;
    });
  };

  const handleConfirmAdd = () => {
    if (detectedGarments.length === 0) return;

    const newGarments: GarmentItem[] = detectedGarments.map((g, idx) => ({
      id: `garment-${Date.now()}-${idx}`,
      name: formatGarmentName(g.name || 'Garment', g.colorName, g.category, g.subcategory),
      category: g.category,
      subcategory: g.subcategory,
      colorName: g.colorName,
      colorHex: g.colorHex,
      colorTone: g.colorTone,
      pattern: g.pattern,
      material: g.material || 'Cotton blend',
      fit: g.fit || 'relaxed',
      aesthetics: g.aesthetics.length > 0 ? g.aesthetics : ['casual'],
      seasons: g.seasons.length > 0 ? g.seasons : ['all-season'],
      occasions: g.occasions.length > 0 ? g.occasions : ['casual'],
      imageUrl: g.imageUrl || imagePreview || '',
      createdAt: Date.now() + idx,
      tags: g.tags.length > 0 ? g.tags : ['imported'],
      isFavorite: false,
    }));

    const toAdd: GarmentItem[] = [];
    newGarments.forEach((item, idx) => {
      const replacedId = replaceTargetMap[idx];
      if (replacedId && onReplaceGarment) {
        onReplaceGarment(replacedId, item);
      } else {
        toAdd.push(item);
      }
    });

    if (toAdd.length > 0) {
      onAddGarments(toAdd);
    }

    onClose();
    // Reset state
    setImagePreview(null);
    setDetectedGarments([]);
    setDuplicateMatches({});
    setReplaceTargetMap({});
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pastel-charcoal/40 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-pastel-cream-100 rounded-3xl border border-pastel-sand shadow-soft-lg p-6 sm:p-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-pastel-sand/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-pastel-sage-light text-pastel-sage-dark">
                <Sparkles className="w-5 h-5" />
              </span>
              <h2 className="font-serif text-2xl font-bold text-pastel-charcoal">
                Add to Your Wardrobe
              </h2>
            </div>
            <p className="text-xs text-pastel-muted mt-1">
              AI automatically detects color, garment type, style aesthetics, and season tags.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-pastel-charcoal/60 hover:text-pastel-charcoal hover:bg-pastel-cream-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Key Status / Quick Connect Banner */}
        <div className="mt-4">
          {hasValidKey ? (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold">Google Gemini AI Vision Active</span>
                <span className="text-[10px] text-emerald-700 hidden sm:inline">• Identifies dresses, tops, jeans, fit & count accurately</span>
              </div>
              <button
                onClick={() => setIsEditingKey(!isEditingKey)}
                className="text-[11px] font-semibold text-emerald-800 hover:underline flex items-center gap-1"
              >
                <span>{isEditingKey ? 'Close' : 'Change Key'}</span>
              </button>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-pastel-butter-light via-pastel-cream-100 to-pastel-lavender-light border border-pastel-sand/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-amber-100 text-amber-700">
                    <Key className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-xs font-bold text-pastel-charcoal">
                    Connect Google Gemini AI for High-Precision Detection
                  </span>
                </div>
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
              <p className="text-[11px] text-pastel-muted">
                Paste your free key from Google AI Studio to accurately identify dresses (not tops), denim silhouettes, and exact piece counts.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="password"
                  placeholder="Paste AIzaSy... key from Google AI Studio"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-white border border-pastel-sand text-xs text-pastel-charcoal focus:outline-none focus:border-pastel-sage-medium"
                />
                <button
                  onClick={handleConnectKey}
                  disabled={isConnectingKey || !keyInput.trim()}
                  className="px-4 py-2 rounded-xl bg-pastel-sage-dark text-white font-bold text-xs shadow-soft hover:shadow-soft-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isConnectingKey ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Connect AI</span>
                    </>
                  )}
                </button>
              </div>
              {keyError && (
                <p className="text-[10px] text-rose-600 font-semibold">{keyError}</p>
              )}
            </div>
          )}

          {isEditingKey && (
            <div className="mt-2 p-3 rounded-2xl bg-white border border-pastel-sand space-y-2">
              <span className="text-xs font-bold text-pastel-charcoal">Update Gemini Key</span>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  placeholder="Paste new AIzaSy... key"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-pastel-cream-100 border border-pastel-sand text-xs text-pastel-charcoal focus:outline-none"
                />
                <button
                  onClick={handleConnectKey}
                  disabled={isConnectingKey || !keyInput.trim()}
                  className="px-3.5 py-2 rounded-xl bg-pastel-sage-dark text-white font-bold text-xs"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Upload Mode Switcher */}
        <div className="mt-5 grid grid-cols-3 gap-2 p-1 bg-pastel-cream-200/90 rounded-2xl border border-pastel-sand/50">
          <button
            onClick={() => {
              setMode('single');
              if (imagePreview) runDetection(imagePreview, 'single');
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              mode === 'single'
                ? 'bg-white text-pastel-charcoal shadow-soft font-bold'
                : 'text-pastel-charcoal/70 hover:text-pastel-charcoal'
            }`}
          >
            👗 Single Item
          </button>
          <button
            onClick={() => {
              setMode('multi-item');
              if (imagePreview) runDetection(imagePreview, 'multi-item');
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              mode === 'multi-item'
                ? 'bg-white text-pastel-charcoal shadow-soft font-bold'
                : 'text-pastel-charcoal/70 hover:text-pastel-charcoal'
            }`}
          >
            🧺 Multi-Item Flatlay
          </button>
          <button
            onClick={() => {
              setMode('ootd');
              if (imagePreview) runDetection(imagePreview, 'ootd');
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              mode === 'ootd'
                ? 'bg-white text-pastel-charcoal shadow-soft font-bold'
                : 'text-pastel-charcoal/70 hover:text-pastel-charcoal'
            }`}
          >
            🪞 OOTD / Selfie
          </button>
        </div>

        {/* Upload Area or Preview */}
        <div className="mt-6">
          {!imagePreview ? (
            <div className="space-y-4">
              <label className="flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-pastel-sage-medium/60 rounded-3xl bg-pastel-sage-light/30 hover:bg-pastel-sage-light/50 cursor-pointer transition-all group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-soft flex items-center justify-center text-pastel-sage-dark group-hover:scale-105 transition-transform mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-pastel-charcoal">
                    Click to upload or drag & drop photo
                  </p>
                  <p className="text-xs text-pastel-muted mt-1">
                    {mode === 'single' && 'Upload clean photo of single garment (dress, top, jeans, etc.)'}
                    {mode === 'multi-item' && 'Photo containing clothes laid flat on bed or floor'}
                    {mode === 'ootd' && 'Mirror selfie or photo of you wearing the outfit'}
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {/* Quick Test Presets */}
              <div className="p-4 rounded-2xl bg-pastel-butter-light/80 border border-pastel-butter/60">
                <div className="flex items-center gap-1.5 text-xs font-bold text-pastel-butter-dark uppercase tracking-wider mb-2.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Instant Demo Presets (Test AI Vision without upload)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {SAMPLE_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePresetSelect(p)}
                      className="p-2.5 text-left rounded-xl bg-white/80 hover:bg-white border border-pastel-sand hover:border-pastel-butter-medium transition-all group"
                    >
                      <div className="text-xs font-semibold text-pastel-charcoal group-hover:text-amber-700">
                        {p.label}
                      </div>
                      <div className="text-[10px] text-pastel-muted line-clamp-1 mt-0.5">
                        {p.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Image Preview with scanning line */}
              <div className="relative h-64 rounded-3xl overflow-hidden bg-black/5 border border-pastel-sand">
                <img
                  src={imagePreview}
                  alt="Garment Preview"
                  className="w-full h-full object-cover"
                />
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-pastel-charcoal/20 backdrop-blur-[2px] flex flex-col items-center justify-center text-white">
                    {/* Scanner line animation */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pastel-sage via-pastel-lavender to-pastel-butter animate-pulse" />
                    <RefreshCw className="w-8 h-8 animate-spin text-pastel-butter mb-2" />
                    <span className="text-xs font-bold tracking-widest uppercase text-white bg-pastel-charcoal/70 px-3 py-1.5 rounded-full">
                      {hasValidKey ? 'Gemini AI Vision analyzing silhouettes & cuts...' : 'Scanning garment cuts & color palette...'}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => {
                    setImagePreview(null);
                    setDetectedGarments([]);
                  }}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-white/80 hover:bg-white text-pastel-charcoal shadow-soft"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Detected Items Review Section */}
              {detectedGarments.length > 0 && (
                <div className="space-y-4">
                  {/* Duplicate summary alert banner */}
                  {Object.keys(duplicateMatches).length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-fadeIn">
                      <div className="flex items-center gap-2 text-amber-900 text-xs font-semibold">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          <strong>{Object.keys(duplicateMatches).length} duplicate {Object.keys(duplicateMatches).length === 1 ? 'item' : 'items'}</strong> detected with pieces already in your wardrobe.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleEliminateAllDuplicates}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminate All Duplicates</span>
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-serif text-lg font-bold text-pastel-charcoal">
                        Identified Garments ({detectedGarments.length})
                      </h3>
                      {analysisSummary && (
                        <p className="text-xs text-pastel-muted mt-0.5">
                          {analysisSummary}
                        </p>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-pastel-sage text-pastel-sage-dark">
                      Ready to import
                    </span>
                  </div>

                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {detectedGarments.map((item, idx) => {
                      const dup = duplicateMatches[idx];
                      const isReplacing = replaceTargetMap[idx];

                      return (
                        <div
                          key={idx}
                          className={`p-4 rounded-2xl bg-white border transition-all ${
                            dup
                              ? 'border-amber-300 ring-2 ring-amber-100'
                              : 'border-pastel-sand'
                          } shadow-soft space-y-3`}
                        >
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                              <img
                                src={item.imageUrl || imagePreview || ''}
                                alt={`${item.name} crop`}
                                className="w-12 h-12 rounded-xl object-contain bg-pastel-cream-100 border border-pastel-sand flex-shrink-0"
                                title="This cropped image will be saved for this item"
                              />
                              {/* Color Dot swatch */}
                              <div
                                className="w-9 h-9 rounded-xl shadow-inner border border-black/10 flex-shrink-0"
                                style={{ backgroundColor: item.colorHex }}
                                title={item.colorName}
                              />
                              <div className="flex-1">
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                                  className="font-semibold text-xs text-pastel-charcoal bg-transparent border-b border-transparent hover:border-pastel-sand focus:border-pastel-sage-dark focus:outline-none w-full"
                                />
                                <div className="flex items-center gap-1.5 text-[10px] text-pastel-muted mt-0.5 flex-wrap">
                                  <span className="capitalize font-medium text-pastel-charcoal/80">{item.colorName}</span>
                                  <span>•</span>
                                  <span className="capitalize">{item.fit}</span>
                                  <span>•</span>
                                  <span className="capitalize">{item.pattern}</span>
                                </div>
                              </div>
                            </div>

                            {/* Category Dropdown and Delete Action */}
                            <div className="flex items-center gap-2 self-end sm:self-center">
                              <select
                                value={item.category}
                                onChange={(e) => handleUpdateItem(idx, 'category', e.target.value as GarmentCategory)}
                                className="text-xs font-semibold py-1.5 px-2.5 rounded-xl bg-pastel-cream-100 border border-pastel-sand text-pastel-charcoal focus:outline-none focus:border-pastel-sage-medium"
                              >
                                <option value="tops">👚 Tops</option>
                                <option value="bottoms">👖 Bottoms</option>
                                <option value="dresses">👗 Dresses</option>
                                <option value="outerwear">🧥 Outerwear</option>
                                <option value="shoes">👟 Shoes</option>
                                <option value="bags">👜 Bags</option>
                                <option value="accessories">🕶️ Accessories</option>
                              </select>

                              {/* Delete item */}
                              <button
                                onClick={() => handleDeleteItem(idx)}
                                className="p-1.5 rounded-xl text-pastel-muted hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Remove this detected item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Duplicate Detection Alert Card */}
                          {dup && (
                            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs space-y-2.5 animate-fadeIn">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 text-amber-900 font-semibold text-[11px]">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>Duplicate Detected ({dup.confidence}% Match):</span>
                                  <span className="font-normal text-pastel-charcoal truncate">{dup.reason}</span>
                                </div>
                              </div>

                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-amber-200/60">
                                {/* Thumbnail of existing item */}
                                <div className="flex items-center gap-2">
                                  <img
                                    src={dup.matchedItem.imageUrl}
                                    alt={dup.matchedItem.name}
                                    className="w-8 h-8 rounded-lg object-cover border border-amber-200"
                                  />
                                  <span className="text-[11px] text-pastel-charcoal font-medium truncate max-w-[180px]">
                                    Already in closet: {dup.matchedItem.name}
                                  </span>
                                </div>

                                {/* Duplicate Resolution Buttons */}
                                <div className="flex items-center gap-1.5 self-end sm:self-center">
                                  <button
                                    type="button"
                                    onClick={() => handleEliminateDuplicate(idx)}
                                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] shadow-xs flex items-center gap-1"
                                    title="Do not add this duplicate item"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Eliminate Duplicate</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleReplace(idx, dup.matchedItem.id)}
                                    className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all flex items-center gap-1 border ${
                                      isReplacing
                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                        : 'bg-white text-pastel-charcoal border-pastel-sand hover:bg-pastel-cream-100'
                                    }`}
                                    title="Replace the old photo/item in closet with this one"
                                  >
                                    <ArrowRightLeft className="w-3 h-3" />
                                    <span>{isReplacing ? 'Will Replace Existing' : 'Replace Existing'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDismissDuplicate(idx)}
                                    className="px-2 py-1 rounded-lg text-pastel-muted hover:text-pastel-charcoal text-[10px] font-semibold"
                                  >
                                    Keep Both
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => {
                        setImagePreview(null);
                        setDetectedGarments([]);
                      }}
                      className="px-4 py-2 rounded-full text-xs font-semibold text-pastel-charcoal hover:bg-pastel-cream-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmAdd}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-pastel-sage-dark text-white text-xs font-bold shadow-soft hover:shadow-soft-lg hover:scale-102 transition-all"
                    >
                      <Check className="w-4 h-4" />
                      <span>Add {detectedGarments.length} Piece{detectedGarments.length > 1 ? 's' : ''} to Closet</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
