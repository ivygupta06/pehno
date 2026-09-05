import { GarmentItem, Outfit, Occasion, ExternalSuggestion, StyleAesthetic } from '../types/wardrobe';
import { evaluateColorHarmony } from './colorTheory';

// Fashion style names and formulas
interface StyleFormula {
  vibe: StyleAesthetic;
  titlePrefix: string;
  notesGenerator: (_items?: (GarmentItem | undefined)[]) => string[];
}

const OCCASION_FORMULAS: Record<Occasion, StyleFormula[]> = {
  class: [
    {
      vibe: 'casual',
      titlePrefix: 'Effortless Campus Staple',
      notesGenerator: () => [
        'Relaxed silhouette prioritizing comfort and ease between lectures.',
        'Sneakers provide all-day mobility while neutral tones maintain a cohesive look.',
        'Spacious tote bag completes the functional campus aesthetic.',
      ],
    },
    {
      vibe: 'preppy',
      titlePrefix: 'Chic Academic Aesthetic',
      notesGenerator: () => [
        'Clean layering with structured textures brings elevated prep energy.',
        'Loafers or crisp footwear offer a collegiate, bookish charm.',
        'Minimalist gold jewelry keeps it understated yet intentional.',
      ],
    },
    {
      vibe: 'streetwear',
      titlePrefix: 'Cool & Relaxed University Fit',
      notesGenerator: () => [
        'Boxy cut contrasted against fluid bottoms gives modern streetwear proportions.',
        'Effortless accessories tie together a laid-back, confident look.',
      ],
    },
  ],
  date: [
    {
      vibe: 'romantic',
      titlePrefix: 'Golden Hour Romance',
      notesGenerator: () => [
        'Delicate textures with soft drape catch the light beautifully.',
        'Kitten mules or sleek footwear elevate the line without feeling stiff.',
        'Subtle gold accents accentuate the neckline and wrists.',
      ],
    },
    {
      vibe: 'chic',
      titlePrefix: 'Elevated Dinner & Drinks',
      notesGenerator: () => [
        'Structured tailoring paired with fluid pieces creates sophisticated modern tension.',
        'A compact shoulder bag keeps the silhouette sleek and unfussy.',
        'High contrast between tones gives photographic depth.',
      ],
    },
    {
      vibe: 'minimalist',
      titlePrefix: 'Quiet Luxury Evening',
      notesGenerator: () => [
        'Monochromatic or tonal palette exudes effortless quiet luxury.',
        'Clean lines speak for themselves without needing excessive layers.',
      ],
    },
  ],
  brunch: [
    {
      vibe: 'chic',
      titlePrefix: 'Sunlit Patio Chic',
      notesGenerator: () => [
        'Pastel tones harmonize seamlessly with natural morning light.',
        'Woven textures and relaxed fabrics keep the vibe airy and social.',
        'Statement sunglasses add an editorial finishing flourish.',
      ],
    },
    {
      vibe: 'bohemian',
      titlePrefix: 'Breezy Weekend Leisure',
      notesGenerator: () => [
        'Organic cotton or linen drape provides breathable, tactile luxury.',
        'Tonal earth and pastel tones create an approachable, radiant mood.',
      ],
    },
    {
      vibe: 'casual',
      titlePrefix: 'Latte Run & Market Stroll',
      notesGenerator: () => [
        'Sneakers keep you walking effortlessly through town.',
        'Layered knit or cardigan ready for transitioning from morning breeze to midday sun.',
      ],
    },
  ],
  office: [
    {
      vibe: 'formal',
      titlePrefix: 'Executive Smart Casual',
      notesGenerator: () => [
        'Tailored trousers anchor the outfit with professional polish.',
        'Structured outerwear and sleek loafers command authority with modern comfort.',
        'A clean leather shoulder or tote bag keeps workspace essentials organized.',
      ],
    },
    {
      vibe: 'minimalist',
      titlePrefix: 'Contemporary Studio Professional',
      notesGenerator: () => [
        'Tonal cream and neutral palette reflects modern creative workplace aesthetics.',
        'High-waisted silhouette creates an elongating, confident posture.',
      ],
    },
    {
      vibe: 'preppy',
      titlePrefix: 'Tailored Power Meeting',
      notesGenerator: () => [
        'Sharp button-down or knit structure paired with timeless accessories.',
        'Subtle metal accents bring just the right amount of gleam under office lighting.',
      ],
    },
  ],
  party: [
    {
      vibe: 'chic',
      titlePrefix: 'Midnight Glow Statement',
      notesGenerator: () => [
        'Fitted silhouette and eye-catching drape stand out under evening lighting.',
        'Strappy mules or heels lengthen the legs and add celebratory energy.',
        'Compact clutch or baguette bag keeps hands free for socializing.',
      ],
    },
    {
      vibe: 'streetwear',
      titlePrefix: 'After-Hours Socialite',
      notesGenerator: () => [
        'Edgy mix of textures like denim with sleek satin or structured tailoring.',
        'Gold jewelry catches moving lights effortlessly.',
      ],
    },
    {
      vibe: 'romantic',
      titlePrefix: 'Satin & Candlelight',
      notesGenerator: () => [
        'Lustrous fabrics create movement and sensuality.',
        'Minimalist accessories allow the garment silhouette to take center stage.',
      ],
    },
  ],
  casual: [
    {
      vibe: 'casual',
      titlePrefix: 'Clean Everyday Balance',
      notesGenerator: () => [
        'The quintessential white top + blue jeans formula updated with modern proportions.',
        'Retro sneakers and casual tote bag keep it grounded and practical.',
      ],
    },
    {
      vibe: 'minimalist',
      titlePrefix: 'Off-Duty Neutral Stroll',
      notesGenerator: () => [
        'Soft oat and sage undertones create a calming, relaxed presence.',
        'Effortless oversized layers provide warmth and easy movement.',
      ],
    },
    {
      vibe: 'streetwear',
      titlePrefix: 'Urban Coffee & Gallery Walk',
      notesGenerator: () => [
        'Playful volume with relaxed drape and retro streetwear kicks.',
        'Sunglasses add an instant cool factor even to the simplest basics.',
      ],
    },
  ],
  weekend: [
    {
      vibe: 'casual',
      titlePrefix: 'Lazy Sunday Serenity',
      notesGenerator: () => [
        'Unstructured, breathable fabrics for zero-fuss comfort.',
        'Pastel tones mirror a slow, peaceful morning.',
      ],
    },
    {
      vibe: 'bohemian',
      titlePrefix: 'Park Picnic & Farmers Market',
      notesGenerator: () => [
        'Woven textures, flowing fabrics, and sun-protective stylish sunglasses.',
        'Perfect balance of photogenic charm and picnic-ready comfort.',
      ],
    },
    {
      vibe: 'chic',
      titlePrefix: 'Weekend Getaway Capsule',
      notesGenerator: () => [
        'Versatile layering pieces that transition from morning coffee to evening gelato.',
      ],
    },
  ],
  formal: [
    {
      vibe: 'formal',
      titlePrefix: 'Refined Gala & Reception',
      notesGenerator: () => [
        'Architectural tailoring or fluid silk slip paired with polished hardware.',
        'Timeless poise suitable for art openings, evening dinners, and milestone events.',
      ],
    },
    {
      vibe: 'chic',
      titlePrefix: 'Modern Black-Tie Accent',
      notesGenerator: () => [
        'Clean monochromatic discipline accented with luminous gold details.',
      ],
    },
    {
      vibe: 'romantic',
      titlePrefix: 'Evening Soirée Elegance',
      notesGenerator: () => [
        'Graceful movement with delicate footwear and understated jewelry.',
      ],
    },
  ],
};

// Curated pool of external missing-piece suggestions to elevate outfits
const EXTERNAL_SUGGESTION_POOL: ExternalSuggestion[] = [
  {
    id: 'ext-sugg-1',
    category: 'accessories',
    name: 'Tortoiseshell Cat-Eye Sunglasses',
    color: 'Warm Amber & Caramel',
    colorHex: '#B45309',
    reasoning: 'Adds warm retro contrast that grounds pastel tones and gives an instant editorial touch.',
    searchQuery: 'tortoiseshell cat eye sunglasses vintage aesthetic',
    vibe: 'chic',
  },
  {
    id: 'ext-sugg-2',
    category: 'bags',
    name: 'Woven Raffia Crescent Crossbody',
    color: 'Natural Straw & Oat',
    colorHex: '#F4EFEA',
    reasoning: 'Brings tactile, organic texture to balance smooth poplin or denim fabrics.',
    searchQuery: 'woven raffia crossbody bag summer aesthetic',
    vibe: 'bohemian',
  },
  {
    id: 'ext-sugg-3',
    category: 'shoes',
    name: 'Chunky Off-White Fisherman Sandals',
    color: 'Oat Milk',
    colorHex: '#FAF8F5',
    reasoning: 'Gives contemporary streetwear grounding to feminine dresses and flowy skirts.',
    searchQuery: 'chunky fisherman sandals cream aesthetic',
    vibe: 'streetwear',
  },
  {
    id: 'ext-sugg-4',
    category: 'accessories',
    name: 'Layered Herringbone Gold Chain',
    color: 'Warm 18K Gold',
    colorHex: '#FDE047',
    reasoning: 'Frames open collarbones and adds subtle luxury to simple crewneck and tank tops.',
    searchQuery: 'layered herringbone chain necklace 18k gold vermeil',
    vibe: 'minimalist',
  },
  {
    id: 'ext-sugg-5',
    category: 'shoes',
    name: 'Square-Toe Caramel Leather Loafers',
    color: 'Caramel Tan',
    colorHex: '#9A3412',
    reasoning: 'Instantly transitions a casual jeans look into an academic or office-ready silhouette.',
    searchQuery: 'caramel brown leather square toe loafers',
    vibe: 'preppy',
  },
  {
    id: 'ext-sugg-6',
    category: 'bags',
    name: 'Soft Pleated Cloud Clutch',
    color: 'Butter Yellow',
    colorHex: '#FEF08A',
    reasoning: 'A playful burst of pastel texture that softens sharp tailoring.',
    searchQuery: 'pleated cloud clutch bag pastel butter yellow',
    vibe: 'romantic',
  },
];

/**
 * Calculates a comprehensive outfit compatibility score (0 - 100)
 */
export function calculateCompatibilityScore(items: (GarmentItem | undefined)[], targetOccasion?: Occasion): {
  score: number;
  harmonyType: string;
  reasons: string[];
} {
  const activeItems = items.filter((i): i is GarmentItem => Boolean(i));
  if (activeItems.length < 2) {
    return {
      score: 90,
      harmonyType: 'Solo Statement',
      reasons: ['Clean foundational piece.'],
    };
  }

  // 1. Color harmony score
  const colors = activeItems.map(i => ({ hex: i.colorHex, name: i.colorName }));
  const harmony = evaluateColorHarmony(colors);

  // 2. Silhouette & Proportions score
  let silhouetteScore = 90;
  const top = activeItems.find(i => i.category === 'tops');
  const bottom = activeItems.find(i => i.category === 'bottoms');
  const reasons: string[] = [harmony.description];

  if (top && bottom) {
    if (
      (top.fit === 'fitted' && (bottom.fit === 'relaxed' || bottom.subcategory === 'wide-leg-trousers')) ||
      (top.fit === 'oversized' && (bottom.fit === 'fitted' || bottom.fit === 'tailored'))
    ) {
      silhouetteScore = 98;
      reasons.push('Proportional Balance: Contrast between fitted and relaxed volumes creates an elongating silhouette.');
    } else if (top.fit === 'tailored' && bottom.fit === 'tailored') {
      silhouetteScore = 95;
      reasons.push('Tailored Cohesion: Unified architectural lines project confidence and polish.');
    } else {
      silhouetteScore = 88;
      reasons.push('Casual Slouch: Relaxed overall drape for comfortable, unstudied charm.');
    }
  }

  // 3. Occasion alignment score
  let occasionScore = 90;
  if (targetOccasion) {
    const matchingCount = activeItems.filter(i => i.occasions.includes(targetOccasion)).length;
    const ratio = matchingCount / activeItems.length;
    occasionScore = Math.round(75 + ratio * 25);
    if (ratio > 0.6) {
      reasons.push(`Occasion Match: Garments naturally align with ${targetOccasion} settings.`);
    }
  }

  const finalScore = Math.min(99, Math.round(harmony.score * 0.45 + silhouetteScore * 0.35 + occasionScore * 0.20));

  return {
    score: finalScore,
    harmonyType: harmony.harmonyType,
    reasons,
  };
}

/**
 * Generate 3 curated outfits for a specific occasion
 */
export function generateOccasionOutfits(wardrobe: GarmentItem[], occasion: Occasion, count: number = 3): Outfit[] {
  const outfits: Outfit[] = [];

  const tops = wardrobe.filter(i => i.category === 'tops' && (i.occasions.includes(occasion) || i.occasions.includes('casual')));
  const bottoms = wardrobe.filter(i => i.category === 'bottoms' && (i.occasions.includes(occasion) || i.occasions.includes('casual')));
  const dresses = wardrobe.filter(i => i.category === 'dresses' && i.occasions.includes(occasion));
  const outerwear = wardrobe.filter(i => i.category === 'outerwear');
  const shoes = wardrobe.filter(i => i.category === 'shoes');
  const bags = wardrobe.filter(i => i.category === 'bags');
  const accessories = wardrobe.filter(i => i.category === 'accessories');

  const formulas = OCCASION_FORMULAS[occasion] || OCCASION_FORMULAS.casual;

  for (let idx = 0; idx < count; idx++) {
    const formula = formulas[idx % formulas.length];
    let top: GarmentItem | undefined;
    let bottom: GarmentItem | undefined;
    let dress: GarmentItem | undefined;

    // Alternate dresses if available and occasion fits (like date or brunch)
    if (dresses.length > 0 && (idx === 1 || tops.length === 0)) {
      dress = dresses[idx % dresses.length];
    } else {
      top = tops[(idx * 2) % (tops.length || 1)] || wardrobe.find(i => i.category === 'tops');
      bottom = bottoms[(idx * 2 + 1) % (bottoms.length || 1)] || wardrobe.find(i => i.category === 'bottoms');
    }

    const selectedOuterwear = outerwear.length > 0 && (occasion === 'office' || occasion === 'date' || idx === 0)
      ? outerwear[idx % outerwear.length]
      : undefined;

    const shoe = shoes.length > 0 
      ? shoes.find(s => s.occasions.includes(occasion)) || shoes[idx % shoes.length]
      : undefined;

    const bag = bags.length > 0 
      ? bags.find(b => b.occasions.includes(occasion)) || bags[idx % bags.length]
      : undefined;

    const accessory = accessories.length > 0 
      ? accessories[idx % accessories.length]
      : undefined;

    const itemsToEvaluate = [top, bottom, dress, selectedOuterwear, shoe, bag, accessory];
    const { score, harmonyType, reasons } = calculateCompatibilityScore(itemsToEvaluate, occasion);

    // Pick 1-2 complementary external suggestions for pieces user might want to style with
    const externalSuggestions = EXTERNAL_SUGGESTION_POOL
      .filter((_, i) => i % 3 === idx % 3 || (i + 1) % 3 === idx % 3)
      .slice(0, 2);

    outfits.push({
      id: `outfit-${occasion}-${idx}-${Date.now()}`,
      title: `${formula.titlePrefix}`,
      description: `${formula.vibe.toUpperCase()} • Tailored for ${occasion.toUpperCase()}`,
      top,
      bottom,
      dress,
      outerwear: selectedOuterwear,
      shoes: shoe,
      bag,
      accessory,
      externalSuggestions,
      occasion,
      compatibilityScore: score,
      colorHarmonyType: harmonyType,
      stylingNotes: [...formula.notesGenerator(itemsToEvaluate), ...reasons.slice(0, 2)],
      vibe: formula.vibe,
      createdAt: Date.now(),
    });
  }

  return outfits;
}

/**
 * Generate styling options when user chooses ANY specific garment
 * e.g., User selects a top -> pairs with the user's uploaded jeans for a full complete outfit!
 */
export function generateItemOutfits(selectedItem: GarmentItem, wardrobe: GarmentItem[]): Outfit[] {
  const outfits: Outfit[] = [];

  const availableBottoms = wardrobe.filter(i => i.category === 'bottoms' && i.id !== selectedItem.id);
  const availableTops = wardrobe.filter(i => i.category === 'tops' && i.id !== selectedItem.id);
  const availableOuterwear = wardrobe.filter(i => i.category === 'outerwear' && i.id !== selectedItem.id);
  const availableShoes = wardrobe.filter(i => i.category === 'shoes' && i.id !== selectedItem.id);
  const availableBags = wardrobe.filter(i => i.category === 'bags' && i.id !== selectedItem.id);
  const availableAccs = wardrobe.filter(i => i.category === 'accessories' && i.id !== selectedItem.id);

  // Prioritize the user's uploaded jeans or denim first for casual/daily fits
  const prioritizedBottoms = [...availableBottoms].sort((a, b) => {
    const aIsJean = a.subcategory === 'jeans' || a.name.toLowerCase().includes('jean') || a.tags.some(t => t.includes('denim') || t.includes('jean'));
    const bIsJean = b.subcategory === 'jeans' || b.name.toLowerCase().includes('jean') || b.tags.some(t => t.includes('denim') || t.includes('jean'));
    if (aIsJean && !bIsJean) return -1;
    if (!aIsJean && bIsJean) return 1;
    return 0;
  });

  // Prioritize clean neutral tops first
  const prioritizedTops = [...availableTops].sort((a, b) => {
    if (a.colorTone === 'neutral' && b.colorTone !== 'neutral') return -1;
    if (a.colorTone !== 'neutral' && b.colorTone === 'neutral') return 1;
    return 0;
  });

  // 3 distinct formula vibes for any item
  const stylingModes: {
    occasion: Occasion;
    vibe: StyleAesthetic;
    title: string;
    description: string;
  }[] = [
    {
      occasion: 'casual',
      vibe: 'casual',
      title: 'Effortless Everyday Denim & Staple Look',
      description: 'Classic pairing anchoring your hero piece with easy denim and relaxed footwear for daily comfort.',
    },
    {
      occasion: 'brunch',
      vibe: 'chic',
      title: 'Elevated Weekend Patio Chic',
      description: 'Luminous pastel and textured accents creating a photogenic, balanced silhouette.',
    },
    {
      occasion: 'date',
      vibe: 'romantic',
      title: 'Golden Hour & Evening Drinks',
      description: 'Sophisticated tension between tailoring and fluid drape with refined hardware.',
    },
  ];

  stylingModes.forEach((mode, idx) => {
    let top: GarmentItem | undefined;
    let bottom: GarmentItem | undefined;
    let dress: GarmentItem | undefined;
    let outer: GarmentItem | undefined;
    let shoe: GarmentItem | undefined;
    let bag: GarmentItem | undefined;
    let acc: GarmentItem | undefined;

    // Anchor the selected item into its appropriate slot
    if (selectedItem.category === 'tops') {
      top = selectedItem;
      // Pair with the user's uploaded jeans or bottoms
      bottom = prioritizedBottoms[idx % (prioritizedBottoms.length || 1)] || availableBottoms[0];
      outer = idx === 1 && availableOuterwear.length > 0 ? availableOuterwear[0] : undefined;
    } else if (selectedItem.category === 'bottoms') {
      bottom = selectedItem;
      // Pair with the user's tops
      top = prioritizedTops[idx % (prioritizedTops.length || 1)] || availableTops[0];
      outer = idx === 2 && availableOuterwear.length > 0 ? availableOuterwear[0] : undefined;
    } else if (selectedItem.category === 'dresses') {
      dress = selectedItem;
      outer = availableOuterwear[idx % (availableOuterwear.length || 1)];
    } else if (selectedItem.category === 'outerwear') {
      outer = selectedItem;
      top = prioritizedTops[idx % (prioritizedTops.length || 1)] || availableTops[0];
      bottom = prioritizedBottoms[idx % (prioritizedBottoms.length || 1)] || availableBottoms[0];
    } else if (selectedItem.category === 'shoes') {
      shoe = selectedItem;
      top = prioritizedTops[idx % (prioritizedTops.length || 1)] || availableTops[0];
      bottom = prioritizedBottoms[idx % (prioritizedBottoms.length || 1)] || availableBottoms[0];
    } else if (selectedItem.category === 'bags') {
      bag = selectedItem;
      top = prioritizedTops[idx % (prioritizedTops.length || 1)] || availableTops[0];
      bottom = prioritizedBottoms[idx % (prioritizedBottoms.length || 1)] || availableBottoms[0];
    } else {
      acc = selectedItem;
      top = prioritizedTops[idx % (prioritizedTops.length || 1)] || availableTops[0];
      bottom = prioritizedBottoms[idx % (prioritizedBottoms.length || 1)] || availableBottoms[0];
    }

    if (!shoe && availableShoes.length > 0) {
      shoe = availableShoes[idx % availableShoes.length];
    }
    if (!bag && availableBags.length > 0) {
      bag = availableBags[idx % availableBags.length];
    }
    if (!acc && availableAccs.length > 0) {
      acc = availableAccs[idx % availableAccs.length];
    }

    const items = [top, bottom, dress, outer, shoe, bag, acc];
    const { score, harmonyType, reasons } = calculateCompatibilityScore(items, mode.occasion);

    // Pick contextual external suggestions
    const externalSuggestions: ExternalSuggestion[] = EXTERNAL_SUGGESTION_POOL
      .filter((_, i) => (i + idx) % 2 === 0)
      .slice(0, 2);

    // If bottom is missing from wardrobe when styling a top, suggest complementary jeans!
    if (!bottom && !dress) {
      externalSuggestions.unshift({
        id: `sugg-jeans-${idx}`,
        category: 'bottoms',
        name: 'Vintage High-Rise Straight-Leg Jeans',
        color: 'Vintage Indigo Denim',
        colorHex: '#3B82F6',
        reasoning: 'Essential Foundation: Pair your top with classic high-rise vintage blue jeans for a balanced, complete silhouette.',
        searchQuery: 'vintage straight leg high rise blue denim jeans',
        vibe: 'casual',
      });
    }

    // If top is missing from wardrobe when styling bottoms, suggest complementary top!
    if (!top && !dress) {
      externalSuggestions.unshift({
        id: `sugg-top-${idx}`,
        category: 'tops',
        name: 'Crisp White Poplin Shirt',
        color: 'Crisp White',
        colorHex: '#FAF9F6',
        reasoning: 'Essential Upper: A crisp white shirt or boxy tee balances your jeans for a timeless full outfit.',
        searchQuery: 'crisp white oversized button down shirt poplin',
        vibe: 'chic',
      });
    }

    const activePieceCount = items.filter(Boolean).length;
    const notes: string[] = [
      `Hero Piece: Styling around "${selectedItem.name}" (${selectedItem.colorName}).`,
    ];

    if (top && bottom) {
      notes.push(`Full Outfit Balance: Anchored "${top.name}" with "${bottom.name}" for a complete top-and-bottom silhouette.`);
    }
    notes.push(...reasons);

    outfits.push({
      id: `styled-${selectedItem.id}-${idx}`,
      title: `${mode.title}`,
      description: `${mode.description} (${activePieceCount} closet pieces)`,
      top,
      bottom,
      dress,
      outerwear: outer,
      shoes: shoe,
      bag,
      accessory: acc,
      externalSuggestions: externalSuggestions.slice(0, 2),
      occasion: mode.occasion,
      compatibilityScore: score,
      colorHarmonyType: harmonyType,
      stylingNotes: notes,
      vibe: mode.vibe,
      createdAt: Date.now(),
    });
  });

  return outfits;
}
