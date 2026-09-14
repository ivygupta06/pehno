import React, { useState, useRef } from 'react';
import { Sparkles, RotateCw, Heart, ShoppingBag, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';
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

export interface ColorShoppingOption {
  category: string;
  name: string;
  colorName: string;
  colorHex: string;
  reasoning: string;
  searchQuery: string;
}

export const WHEEL_SEGMENTS: WheelSegment[] = [
  {
    name: 'Yellow',
    label: 'Yellow',
    colorHex: '#EAB308',
    darkText: true,
    matchingKeywords: ['yellow', 'gold', 'mustard', 'lemon', 'butter', 'sunshine', 'amber'],
  },
  {
    name: 'Green',
    label: 'Green',
    colorHex: '#16A34A',
    darkText: false,
    matchingKeywords: ['green', 'olive', 'sage', 'emerald', 'mint', 'forest', 'pistachio'],
  },
  {
    name: 'Blue',
    label: 'Blue',
    colorHex: '#2563EB',
    darkText: false,
    matchingKeywords: ['blue', 'denim', 'navy', 'indigo', 'sky', 'cobalt', 'washer blue', 'light blue'],
  },
  {
    name: 'Pink',
    label: 'Pink',
    colorHex: '#EC4899',
    darkText: false,
    matchingKeywords: ['pink', 'rose', 'blush', 'magenta', 'fuchsia', 'coral pink', 'pastel pink'],
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

export const COLOR_SHOPPING_RECOMMENDATIONS: Record<string, ColorShoppingOption[]> = {
  Purple: [
    {
      category: 'Tops',
      name: 'Lavender Fine-Knit Top',
      colorName: 'Pastel Lilac',
      colorHex: '#C084FC',
      reasoning: 'Soft pastel lavender ribbed knit top for an effortless, gentle pop of color.',
      searchQuery: 'Lavender Fine Knit Top women',
    },
    {
      category: 'Bottoms',
      name: 'Plum Tailored Trousers',
      colorName: 'Deep Mulberry',
      colorHex: '#7E22CE',
      reasoning: 'Rich mulberry wide-leg trousers that elevate simple white or cream tops.',
      searchQuery: 'Plum Tailored Trousers women',
    },
    {
      category: 'Bags',
      name: 'Lilac Shoulder Bag',
      colorName: 'Soft Lilac',
      colorHex: '#E9D5FF',
      reasoning: 'Compact lilac baguette bag to add a subtle tonal highlight to any outfit.',
      searchQuery: 'Lilac Leather Shoulder Bag',
    },
  ],
  Yellow: [
    {
      category: 'Dresses',
      name: 'Butter Yellow Sundress',
      colorName: 'Butter Yellow',
      colorHex: '#FEF08A',
      reasoning: 'An airy butter-yellow sundress makes the colour the focal point without competing layers.',
      searchQuery: 'Butter Yellow Sundress women',
    },
    {
      category: 'Tops',
      name: 'Buttercream Knit Top',
      colorName: 'Soft Butter Yellow',
      colorHex: '#FEF08A',
      reasoning: 'Warm buttercream yellow rib top for a soft, radiant sunshine feel.',
      searchQuery: 'Buttercream Yellow Knit Top',
    },
    {
      category: 'Bottoms',
      name: 'Honey Mustard Midi Skirt',
      colorName: 'Honey Mustard',
      colorHex: '#CA8A04',
      reasoning: 'Rich honey pleated skirt for warm tonal depth with blue or white tops.',
      searchQuery: 'Honey Mustard Midi Skirt',
    },
    {
      category: 'Accessories',
      name: 'Lemon Leather Shoulder Tote',
      colorName: 'Lemon Yellow',
      colorHex: '#FACC15',
      reasoning: 'Vibrant lemon yellow shoulder tote for an energetic accent.',
      searchQuery: 'Lemon Yellow Leather Shoulder Tote',
    },
  ],
  Green: [
    {
      category: 'Outerwear',
      name: 'Sage Ribbed Cardigan',
      colorName: 'Soft Sage Green',
      colorHex: '#86EFAC',
      reasoning: 'Tranquil sage green cardigan with soft drape for easy layering.',
      searchQuery: 'Sage Green Ribbed Cardigan',
    },
    {
      category: 'Bottoms',
      name: 'Olive Wide-Leg Trousers',
      colorName: 'Deep Olive',
      colorHex: '#3F6212',
      reasoning: 'Tailored olive trousers providing high-contrast earthiness.',
      searchQuery: 'Olive Wide Leg Trousers',
    },
    {
      category: 'Dresses',
      name: 'Emerald Silk Slip Dress',
      colorName: 'Lustrous Emerald',
      colorHex: '#059669',
      reasoning: 'Rich emerald green satin slip dress for evening radiance.',
      searchQuery: 'Emerald Green Silk Slip Dress',
    },
  ],
  Blue: [
    {
      category: 'Outerwear',
      name: 'Vintage Washed Denim Jacket',
      colorName: 'Washer Indigo Blue',
      colorHex: '#60A5FA',
      reasoning: 'Timeless light wash denim jacket to anchor casual streetwear.',
      searchQuery: 'Vintage Light Wash Denim Jacket',
    },
    {
      category: 'Tops',
      name: 'Cobalt Blue Crop Top',
      colorName: 'Electric Cobalt',
      colorHex: '#2563EB',
      reasoning: 'High-contrast cobalt top that pops against neutrals and black.',
      searchQuery: 'Cobalt Blue Crop Top',
    },
    {
      category: 'Bags',
      name: 'Navy Leather Shoulder Bag',
      colorName: 'Deep Navy',
      colorHex: '#1E3A8A',
      reasoning: 'Classic navy leather handbag for sophisticated structure.',
      searchQuery: 'Navy Leather Shoulder Bag',
    },
  ],
  Pink: [
    {
      category: 'Tops',
      name: 'Blush Satin Camisole',
      colorName: 'Dusty Rose Pink',
      colorHex: '#F472B6',
      reasoning: 'Soft dusty pink satin top for romantic, graceful layering.',
      searchQuery: 'Blush Satin Camisole Top',
    },
    {
      category: 'Bottoms',
      name: 'Magenta Pleated Midi Skirt',
      colorName: 'Vibrant Magenta',
      colorHex: '#BE185D',
      reasoning: 'Playful deep pink midi skirt with fluid movement.',
      searchQuery: 'Magenta Pleated Midi Skirt',
    },
    {
      category: 'Shoes',
      name: 'Powder Pink Kitten Mules',
      colorName: 'Powder Pink',
      colorHex: '#FBCFE8',
      reasoning: 'Soft powder pink mules for chic pastel finishing touches.',
      searchQuery: 'Powder Pink Kitten Heel Mules',
    },
  ],
  Beige: [
    {
      category: 'Tops',
      name: 'Oatmeal Oversized Knit',
      colorName: 'Warm Oatmeal',
      colorHex: '#E5E7EB',
      reasoning: 'Cozy oat-toned soft knit for quiet luxury minimalism.',
      searchQuery: 'Oatmeal Oversized Knit Sweater',
    },
    {
      category: 'Outerwear',
      name: 'Camel Longline Trench',
      colorName: 'Golden Camel',
      colorHex: '#D97706',
      reasoning: 'Iconic camel trench coat bringing instant elegance to any outfit.',
      searchQuery: 'Camel Wool Trench Coat women',
    },
    {
      category: 'Bags',
      name: 'Taupe Leather Crossbody',
      colorName: 'Warm Taupe',
      colorHex: '#9CA3AF',
      reasoning: 'Versatile neutral taupe crossbody bag for everyday wear.',
      searchQuery: 'Taupe Leather Crossbody Bag',
    },
  ],
  Red: [
    {
      category: 'Dresses',
      name: 'Scarlet Wrap Dress',
      colorName: 'Scarlet Red',
      colorHex: '#DC2626',
      reasoning: 'A polished scarlet wrap dress gives the red story a clear, confident centrepiece.',
      searchQuery: 'Scarlet Red Wrap Dress women',
    },
    {
      category: 'Tops',
      name: 'Crimson Silk Blouse',
      colorName: 'Scarlet Crimson',
      colorHex: '#EF4444',
      reasoning: 'Vibrant crimson red silk blouse to command any room.',
      searchQuery: 'Crimson Red Silk Blouse',
    },
    {
      category: 'Outerwear',
      name: 'Burgundy Cropped Jacket',
      colorName: 'Deep Wine Burgundy',
      colorHex: '#881337',
      reasoning: 'Sophisticated deep wine burgundy cropped jacket.',
      searchQuery: 'Burgundy Leather Cropped Jacket',
    },
    {
      category: 'Shoes',
      name: 'Ruby Slingback Heels',
      colorName: 'Ruby Red',
      colorHex: '#DC2626',
      reasoning: 'Statement ruby red slingback heels for evening outfits.',
      searchQuery: 'Ruby Red Slingback Heels',
    },
  ],
  White: [
    {
      category: 'Dresses',
      name: 'White Cotton Sundress',
      colorName: 'Crisp White',
      colorHex: '#FAF9F6',
      reasoning: 'A clean white sundress is a versatile base for denim, tan leather, or a bright accessory.',
      searchQuery: 'White Cotton Sundress women',
    },
    {
      category: 'Outerwear',
      name: 'Ivory Cropped Cardigan',
      colorName: 'Soft Ivory',
      colorHex: '#FFFDF5',
      reasoning: 'An ivory cropped cardigan adds light texture while keeping an all-white look intentional.',
      searchQuery: 'Ivory Cropped Cardigan women',
    },
    {
      category: 'Shoes',
      name: 'White Leather Sneakers',
      colorName: 'Crisp White',
      colorHex: '#FAF9F6',
      reasoning: 'Minimal white leather sneakers ground the palette for an easy everyday finish.',
      searchQuery: 'White Leather Sneakers women',
    },
  ],
  Orange: [
    {
      category: 'Tops',
      name: 'Terracotta Linen Shirt',
      colorName: 'Earthy Terracotta',
      colorHex: '#EA580C',
      reasoning: 'Warm terracotta linen shirt for breezy, organic warmth.',
      searchQuery: 'Terracotta Linen Shirt women',
    },
    {
      category: 'Bottoms',
      name: 'Rust Pleated Skirt',
      colorName: 'Burnt Rust',
      colorHex: '#C2410C',
      reasoning: 'Deep burnt orange rust pleated skirt with rich movement.',
      searchQuery: 'Rust Burnt Orange Pleated Skirt',
    },
    {
      category: 'Bags',
      name: 'Peach Woven Straw Tote',
      colorName: 'Soft Peach',
      colorHex: '#FDBA74',
      reasoning: 'Warm peach woven tote bag for relaxed summer outings.',
      searchQuery: 'Peach Woven Straw Tote Bag',
    },
  ],
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hasColorKeyword = (value: string, keyword: string) => {
  const normalized = value.toLowerCase().replace(/[_/]+/g, ' ');
  return new RegExp(`(^|[^a-z])${escapeRegExp(keyword.toLowerCase())}(?=$|[^a-z])`).test(normalized);
};

/**
 * Uses the detected primary colour first. This prevents a garment tagged with a
 * secondary styling word from appearing in the wrong wheel result (for example,
 * a yellow dress tagged "red-carpet" appearing under Red).
 */
export const itemMatchesWheelSegment = (item: GarmentItem, segment: WheelSegment) => {
  const colorName = (item.colorName || '').trim();
  const primaryColorMatches = WHEEL_SEGMENTS.filter(candidate =>
    candidate.matchingKeywords.some(keyword => hasColorKeyword(colorName, keyword))
  );

  if (primaryColorMatches.length > 0) {
    return primaryColorMatches.some(candidate => candidate.name === segment.name);
  }

  const fallbackDetails = [item.name || '', ...(item.tags || [])];
  return fallbackDetails.some(detail =>
    segment.matchingKeywords.some(keyword => hasColorKeyword(detail, keyword))
  );
};

const heroPriority: Record<GarmentItem['category'], number> = {
  dresses: 0,
  tops: 1,
  bottoms: 2,
  outerwear: 3,
  shoes: 4,
  bags: 5,
  accessories: 6,
};

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
  const [shoppingOptions, setShoppingOptions] = useState<ColorShoppingOption[]>([]);
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
    setShoppingOptions([]);
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

  // Find wardrobe items matching the color and build an outfit or generate shopping options
  const composeColorOutfit = (segment: WheelSegment) => {
    const activeWardrobe = wardrobe.length > 0 ? wardrobe : INITIAL_WARDROBE;

    const matches = activeWardrobe.filter(item => itemMatchesWheelSegment(item, segment));

    setMatchingItems(matches);
    setShoppingOptions(COLOR_SHOPPING_RECOMMENDATIONS[segment.name] || []);

    // IF user HAS garments in this color in their closet:
    if (matches.length > 0) {
      // Prefer a dress as the hero when one is available, then build around it.
      // This avoids a small accessory taking over a full-colour outfit result.
      const heroGarment = [...matches].sort(
        (a, b) => heroPriority[a.category] - heroPriority[b.category]
      )[0];

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
      // Bag is optional — only include bag if 35% probability or specific occasion (not forced for every fit)
      if (!bag && Math.random() < 0.35) {
        bag = activeWardrobe.find((i) => i.category === 'bags');
      }
      if (!outerwear && Math.random() > 0.5) {
        outerwear = activeWardrobe.find((i) => i.category === 'outerwear');
      }

      const items = [top, bottom, dress, outerwear, shoes, bag].filter((i): i is GarmentItem => Boolean(i));
      const harmony = evaluateColorHarmony(
        items.map((i) => ({ hex: i.colorHex || '#FFFFFF', name: i.colorName || 'Neutral' }))
      );

      // Generate 2 recommendations to complete the look
      const segmentRecs = COLOR_SHOPPING_RECOMMENDATIONS[segment.name] || [];
      const spinExternalSuggestions = segmentRecs.slice(0, 2).map((rec, rIdx) => ({
        id: `spin-ext-${segment.name.toLowerCase()}-${rIdx}-${Date.now()}`,
        category: (rec.category.toLowerCase() as any) || 'accessories',
        name: rec.name,
        color: rec.colorName,
        colorHex: rec.colorHex,
        reasoning: rec.reasoning,
        searchQuery: rec.searchQuery,
        vibe: 'chic' as StyleAesthetic,
      }));

      const newOutfit: Outfit = {
        id: `spin-outfit-${Date.now()}`,
        title: `${segment.name} Closet Statement`,
        description: `Custom outfit built around your real ${segment.name} piece from your closet!`,
        vibe: (heroGarment.aesthetics?.[0] as StyleAesthetic) || 'casual',
        occasion: 'casual',
        colorHarmonyType: harmony.harmonyType,
        compatibilityScore: Math.max(90, harmony.score),
        top,
        bottom,
        dress,
        outerwear,
        shoes,
        bag,
        externalSuggestions: spinExternalSuggestions,
        stylingNotes: [
          `Curated around your real ${segment.name} item (${heroGarment.name}) in your closet!`,
          harmony.description,
          `Pairing ${segment.name} tones creates an intentional, elevated visual focal point.`,
        ],
        createdAt: Date.now(),
      };

      setGeneratedOutfit(newOutfit);
    } else {
      // IF user DOES NOT HAVE garments in this color in their closet:
      setGeneratedOutfit(null);
    }
  };

  const handleSelectColor = (segment: WheelSegment) => {
    if (isSpinning) return;
    setSelectedSegment(segment);
    setGeneratedOutfit(null);
    setSavedSuccess(false);
    composeColorOutfit(segment);
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

      {/* Direct selection makes each palette testable without waiting for another spin. */}
      <div className="text-center space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-pastel-muted">
          Or choose a colour directly
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {WHEEL_SEGMENTS.map(segment => (
            <button
              key={segment.name}
              type="button"
              onClick={() => handleSelectColor(segment)}
              disabled={isSpinning}
              aria-pressed={selectedSegment?.name === segment.name}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                selectedSegment?.name === segment.name
                  ? 'border-pastel-charcoal bg-pastel-charcoal text-white shadow-soft'
                  : 'border-pastel-sand bg-white text-pastel-charcoal hover:border-amber-400 hover:shadow-xs'
              } ${isSpinning ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <span
                className="h-3 w-3 rounded-full border border-black/15"
                style={{ backgroundColor: segment.colorHex }}
              />
              {segment.label}
            </button>
          ))}
        </div>
      </div>

      {/* Case 1: USER HAS ITEMS IN THIS COLOR IN THEIR CLOSET */}
      {selectedSegment && !isSpinning && generatedOutfit && matchingItems.length > 0 && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-pastel-sand/70 shadow-card space-y-6 animate-slide-up bg-white">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-pastel-sand/40 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-3 h-3 rounded-full inline-block shadow-sm"
                  style={{ backgroundColor: selectedSegment.colorHex }}
                />
                <span className="text-xs font-bold uppercase tracking-wider text-pastel-muted">
                  {selectedSegment.name} Closet Outfit
                </span>
                <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  <span>{generatedOutfit.compatibilityScore}% Match</span>
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

          {/* Complete the Look (2 Recommended Shopping Additions) */}
          {generatedOutfit.externalSuggestions && generatedOutfit.externalSuggestions.length > 0 && (
            <div className="pt-4 border-t border-pastel-sand/50 space-y-3">
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-pastel-charcoal flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Complete the Look (2 Recommended Additions)</span>
                </h5>
                <p className="text-[11px] text-pastel-muted mt-0.5">
                  Curated shopping recommendations to complete your {selectedSegment.name} outfit:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {generatedOutfit.externalSuggestions.map((sugg) => (
                  <div
                    key={sugg.id}
                    className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50/60 to-pastel-cream-100 border border-pastel-sand/70 flex items-start justify-between gap-3 shadow-xs"
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

                    <a
                      href={`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(sugg.searchQuery || sugg.name)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-pastel-cream-200 border border-pastel-sand text-[10px] font-bold text-pastel-charcoal whitespace-nowrap shadow-xs hover:shadow-soft transition-all flex-shrink-0"
                    >
                      <span>Inspo / Shop</span>
                      <ExternalLink className="w-3 h-3 text-pastel-muted" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Case 2: NO ITEMS OF THIS COLOR IN CLOSET -> SHOW NOTICE + BUYING OPTIONS */}
      {selectedSegment && !isSpinning && matchingItems.length === 0 && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-amber-200 shadow-card space-y-6 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 animate-slide-up">
          
          <div className="flex items-start gap-3 bg-amber-100/70 border border-amber-300/60 p-4 rounded-2xl">
            <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                No {selectedSegment.name} items currently in your closet!
              </h4>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                You don't have any {selectedSegment.name.toLowerCase()} pieces in your wardrobe right now. Here are curated shopping suggestions to add {selectedSegment.name} options to your collection:
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-serif text-xl font-bold text-pastel-charcoal mb-4 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-600" />
              <span>Recommended {selectedSegment.name} Buying Options</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {shoppingOptions.map((opt, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-4 border border-pastel-sand/60 shadow-soft hover:shadow-card transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-pastel-cream-200 text-pastel-charcoal">
                        {opt.category}
                      </span>
                      <span
                        className="w-4 h-4 rounded-full border border-black/15 shadow-xs"
                        style={{ backgroundColor: opt.colorHex }}
                        title={opt.colorName}
                      />
                    </div>

                    <h5 className="font-serif text-base font-bold text-pastel-charcoal">
                      {opt.name}
                    </h5>

                    <p className="text-xs text-pastel-muted leading-relaxed">
                      {opt.reasoning}
                    </p>
                  </div>

                  <a
                    href={`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(opt.searchQuery)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Find & Shop</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Available Wardrobe Matches Preview (If user HAS items in this color) */}
      {selectedSegment && !isSpinning && matchingItems.length > 0 && (
        <div className="glass-panel rounded-3xl p-6 border border-pastel-sand/50 shadow-soft bg-white/70">
          <h4 className="font-serif text-lg font-bold text-pastel-charcoal mb-3">
            Your {selectedSegment.name} Closet Pieces ({matchingItems.length})
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

      {/* Optional Buying Options (If user ALREADY HAS items, but wants to expand palette) */}
      {selectedSegment && !isSpinning && matchingItems.length > 0 && shoppingOptions.length > 0 && (
        <div className="glass-panel rounded-3xl p-6 border border-pastel-sand/50 bg-white/60 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-serif text-lg font-bold text-pastel-charcoal flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-amber-600" />
              <span>Expand Your {selectedSegment.name} Collection</span>
            </h4>
            <span className="text-xs text-pastel-muted">Shopping Ideas</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {shoppingOptions.map((opt, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-3 border border-pastel-sand/40 text-xs flex flex-col justify-between space-y-2"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-pastel-charcoal">{opt.name}</span>
                    <span
                      className="w-3 h-3 rounded-full border border-black/10"
                      style={{ backgroundColor: opt.colorHex }}
                    />
                  </div>
                  <p className="text-[11px] text-pastel-muted line-clamp-2">{opt.reasoning}</p>
                </div>

                <a
                  href={`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(opt.searchQuery)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-1.5 rounded-xl bg-pastel-cream-200 hover:bg-amber-100 text-pastel-charcoal text-[11px] font-bold transition-all flex items-center justify-center gap-1"
                >
                  <span>Shop Item</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
