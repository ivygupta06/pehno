import React, { useState, useRef } from 'react';
import { Sparkles, RotateCw, Heart } from 'lucide-react';
import { GarmentItem, Outfit, StyleAesthetic } from '../types/wardrobe';
import { INITIAL_WARDROBE } from '../data/initialWardrobe';
import { evaluateColorHarmony } from '../lib/colorTheory';

interface ColorWheelViewProps {
  wardrobe: GarmentItem[];
  favorites: Outfit[];
  onSaveFavorite: (outfit: Outfit) => void;
  onSelectGarmentToStyle?: (item: GarmentItem) => void;
  onNavigateToStylist?: () => void;
}

export interface WheelSegment {
  name: string;
  label: string;
  colorHex: string;
  darkText?: boolean;
  matchingKeywords: string[];
}

export const WHEEL_SEGMENTS: WheelSegment[] = [
  {
    name: 'Yellow',
    label: 'Yellow',
    colorHex: '#EAB308',
    darkText: true,
    matchingKeywords: ['yellow', 'gold', 'mustard', 'lemon', 'cream', 'butter', 'sunshine', 'amber'],
  },
  {
    name: 'Green',
    label: 'Green',
    colorHex: '#16A34A',
    darkText: false,
    matchingKeywords: ['green', 'olive', 'sage', 'emerald', 'mint', 'khaki', 'forest', 'pistachio'],
  },
  {
    name: 'Blue',
    label: 'Blue',
    colorHex: '#2563EB',
    darkText: false,
    matchingKeywords: ['blue', 'denim', 'navy', 'indigo', 'sky', 'cobalt', 'washer blue', 'light blue'],
  },
  {
    name: 'Purple',
    label: 'Purple',
    colorHex: '#7C3AED',
    darkText: false,
    matchingKeywords: ['purple', 'lavender', 'lilac', 'plum', 'mauve', 'violet', 'grape'],
  },
  {
    name: 'Pink',
    label: 'Pink',
    colorHex: '#EC4899',
    darkText: false,
    matchingKeywords: ['pink', 'rose', 'blush', 'magenta', 'fuchsia', 'coral pink', 'pastel pink'],
  },
  {
    name: 'Beige',
    label: 'Beige',
    colorHex: '#D97706',
    darkText: false,
    matchingKeywords: ['beige', 'tan', 'nude', 'camel', 'oat', 'cream', 'khaki', 'sand', 'taupe', 'brown'],
  },
  {
    name: 'Red',
    label: 'Red',
    colorHex: '#DC2626',
    darkText: false,
    matchingKeywords: ['red', 'crimson', 'burgundy', 'wine', 'maroon', 'cherry', 'ruby', 'scarlet'],
  },
  {
    name: 'Orange',
    label: 'Orange',
    colorHex: '#EA580C',
    darkText: false,
    matchingKeywords: ['orange', 'rust', 'terracotta', 'peach', 'apricot', 'tangerine'],
  },
];

export const ColorWheelView: React.FC<ColorWheelViewProps> = ({
  wardrobe,
  favorites,
  onSaveFavorite,
  onSelectGarmentToStyle,
  onNavigateToStylist,
}) => {
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<WheelSegment | null>(null);
  const [matchingItems, setMatchingItems] = useState<GarmentItem[]>([]);
  const [generatedOutfit, setGeneratedOutfit] = useState<Outfit | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const currentRotationRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Play subtle tick sound when spinning
  const playTickSound = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.03);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } catch (e) {
      // Audio not supported or blocked
    }
  };

  const handleSpin = () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setSelectedSegment(null);
    setGeneratedOutfit(null);
    setSavedSuccess(false);

    // Choose random slice (0 to 7)
    const targetIdx = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
    const targetSegment = WHEEL_SEGMENTS[targetIdx];

    // Calculate rotation to place targetIdx at the TOP pointer (12 o'clock)
    const numSlices = WHEEL_SEGMENTS.length;
    const sliceDeg = 360 / numSlices;
    
    // Slight random offset inside slice (-10 to +10 deg) for realistic landing safely inside slice bounds
    const randomOffset = (Math.random() - 0.5) * (sliceDeg * 0.4);
    
    // Target slice center angle from 0
    const sliceCenterDeg = targetIdx * sliceDeg + sliceDeg / 2;
    // To land slice center at top pointer (0 deg), new angle mod 360 = (360 - sliceCenterDeg + randomOffset)
    const targetModDeg = (360 - sliceCenterDeg + randomOffset + 360) % 360;

    // Add 6 to 9 full spins
    const fullSpins = (6 + Math.floor(Math.random() * 3)) * 360;
    const currentMod = currentRotationRef.current % 360;
    
    let additionalDeg = targetModDeg - currentMod;
    if (additionalDeg < 0) additionalDeg += 360;
    
    const finalRotation = currentRotationRef.current + fullSpins + additionalDeg;
    currentRotationRef.current = finalRotation;
    setRotationAngle(finalRotation);

    // Audio ticks during spin
    let tickCount = 0;
    const totalTicks = 25;
    const tickInterval = setInterval(() => {
      tickCount++;
      playTickSound();
      if (tickCount >= totalTicks) {
        clearInterval(tickInterval);
      }
    }, 150);

    // Land after 4 seconds
    setTimeout(() => {
      setIsSpinning(false);
      setSelectedSegment(targetSegment);
      composeColorOutfit(targetSegment);
    }, 4000);
  };

  // Find wardrobe items matching the color and build an outfit
  const composeColorOutfit = (segment: WheelSegment) => {
    const activeWardrobe = wardrobe.length > 0 ? wardrobe : INITIAL_WARDROBE;

    // Filter items matching the segment keywords or hex/tone
    const matches = activeWardrobe.filter((item) => {
      const nameLower = (item.name || '').toLowerCase();
      const colorLower = (item.colorName || '').toLowerCase();
      const tags = (item.tags || []).map((t) => t.toLowerCase());

      return segment.matchingKeywords.some(
        (kw) => nameLower.includes(kw) || colorLower.includes(kw) || tags.some((t) => t.includes(kw))
      );
    });

    setMatchingItems(matches);

    // Compose an outfit
    // 1. Pick a primary hero garment in the selected color
    let heroGarment = matches[0];
    if (!heroGarment) {
      // If no exact item, pick a random item from wardrobe to anchor
      heroGarment = activeWardrobe[Math.floor(Math.random() * activeWardrobe.length)];
    }

    let top: GarmentItem | undefined;
    let bottom: GarmentItem | undefined;
    let dress: GarmentItem | undefined;
    let outerwear: GarmentItem | undefined;
    let shoes: GarmentItem | undefined;
    let bag: GarmentItem | undefined;

    if (heroGarment.category === 'dresses') {
      dress = heroGarment;
    } else if (heroGarment.category === 'tops') {
      top = heroGarment;
    } else if (heroGarment.category === 'bottoms') {
      bottom = heroGarment;
    } else if (heroGarment.category === 'outerwear') {
      outerwear = heroGarment;
    } else if (heroGarment.category === 'shoes') {
      shoes = heroGarment;
    } else if (heroGarment.category === 'bags') {
      bag = heroGarment;
    }

    // Fill in complementary pieces
    if (!dress) {
      if (!top) {
        top = activeWardrobe.find((i) => i.category === 'tops');
      }
      if (!bottom) {
        bottom = activeWardrobe.find((i) => i.category === 'bottoms');
      }
    }

    if (!shoes) {
      shoes = activeWardrobe.find((i) => i.category === 'shoes');
    }
    if (!bag) {
      bag = activeWardrobe.find((i) => i.category === 'bags');
    }
    if (!outerwear && Math.random() > 0.5) {
      outerwear = activeWardrobe.find((i) => i.category === 'outerwear');
    }

    const items = [top, bottom, dress, outerwear, shoes, bag].filter((i): i is GarmentItem => Boolean(i));
    const harmony = evaluateColorHarmony(items.map((i) => ({ hex: i.colorHex || '#FFFFFF', name: i.colorName || 'Neutral' })));

    const outfitTitle = matches.length > 0
      ? `${segment.name} Palette Statement`
      : `${segment.name} Accent Harmony`;

    const newOutfit: Outfit = {
      id: `spin-outfit-${Date.now()}`,
      title: outfitTitle,
      description: `Custom outfit curated around your ${segment.name} color spin!`,
      vibe: (heroGarment.aesthetics?.[0] as StyleAesthetic) || 'casual',
      occasion: 'casual',
      colorHarmonyType: harmony.harmonyType,
      compatibilityScore: Math.max(88, harmony.score),
      top,
      bottom,
      dress,
      outerwear,
      shoes,
      bag,
      stylingNotes: [
        `Curated specifically around your ${segment.name} wheel spin!`,
        harmony.description,
        `Pairing ${segment.name} tones creates an intentional, elevated visual focus.`,
      ],
      createdAt: Date.now(),
    };

    setGeneratedOutfit(newOutfit);
  };

  const isFavorite = generatedOutfit
    ? favorites.some((f) => f.id === generatedOutfit.id || f.title === generatedOutfit.title)
    : false;

  const handleSave = () => {
    if (generatedOutfit && !isFavorite) {
      onSaveFavorite(generatedOutfit);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-10 animate-fade-in">
      
      {/* Header Banner */}
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-widest text-amber-700 bg-amber-100/80 px-3 py-1 rounded-full inline-block shadow-sm">
          Wardrobe Manager
        </span>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-pastel-charcoal tracking-tight">
          Spin for a color
        </h1>
        <p className="text-sm sm:text-base text-pastel-muted leading-relaxed">
          Let chance pick your palette — we'll style an outfit around it.
        </p>
      </div>

      {/* Wheel Area Container (Light Warm Pehno Aesthetics - NO dark/purple background!) */}
      <div className="relative glass-panel rounded-3xl p-6 sm:p-10 border border-pastel-sand/60 shadow-soft flex flex-col items-center justify-center bg-gradient-to-b from-white/90 via-pastel-cream-100/40 to-pastel-cream-200/50">
        
        {/* Top Pointer Arrow */}
        <div className="z-20 -mb-4 flex flex-col items-center drop-shadow-md transform transition-transform hover:scale-110">
          <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-amber-500" />
        </div>

        {/* Wheel Graphic Container */}
        <div className="relative w-72 h-72 sm:w-96 sm:h-96 my-4 select-none">
          
          {/* Wheel Shadow & Outer Ring */}
          <div className="absolute inset-0 rounded-full bg-white shadow-xl border-4 border-amber-400/30 overflow-hidden transition-all duration-300">
            
            {/* Spinning Wheel SVG */}
            <div
              className="w-full h-full rounded-full"
              style={{
                transform: `rotate(${rotationAngle}deg)`,
                transition: isSpinning
                  ? 'transform 4s cubic-bezier(0.15, 0.9, 0.2, 1)'
                  : 'none',
              }}
            >
              <svg viewBox="0 0 400 400" className="w-full h-full transform -rotate-90">
                {WHEEL_SEGMENTS.map((seg, i) => {
                  const numSlices = WHEEL_SEGMENTS.length;
                  const sliceAngle = (2 * Math.PI) / numSlices;
                  const startAngle = i * sliceAngle;
                  const endAngle = (i + 1) * sliceAngle;

                  const r = 200;
                  const cx = 200;
                  const cy = 200;

                  const x1 = cx + r * Math.cos(startAngle);
                  const y1 = cy + r * Math.sin(startAngle);
                  const x2 = cx + r * Math.cos(endAngle);
                  const y2 = cy + r * Math.sin(endAngle);

                  const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;

                  // Midpoint for text
                  const midAngle = startAngle + sliceAngle / 2;
                  const textR = r * 0.62;
                  const tx = cx + textR * Math.cos(midAngle);
                  const ty = cy + textR * Math.sin(midAngle);

                  const rotateDeg = (midAngle * 180) / Math.PI;

                  return (
                    <g key={seg.name}>
                      {/* Wedge */}
                      <path
                        d={pathData}
                        fill={seg.colorHex}
                        stroke="#ffffff"
                        strokeWidth="3"
                        className="transition-opacity hover:opacity-95"
                      />
                      {/* Label Text */}
                      <text
                        x={tx}
                        y={ty}
                        fill={seg.darkText ? '#1F2937' : '#FFFFFF'}
                        fontSize="15"
                        fontWeight="700"
                        fontFamily="sans-serif"
                        textAnchor="middle"
                        dominantBaseline="central"
                        transform={`rotate(${rotateDeg}, ${tx}, ${ty})`}
                        style={{
                          textShadow: seg.darkText
                            ? 'none'
                            : '0px 1px 3px rgba(0,0,0,0.5)',
                        }}
                      >
                        {seg.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Center Golden Pin */}
          <div className="absolute inset-0 m-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-300 border-4 border-white shadow-lg z-10 flex items-center justify-center pointer-events-none">
            <div className="w-5 h-5 rounded-full bg-amber-600/40 shadow-inner" />
          </div>
        </div>

        {/* Spin Button */}
        <div className="mt-6 flex flex-col items-center gap-3 z-10">
          <button
            onClick={handleSpin}
            disabled={isSpinning}
            className={`px-8 py-3.5 rounded-full font-serif font-bold text-base shadow-lg transition-all transform flex items-center gap-2.5 ${
              isSpinning
                ? 'bg-amber-300 text-amber-900 opacity-80 cursor-not-allowed scale-95'
                : 'bg-amber-500 hover:bg-amber-600 text-white hover:scale-105 active:scale-95 shadow-amber-500/25'
            }`}
          >
            <RotateCw className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
            <span>{isSpinning ? 'Spinning...' : selectedSegment ? 'Spin again' : 'Spin the Wheel'}</span>
          </button>

          {/* Result Text */}
          {selectedSegment && !isSpinning && (
            <div className="text-center mt-3 animate-fade-in">
              <p className="text-xs text-pastel-muted uppercase tracking-widest font-semibold">
                Landed on
              </p>
              <h2
                className="font-serif text-3xl sm:text-4xl font-bold mt-1 tracking-tight"
                style={{ color: selectedSegment.colorHex }}
              >
                {selectedSegment.name}
              </h2>
            </div>
          )}
        </div>
      </div>

      {/* Generated Outfit Result Card */}
      {selectedSegment && !isSpinning && generatedOutfit && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-pastel-sand/70 shadow-card space-y-6 animate-slide-up bg-white">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-pastel-sand/40 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-3 h-3 rounded-full inline-block shadow-sm"
                  style={{ backgroundColor: selectedSegment.colorHex }}
                />
                <span className="text-xs font-bold uppercase tracking-wider text-pastel-muted">
                  {selectedSegment.name} Theme Outfit
                </span>
                <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {generatedOutfit.compatibilityScore}% Match
                </span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-pastel-charcoal">
                {generatedOutfit.title}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={isFavorite || savedSuccess}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-sm ${
                  isFavorite || savedSuccess
                    ? 'bg-rose-50 text-rose-600 border border-rose-200 cursor-default'
                    : 'bg-pastel-rose-light hover:bg-pastel-rose text-pastel-rose-dark'
                }`}
              >
                <Heart className={`w-4 h-4 ${isFavorite || savedSuccess ? 'fill-rose-600 text-rose-600' : ''}`} />
                <span>{savedSuccess ? 'Saved!' : isFavorite ? 'Saved to Favorites' : 'Save Fit'}</span>
              </button>

              {onNavigateToStylist && (
                <button
                  onClick={onNavigateToStylist}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-pastel-sage-light hover:bg-pastel-sage text-pastel-sage-dark transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>AI Stylist</span>
                </button>
              )}
            </div>
          </div>

          {/* Garments Grid */}
          <div>
            <h4 className="text-xs font-bold text-pastel-muted uppercase tracking-wider mb-4">
              Outfit Pieces ({[generatedOutfit.top, generatedOutfit.bottom, generatedOutfit.dress, generatedOutfit.outerwear, generatedOutfit.shoes, generatedOutfit.bag].filter(Boolean).length})
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                generatedOutfit.dress,
                generatedOutfit.top,
                generatedOutfit.bottom,
                generatedOutfit.outerwear,
                generatedOutfit.shoes,
                generatedOutfit.bag,
              ]
                .filter((item): item is GarmentItem => Boolean(item))
                .map((item) => (
                  <div
                    key={item.id}
                    className="group bg-pastel-cream-100/60 rounded-2xl p-3 border border-pastel-sand/40 hover:shadow-soft transition-all duration-300 flex flex-col justify-between"
                  >
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-white mb-2 shadow-inner">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/90 text-pastel-charcoal backdrop-blur-sm shadow-xs">
                        {item.category}
                      </span>
                    </div>

                    <div>
                      <h5 className="font-serif text-sm font-bold text-pastel-charcoal truncate">
                        {item.name}
                      </h5>
                      <p className="text-[11px] text-pastel-muted flex items-center gap-1.5 mt-0.5">
                        <span
                          className="w-2 h-2 rounded-full inline-block border border-black/10"
                          style={{ backgroundColor: item.colorHex || '#ddd' }}
                        />
                        <span>{item.colorName || 'Neutral'}</span>
                      </p>
                    </div>

                    {onSelectGarmentToStyle && (
                      <button
                        onClick={() => onSelectGarmentToStyle(item)}
                        className="mt-3 w-full py-1.5 rounded-xl bg-white hover:bg-pastel-sage-light text-pastel-charcoal hover:text-pastel-sage-dark text-[11px] font-bold border border-pastel-sand/60 transition-all flex items-center justify-center gap-1"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Style Item</span>
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* Styling Notes */}
          {generatedOutfit.stylingNotes && generatedOutfit.stylingNotes.length > 0 && (
            <div className="bg-pastel-cream-100/50 rounded-2xl p-4 border border-pastel-sand/40">
              <h5 className="text-xs font-bold text-pastel-charcoal uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Styling Notes</span>
              </h5>
              <ul className="space-y-1.5 text-xs text-pastel-charcoal/80">
                {generatedOutfit.stylingNotes.map((note, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-500">•</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Available Wardrobe Matches Preview */}
      {selectedSegment && !isSpinning && matchingItems.length > 0 && (
        <div className="glass-panel rounded-3xl p-6 border border-pastel-sand/50 shadow-soft bg-white/70">
          <h4 className="font-serif text-lg font-bold text-pastel-charcoal mb-3">
            Your {selectedSegment.name} Pieces ({matchingItems.length})
          </h4>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {matchingItems.map((item) => (
              <div
                key={item.id}
                className="flex-shrink-0 w-28 bg-white p-2.5 rounded-2xl border border-pastel-sand/40 text-center shadow-xs hover:shadow-soft transition-all"
              >
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-20 object-cover rounded-xl mb-2"
                />
                <p className="text-xs font-bold text-pastel-charcoal truncate">{item.name}</p>
                <p className="text-[10px] text-pastel-muted uppercase">{item.subcategory || item.category}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
