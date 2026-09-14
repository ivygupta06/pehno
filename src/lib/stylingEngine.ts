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
 * Helper to identify whether a footwear item is heels, mules, or dressy footwear
 */
export function isHeelOrDressShoe(item?: GarmentItem): boolean {
  if (!item) return false;
  const name = item.name.toLowerCase();
  const sub = item.subcategory?.toLowerCase() || '';
  return (
    sub === 'heels' ||
    sub === 'mules' ||
    name.includes('heel') ||
    name.includes('pump') ||
    name.includes('slingback') ||
    name.includes('stiletto') ||
    name.includes('strappy')
  );
}

/**
 * Intelligent outerwear selector
 * Never suggests outerwear for normal tops (t-shirts, shirts, blouses, knit tops, layered tops, net tops, crop tops).
 * Normal tops are complete on their own with bottoms.
 */
export function shouldIncludeOuterwear(
  top: GarmentItem | undefined,
  dress: GarmentItem | undefined,
  outerwearPiece: GarmentItem | undefined,
  occasion: Occasion,
  idx: number
): boolean {
  if (!outerwearPiece) return false;
  if (!top && !dress) return false;

  // STRICT RULE: Normal tops NEVER receive outerwear!
  if (top) {
    return false;
  }

  // If styling a dress:
  if (dress) {
    const dressNameLower = dress.name.toLowerCase();
    const isSleevelessDress =
      dress.subcategory === 'slip-dress' ||
      dress.subcategory === 'sundress' ||
      dressNameLower.includes('slip') ||
      dressNameLower.includes('sundress') ||
      dressNameLower.includes('strappy') ||
      dressNameLower.includes('halter');

    // Only optionally suggest a light layer on look #2 for office
    if (isSleevelessDress && occasion === 'office') {
      return idx === 1;
    }
  }

  return false;
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

    // Intelligent occasion garment selection:
    // For date night, party, and brunch: if dresses exist, prioritize dresses!
    // For Date Night specifically: Look #1 MUST showcase a dress if available!
    const isDateOrParty = occasion === 'date' || occasion === 'party';
    const isBrunch = occasion === 'brunch';
    const shouldPickDress = dresses.length > 0 && (
      (isDateOrParty && idx === 0) || // Look #1 for Date Night is a dress!
      (isDateOrParty && dresses.length > 1 && idx === 1) || // Look #2 another dress if multiple available
      (isBrunch && idx === 0) ||
      tops.length === 0
    );

    if (shouldPickDress) {
      dress = dresses[idx % dresses.length];
      top = undefined;
      bottom = undefined;
    } else {
      // Prioritize tops and bottoms matching this occasion or romantic/chic aesthetic for date night
      const dateOrOccasionTops = tops.filter(t => t.occasions.includes(occasion) || (isDateOrParty && (t.aesthetics.includes('romantic') || t.aesthetics.includes('chic'))));
      const poolTops = dateOrOccasionTops.length > 0 ? dateOrOccasionTops : tops;

      const dateOrOccasionBottoms = bottoms.filter(b => b.occasions.includes(occasion) || (isDateOrParty && (b.aesthetics.includes('romantic') || b.aesthetics.includes('chic'))));
      const poolBottoms = dateOrOccasionBottoms.length > 0 ? dateOrOccasionBottoms : bottoms;

      // Rotate distinctly across the 3 looks
      top = poolTops[idx % (poolTops.length || 1)] || wardrobe.find(i => i.category === 'tops');
      bottom = poolBottoms[(idx + 1) % (poolBottoms.length || 1)] || wardrobe.find(i => i.category === 'bottoms');
    }

    // Rule: A dress is a complete one-piece outfit. Never allow top or bottom when dress is present!
    if (dress) {
      top = undefined;
      bottom = undefined;
    }

    // Outerwear intelligence: only include if the garment underneath actually needs layering!
    const candidateOuterwear = outerwear.length > 0 ? outerwear[idx % outerwear.length] : undefined;
    const selectedOuterwear = shouldIncludeOuterwear(top, dress, candidateOuterwear, occasion, idx)
      ? candidateOuterwear
      : undefined;

    let shoe = shoes.length > 0 
      ? shoes.find(s => s.occasions.includes(occasion)) || shoes[idx % shoes.length]
      : undefined;

    // For dresses: prioritize matching heels/dress shoes if available in closet, but KEEP sneakers/flats if available! Never leave shoe undefined if closet has shoes!
    if (dress) {
      const dressHeels = shoes.filter(isHeelOrDressShoe);
      shoe = dressHeels.length > 0 ? dressHeels[idx % dressHeels.length] : (shoes.length > 0 ? shoes[idx % shoes.length] : undefined);
    }

    // Bag is optional — do NOT force bag on every fit unless office or 40% probability
    const bag = bags.length > 0 && (occasion === 'office' || (idx % 2 === 0 && Math.random() < 0.5))
      ? bags.find(b => b.occasions.includes(occasion)) || bags[idx % bags.length]
      : undefined;

    const accessory = accessories.length > 0 
      ? accessories[idx % accessories.length]
      : undefined;

    const itemsToEvaluate = [top, bottom, dress, selectedOuterwear, shoe, bag, accessory];
    const { score, harmonyType, reasons } = calculateCompatibilityScore(itemsToEvaluate, occasion);

    // Pick 1-2 complementary external suggestions for missing items
    const rawSuggestions: ExternalSuggestion[] = EXTERNAL_SUGGESTION_POOL
      .filter((_, i) => (i + idx) % 2 === 0)
      .slice(0, 2);

    // CRITICAL: Filter out external suggestions for categories ALREADY present in the closet outfit!
    const externalSuggestions = rawSuggestions.filter(s => {
      if (s.category === 'shoes' && shoe) return false;
      if (s.category === 'bags' && bag) return false;
      if (s.category === 'tops' && top) return false;
      if (s.category === 'bottoms' && bottom) return false;
      if (s.category === 'outerwear' && (selectedOuterwear || top)) return false;
      return true;
    });

    // If styling a dress and no matching heels are in closet, suggest buying options for heels!
    if (dress && !shoe) {
      const dressLower = `${dress.name} ${dress.colorName}`.toLowerCase();
      let heelColor = 'Black';
      let heelHex = '#18181B';
      let heelName = 'Black Strappy Kitten Heels';

      if (dressLower.includes('white') || dressLower.includes('cream') || dressLower.includes('yellow') || dress.colorTone === 'pastel') {
        heelColor = 'Nude';
        heelHex = '#E7D7C9';
        heelName = 'Nude Block Heel Mules';
      } else if (dressLower.includes('red') || dressLower.includes('pink') || dressLower.includes('rose') || dressLower.includes('wine')) {
        heelColor = 'Nude';
        heelHex = '#E7D7C9';
        heelName = 'Nude Ankle-Strap Heels';
      } else if (dress.colorTone === 'earthy' || dressLower.includes('brown')) {
        heelColor = 'Gold';
        heelHex = '#D4AF37';
        heelName = 'Gold Minimalist Strappy Heels';
      }

      externalSuggestions.unshift({
        id: `ext-sugg-heels-${idx}-${Date.now()}`,
        category: 'shoes',
        name: heelName,
        color: heelColor,
        colorHex: heelHex,
        reasoning: `No matching heels in closet: Elevate your ${dress.name} with ${heelColor.toLowerCase()} heels to lengthen the silhouette and complete the look.`,
        searchQuery: `${heelName.toLowerCase()} shopping`,
        vibe: formula.vibe || 'chic',
      });
    }

    // If styling a dress and no bags in closet, suggest buying options for a matching bag!
    if (dress && !bag) {
      const hasBagSugg = externalSuggestions.some(s => s.category === 'bags');
      if (!hasBagSugg) {
        let bagName = 'Cream Butter Leather Bag';
        let bagColor = 'Oat Cream';
        let bagHex = '#F4EFEA';
        let bagQuery = 'cream butter leather shoulder bag';
        let bagReason = `No bags in closet: Complete your ${dress.name} with a chic neutral shoulder bag.`;

        if (occasion === 'office') {
          bagName = 'Black Leather Tote Bag';
          bagColor = 'Black';
          bagHex = '#18181B';
          bagQuery = 'structured black leather work tote bag';
          bagReason = `No bags in closet: A structured leather tote bag brings executive polish to your ${dress.name}.`;
        } else if (occasion === 'date' || occasion === 'party') {
          bagName = 'Black Satin Baguette Bag';
          bagColor = 'Black';
          bagHex = '#18181B';
          bagQuery = 'minimalist black evening baguette shoulder bag';
          bagReason = `No bags in closet: A sleek evening shoulder bag completes your ${dress.name} for dinner and drinks.`;
        } else if (occasion === 'brunch' || occasion === 'weekend') {
          bagName = 'Woven Raffia Shoulder Bag';
          bagColor = 'Natural Oat';
          bagHex = '#E7D7C9';
          bagQuery = 'woven raffia crescent shoulder bag';
          bagReason = `No bags in closet: Tactile woven texture effortlessly softens your ${dress.name} for the weekend.`;
        }

        externalSuggestions.push({
          id: `ext-sugg-bag-${idx}-${Date.now()}`,
          category: 'bags',
          name: bagName,
          color: bagColor,
          colorHex: bagHex,
          reasoning: bagReason,
          searchQuery: bagQuery,
          vibe: formula.vibe || 'chic',
        });
      }
    }

    // If bottom is missing from wardrobe when styling a top, suggest complementary jeans!
    if (top && !bottom && !dress) {
      externalSuggestions.unshift({
        id: `ext-sugg-jeans-${idx}-${Date.now()}`,
        category: 'bottoms',
        name: 'Vintage Straight-Leg Jeans',
        color: 'Classic Vintage Blue',
        colorHex: '#3B82F6',
        reasoning: `No bottoms in closet: Complete this ${top.name} with timeless straight-leg denim.`,
        searchQuery: `vintage high waist straight leg blue jeans ${top.name}`,
        vibe: formula.vibe || 'casual',
      });
    }

    // If top is missing from wardrobe when styling bottoms, suggest complementary top!
    if (bottom && !top && !dress) {
      externalSuggestions.unshift({
        id: `ext-sugg-top-${idx}-${Date.now()}`,
        category: 'tops',
        name: 'White Poplin Shirt',
        color: 'Crisp White',
        colorHex: '#FFFFFF',
        reasoning: `No tops in closet: Pair your ${bottom.name} with a timeless white poplin shirt.`,
        searchQuery: `relaxed white cotton poplin button down shirt`,
        vibe: formula.vibe || 'chic',
      });
    }

    // Build concise, convincing notes: EXACTLY MAX 3 POINTS!
    const conciseNotes: string[] = [];

    // Point 1: Silhouette & Occasion fit (1 punchy sentence)
    if (dress) {
      conciseNotes.push(`Flowing one-piece silhouette tailored for effortless ${occasion} elegance.`);
    } else if (top && bottom) {
      if (top.fit === 'fitted' && (bottom.fit === 'relaxed' || bottom.subcategory === 'wide-leg-trousers')) {
        conciseNotes.push('Fitted top balanced with relaxed bottoms creates an elongating silhouette.');
      } else if (top.fit === 'oversized') {
        conciseNotes.push('Relaxed drape over clean bottoms gives modern, unstudied comfort.');
      } else {
        conciseNotes.push(`Balanced top-and-bottom silhouette suited naturally for ${occasion}.`);
      }
    } else {
      conciseNotes.push(formula.notesGenerator(itemsToEvaluate)[0] || `Effortless silhouette designed for ${occasion}.`);
    }

    // Point 2: Color harmony (1 crisp sentence)
    if (harmonyType && harmonyType !== 'Solo Statement') {
      conciseNotes.push(`${harmonyType}: Palettes balance naturally with clean photographic depth.`);
    } else if (reasons.length > 0) {
      conciseNotes.push(reasons[0]);
    }

    // Point 3: Footwear & Accessories (1 crisp sentence)
    if (shoe || bag || accessory) {
      const pieceName = shoe ? shoe.name : (bag ? bag.name : accessory?.name);
      conciseNotes.push(`Anchored with ${pieceName} for polished, photogenic contrast.`);
    }

    // Guarantee EXACTLY 2 external recommendations per outfit
    const finalExternal = externalSuggestions.length >= 2 ? externalSuggestions.slice(0, 2) : [
      ...externalSuggestions,
      {
        id: `ext-sugg-hoops-${idx}-${Date.now()}`,
        category: 'accessories' as const,
        name: 'Gold Chunky Hoop Earrings',
        color: 'Polished Gold',
        colorHex: '#D4AF37',
        reasoning: 'Warm metallic shimmer brings instant intentional polish to the neckline.',
        searchQuery: 'gold chunky hoop earrings 18k',
        vibe: formula.vibe || 'chic',
      },
      {
        id: `ext-sugg-mules-${idx}-${Date.now()}`,
        category: 'shoes' as const,
        name: 'Nude Kitten Heel Mules',
        color: 'Warm Nude',
        colorHex: '#E7D7C9',
        reasoning: 'Lengthens leg line without overwhelming the drape of the outfit.',
        searchQuery: 'nude kitten heel mules',
        vibe: formula.vibe || 'chic',
      },
    ].slice(0, 2);

    // Guarantee STRICT MAX 3 POINTS:
    const finalNotes = conciseNotes.slice(0, 3);

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
      externalSuggestions: finalExternal,
      occasion,
      compatibilityScore: score,
      colorHarmonyType: harmonyType,
      stylingNotes: finalNotes,
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
      // Pair with the user's uploaded jeans or bottoms only if available
      bottom = prioritizedBottoms.length > 0
        ? prioritizedBottoms[idx % prioritizedBottoms.length]
        : undefined;
      const candidateOuter = availableOuterwear.length > 0 ? availableOuterwear[idx % availableOuterwear.length] : undefined;
      outer = shouldIncludeOuterwear(top, dress, candidateOuter, mode.occasion, idx) ? candidateOuter : undefined;
    } else if (selectedItem.category === 'bottoms') {
      bottom = selectedItem;
      // Pair with the user's tops only if available
      top = prioritizedTops.length > 0
        ? prioritizedTops[idx % prioritizedTops.length]
        : undefined;
      const candidateOuter = availableOuterwear.length > 0 ? availableOuterwear[idx % availableOuterwear.length] : undefined;
      outer = shouldIncludeOuterwear(top, dress, candidateOuter, mode.occasion, idx) ? candidateOuter : undefined;
    } else if (selectedItem.category === 'dresses') {
      dress = selectedItem;
      top = undefined;
      bottom = undefined;
      const candidateOuter = availableOuterwear.length > 0 ? availableOuterwear[idx % availableOuterwear.length] : undefined;
      outer = shouldIncludeOuterwear(top, dress, candidateOuter, mode.occasion, idx) ? candidateOuter : undefined;
    } else if (selectedItem.category === 'outerwear') {
      outer = selectedItem;
      if (wardrobe.some(i => i.category === 'dresses') && availableTops.length === 0 && availableBottoms.length === 0) {
        const availableDresses = wardrobe.filter(i => i.category === 'dresses');
        dress = availableDresses[idx % availableDresses.length];
      } else {
        top = prioritizedTops.length > 0 ? prioritizedTops[idx % prioritizedTops.length] : undefined;
        bottom = prioritizedBottoms.length > 0 ? prioritizedBottoms[idx % prioritizedBottoms.length] : undefined;
      }
    } else {
      if (selectedItem.category === 'shoes') shoe = selectedItem;
      else if (selectedItem.category === 'bags') bag = selectedItem;
      else acc = selectedItem;

      if (wardrobe.some(i => i.category === 'dresses') && availableTops.length === 0 && availableBottoms.length === 0) {
        const availableDresses = wardrobe.filter(i => i.category === 'dresses');
        dress = availableDresses[idx % availableDresses.length];
      } else {
        top = prioritizedTops.length > 0 ? prioritizedTops[idx % prioritizedTops.length] : undefined;
        bottom = prioritizedBottoms.length > 0 ? prioritizedBottoms[idx % prioritizedBottoms.length] : undefined;
      }
    }

    // Strict Rule: A dress is a complete one-piece garment. Never allow top or bottom!
    if (dress) {
      top = undefined;
      bottom = undefined;
    }

    if (dress) {
      if (selectedItem.category === 'shoes' && isHeelOrDressShoe(selectedItem)) {
        shoe = selectedItem;
      } else {
        const dressHeels = availableShoes.filter(isHeelOrDressShoe);
        shoe = dressHeels.length > 0 ? dressHeels[idx % dressHeels.length] : undefined;
      }
    } else if (!shoe && availableShoes.length > 0) {
      shoe = availableShoes[idx % availableShoes.length];
    }
    if (!bag && availableBags.length > 0) {
      bag = availableBags[idx % availableBags.length];
    }
    if (!acc && availableAccs.length > 0) {
      acc = availableAccs[idx % availableAccs.length];
    }

    const items = [top, bottom, dress, outer, shoe, bag, acc];
    const { score, harmonyType } = calculateCompatibilityScore(items, mode.occasion);

    // Pick contextual external suggestions
    const externalSuggestions: ExternalSuggestion[] = EXTERNAL_SUGGESTION_POOL
      .filter((_, i) => (i + idx) % 2 === 0)
      .slice(0, 2);

    // If styling a dress and matching heels are missing from closet, suggest buying options for heels!
    if (dress && !shoe) {
      const dressLower = `${dress.name} ${dress.colorName}`.toLowerCase();
      let heelColor = 'Black';
      let heelHex = '#18181B';
      let heelName = 'Black Strappy Kitten Heels';

      if (dressLower.includes('white') || dressLower.includes('cream') || dressLower.includes('yellow') || dress.colorTone === 'pastel') {
        heelColor = 'Nude';
        heelHex = '#E7D7C9';
        heelName = 'Nude Block Heel Mules';
      } else if (dressLower.includes('red') || dressLower.includes('pink') || dressLower.includes('rose') || dressLower.includes('wine')) {
        heelColor = 'Nude';
        heelHex = '#E7D7C9';
        heelName = 'Nude Ankle-Strap Heels';
      } else if (dress.colorTone === 'earthy' || dressLower.includes('brown')) {
        heelColor = 'Gold';
        heelHex = '#D4AF37';
        heelName = 'Gold Minimalist Strappy Heels';
      }

      externalSuggestions.unshift({
        id: `sugg-heels-${idx}-${Date.now()}`,
        category: 'shoes',
        name: heelName,
        color: heelColor,
        colorHex: heelHex,
        reasoning: `No matching heels in closet: Complete your ${dress.name} with ${heelColor.toLowerCase()} heels to anchor the silhouette.`,
        searchQuery: `${heelName.toLowerCase()} shopping`,
        vibe: mode.vibe,
      });
    }

    // If styling a dress and no bags in closet, suggest buying options for a matching bag!
    if (dress && !bag) {
      const hasBagSugg = externalSuggestions.some(s => s.category === 'bags');
      if (!hasBagSugg) {
        let bagName = 'Cream Butter Leather Bag';
        let bagColor = 'Oat Cream';
        let bagHex = '#F4EFEA';
        let bagQuery = 'cream butter leather shoulder bag';
        let bagReason = `No bags in closet: Complete your ${dress.name} with a chic neutral shoulder bag.`;

        if (mode.occasion === 'date') {
          bagName = 'Black Satin Baguette Bag';
          bagColor = 'Black';
          bagHex = '#18181B';
          bagQuery = 'minimalist black evening baguette shoulder bag';
          bagReason = `No bags in closet: A sleek evening shoulder bag completes your ${dress.name} for dinner and drinks.`;
        } else if (mode.occasion === 'brunch') {
          bagName = 'Woven Raffia Shoulder Bag';
          bagColor = 'Natural Oat';
          bagHex = '#E7D7C9';
          bagQuery = 'woven raffia crescent shoulder bag';
          bagReason = `No bags in closet: Tactile woven texture softens your ${dress.name} for the weekend.`;
        }

        externalSuggestions.push({
          id: `sugg-bag-${idx}-${Date.now()}`,
          category: 'bags',
          name: bagName,
          color: bagColor,
          colorHex: bagHex,
          reasoning: bagReason,
          searchQuery: bagQuery,
          vibe: mode.vibe,
        });
      }
    }

    // If bottom is missing from wardrobe when styling a top, suggest complementary jeans with links!
    if (!bottom && !dress && top) {
      const defaultJeans = [
        { name: 'Vintage High-Rise Straight-Leg Jeans', color: 'Classic Indigo Denim', hex: '#2563EB', query: 'vintage high rise straight leg blue jeans' },
        { name: 'Relaxed Wide-Leg Washed Denim', color: 'Light Sky Blue', hex: '#60A5FA', query: 'relaxed wide leg washed denim jeans' },
        { name: 'Tailored Ankle-Crop Trousers', color: 'Oat Cream / Ecru', hex: '#F3EFEA', query: 'tailored ecru cream high waist trousers' },
      ];
      const j = defaultJeans[idx % defaultJeans.length];
      externalSuggestions.unshift({
        id: `sugg-jeans-${idx}`,
        category: 'bottoms',
        name: j.name,
        color: j.color,
        colorHex: j.hex,
        reasoning: `No bottoms in closet: Pair your "${top.name}" with ${j.color.toLowerCase()} denim for a balanced silhouette.`,
        searchQuery: `${j.query} ${top.name}`,
        vibe: mode.vibe,
      });
    }

    // If top is missing from wardrobe when styling bottoms, suggest complementary top with links!
    if (!top && !dress && bottom) {
      const defaultTops = [
        { name: 'Crisp White Poplin Shirt', color: 'Crisp White', hex: '#FFFFFF', query: 'crisp white oversized button down shirt poplin' },
        { name: 'Ribbed Crew-Neck Baby Tee', color: 'Heather Grey', hex: '#D1D5DB', query: 'fitted ribbed cotton baby tee' },
        { name: 'Oversized Knit Crewneck', color: 'Buttercream Cream', hex: '#FEF9C3', query: 'oversized knit crewneck sweater' },
      ];
      const t = defaultTops[idx % defaultTops.length];
      externalSuggestions.unshift({
        id: `sugg-top-${idx}`,
        category: 'tops',
        name: t.name,
        color: t.color,
        colorHex: t.hex,
        reasoning: `No tops in closet: Pair your "${bottom.name}" with this ${t.name.toLowerCase()} for timeless contrast.`,
        searchQuery: `${t.query}`,
        vibe: mode.vibe,
      });
    }

    const activePieceCount = items.filter(Boolean).length;
    const notes: string[] = [
      `Hero Piece: Styling around "${selectedItem.name}" with balanced silhouette.`,
    ];

    if (harmonyType && harmonyType !== 'Solo Statement') {
      notes.push(`${harmonyType}: Natural palette harmony anchors the hero piece.`);
    }

    if (shoe || bag || acc) {
      const pieceName = shoe ? shoe.name : (bag ? bag.name : acc?.name);
      notes.push(`Finished with ${pieceName} for refined ${mode.occasion} contrast.`);
    }

    const finalItemNotes = notes.slice(0, 3);

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
      externalSuggestions: externalSuggestions.slice(0, 3),
      occasion: mode.occasion,
      compatibilityScore: score,
      colorHarmonyType: harmonyType,
      stylingNotes: finalItemNotes,
      vibe: mode.vibe,
      createdAt: Date.now(),
    });
  });

  return outfits;
}

/**
 * Strict fashion compatibility check between two garments.
 * - Tops can never be worn with dresses.
 * - Bottoms (jeans, trousers, skirts) can never be worn with dresses.
 * - Dresses can never be worn with tops or bottoms.
 * - Dresses pair with shrugs/outerwear, accessories, shoes, and bags.
 */
export function isGarmentPairCompatible(baseItem: GarmentItem, candidate: GarmentItem): boolean {
  if (baseItem.id === candidate.id) return false;

  const baseCat = baseItem.category;
  const candCat = candidate.category;

  // Same category items never pair together (e.g. two tops, two bottoms, two dresses)
  if (baseCat === candCat) {
    // Special exception: different subcategory accessories can pair together (e.g. earrings + sunglasses)
    if (baseCat === 'accessories' && baseItem.subcategory !== candidate.subcategory) {
      return true;
    }
    return false;
  }

  // DRESSES:
  // A dress is a complete one-piece outfit.
  // STRICT RULE: Dresses can NEVER pair with Tops (shirts/blouses) or Bottoms (jeans/skirts/pants).
  // Exception: only if a candidate in "tops" is explicitly a shrug/bolero/cardigan layer piece.
  if (baseCat === 'dresses') {
    if (candCat === 'bottoms') return false;
    if (candCat === 'tops') {
      const isShrugLayer = candidate.subcategory === 'shrug' || 
                           candidate.subcategory === 'bolero' ||
                           candidate.subcategory === 'cardigan' ||
                           candidate.name.toLowerCase().includes('shrug') ||
                           candidate.name.toLowerCase().includes('bolero');
      return isShrugLayer;
    }
    // Dresses pair with outerwear (shrugs, jackets, coats, blazers), accessories, shoes, and bags
    return ['outerwear', 'accessories', 'shoes', 'bags'].includes(candCat);
  }

  // TOPS:
  // Can NEVER pair with dresses (unless the top is a layering shrug/bolero).
  if (baseCat === 'tops') {
    if (candCat === 'dresses') {
      const isBaseShrug = baseItem.subcategory === 'shrug' ||
                          baseItem.subcategory === 'bolero' ||
                          baseItem.subcategory === 'cardigan' ||
                          baseItem.name.toLowerCase().includes('shrug') ||
                          baseItem.name.toLowerCase().includes('bolero');
      return isBaseShrug;
    }
    // Tops pair with bottoms, outerwear, shoes, bags, accessories
    return ['bottoms', 'outerwear', 'shoes', 'bags', 'accessories'].includes(candCat);
  }

  // BOTTOMS:
  // Can NEVER pair with dresses!
  if (baseCat === 'bottoms') {
    if (candCat === 'dresses') return false;
    // Bottoms pair with tops, outerwear, shoes, bags, accessories
    return ['tops', 'outerwear', 'shoes', 'bags', 'accessories'].includes(candCat);
  }

  // OUTERWEAR:
  // Pairs with tops, bottoms, dresses, shoes, bags, accessories
  if (baseCat === 'outerwear') {
    return candCat !== 'outerwear';
  }

  // SHOES, BAGS, ACCESSORIES:
  // Pair with tops, bottoms, dresses, outerwear, etc.
  return true;
}

export interface MatchingPartnerResult {
  item: GarmentItem;
  score: number;
  harmonyType: string;
  description: string;
  isSuggestion?: boolean;
}

// Curated companion templates for when the closet lacks compatible pieces
const CURATED_COMPANION_SUGGESTIONS: Omit<GarmentItem, 'id' | 'createdAt'>[] = [
  // Outerwear / Shrugs
  {
    name: 'Cropped Ivory Ribbed Knit Shrug',
    category: 'outerwear',
    subcategory: 'shrug',
    colorName: 'Crisp White',
    colorHex: '#FAF9F6',
    colorTone: 'neutral',
    pattern: 'ribbed',
    material: 'Soft Ribbed Knit',
    fit: 'cropped',
    aesthetics: ['chic', 'romantic', 'minimalist'],
    seasons: ['spring', 'summer', 'fall', 'all-season'],
    occasions: ['brunch', 'date', 'casual', 'party', 'class'],
    imageUrl: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&auto=format&fit=crop&q=80',
    tags: ['shrug', 'cropped', 'layer', 'bolero', 'knitwear'],
  },
  {
    name: 'Matcha Sage Lightweight Shrug',
    category: 'outerwear',
    subcategory: 'shrug',
    colorName: 'Matcha Sage Green',
    colorHex: '#D5E5DA',
    colorTone: 'pastel',
    pattern: 'solid',
    material: 'Cotton Knit',
    fit: 'cropped',
    aesthetics: ['romantic', 'bohemian', 'chic'],
    seasons: ['spring', 'summer', 'fall'],
    occasions: ['brunch', 'date', 'casual'],
    imageUrl: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600&auto=format&fit=crop&q=80',
    tags: ['shrug', 'sage', 'pastel', 'layer'],
  },
  // Accessories
  {
    name: 'Amber Tortoiseshell Retro Sunglasses',
    category: 'accessories',
    subcategory: 'sunglasses',
    colorName: 'Warm Terracotta',
    colorHex: '#C2410C',
    colorTone: 'earthy',
    pattern: 'solid',
    material: 'Acetate',
    fit: 'tailored',
    aesthetics: ['chic', 'retro', 'streetwear'],
    seasons: ['all-season'],
    occasions: ['brunch', 'date', 'casual', 'class'],
    imageUrl: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&auto=format&fit=crop&q=80',
    tags: ['sunglasses', 'tortoise', 'cool', 'statement'],
  },
  {
    name: 'Chunky 18K Gold Huggie Hoops',
    category: 'accessories',
    subcategory: 'earrings',
    colorName: 'Buttercream Yellow',
    colorHex: '#FEF08A',
    colorTone: 'neutral',
    pattern: 'solid',
    material: '18K Gold Vermeil',
    fit: 'fitted',
    aesthetics: ['chic', 'minimalist', 'preppy'],
    seasons: ['all-season'],
    occasions: ['class', 'date', 'brunch', 'office', 'party', 'casual'],
    imageUrl: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?w=600&auto=format&fit=crop&q=80',
    tags: ['gold', 'jewelry', 'staple', 'glow'],
  },
  // Bags
  {
    name: 'Cream Butter Leather Baguette Bag',
    category: 'bags',
    subcategory: 'shoulder-bag',
    colorName: 'Oat Cream',
    colorHex: '#F4EFEA',
    colorTone: 'neutral',
    pattern: 'solid',
    material: 'Smooth Leather',
    fit: 'tailored',
    aesthetics: ['minimalist', 'chic'],
    seasons: ['all-season'],
    occasions: ['date', 'office', 'brunch', 'party'],
    imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&auto=format&fit=crop&q=80',
    tags: ['baguette', 'shoulder-bag', 'timeless'],
  },
  // Shoes
  {
    name: 'Strappy Buttercup Kitten Mules',
    category: 'shoes',
    subcategory: 'mules',
    colorName: 'Buttercream Yellow',
    colorHex: '#FEF08A',
    colorTone: 'pastel',
    pattern: 'solid',
    material: 'Vegan Leather',
    fit: 'fitted',
    aesthetics: ['chic', 'romantic'],
    seasons: ['spring', 'summer'],
    occasions: ['date', 'brunch', 'party'],
    imageUrl: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&auto=format&fit=crop&q=80',
    tags: ['mules', 'butter', 'heels', 'delicate'],
  },
  // Bottoms (for when a top has no bottoms in closet)
  {
    name: 'Vintage High-Rise Straight-Leg Jeans',
    category: 'bottoms',
    subcategory: 'jeans',
    colorName: 'Vintage Indigo Denim',
    colorHex: '#3B82F6',
    colorTone: 'neutral',
    pattern: 'solid',
    material: 'Rigid Denim',
    fit: 'relaxed',
    aesthetics: ['casual', 'streetwear', 'chic'],
    seasons: ['all-season'],
    occasions: ['class', 'brunch', 'date', 'casual', 'weekend'],
    imageUrl: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&auto=format&fit=crop&q=80',
    tags: ['denim', 'wide-leg', 'high-waist', 'versatile'],
  }
];

export function getBestMatchingPartners(
  item: GarmentItem,
  wardrobe: GarmentItem[],
  maxCount: number = 4
): MatchingPartnerResult[] {
  // 1. Filter out all incompatible garments
  const compatibleWardrobe = wardrobe.filter(other => isGarmentPairCompatible(item, other));

  // 2. Score harmony for all compatible garments
  const scoredPartners: MatchingPartnerResult[] = compatibleWardrobe.map(other => {
    const harmony = evaluateColorHarmony([
      { hex: item.colorHex, name: item.colorName },
      { hex: other.colorHex, name: other.colorName },
    ]);
    return {
      item: other,
      score: harmony.score,
      harmonyType: harmony.harmonyType,
      description: harmony.description,
      isSuggestion: false,
    };
  });

  // 3. Category diversity prioritization:
  const selected: MatchingPartnerResult[] = [];
  const usedIds = new Set<string>();

  if (item.category === 'tops') {
    // Top priority for a top: at least 1-2 bottoms!
    const bottoms = scoredPartners
      .filter(p => p.item.category === 'bottoms')
      .sort((a, b) => b.score - a.score);
    
    if (bottoms.length > 0) {
      selected.push(bottoms[0]);
      usedIds.add(bottoms[0].item.id);
      if (bottoms.length > 1) {
        selected.push(bottoms[1]);
        usedIds.add(bottoms[1].item.id);
      }
    }
  } else if (item.category === 'bottoms') {
    // Top priority for bottoms: at least 1-2 tops!
    const tops = scoredPartners
      .filter(p => p.item.category === 'tops')
      .sort((a, b) => b.score - a.score);
    
    if (tops.length > 0) {
      selected.push(tops[0]);
      usedIds.add(tops[0].item.id);
      if (tops.length > 1) {
        selected.push(tops[1]);
        usedIds.add(tops[1].item.id);
      }
    }
  } else if (item.category === 'dresses') {
    // For a dress: prioritize shrug/outerwear and accessories!
    const outers = scoredPartners
      .filter(p => p.item.category === 'outerwear')
      .sort((a, b) => b.score - a.score);
    const accs = scoredPartners
      .filter(p => p.item.category === 'accessories')
      .sort((a, b) => b.score - a.score);

    if (outers.length > 0) {
      selected.push(outers[0]);
      usedIds.add(outers[0].item.id);
    }
    if (accs.length > 0) {
      selected.push(accs[0]);
      usedIds.add(accs[0].item.id);
    }
  }

  // Fill remaining slots with the highest harmony remaining compatible items
  const remaining = scoredPartners
    .filter(p => !usedIds.has(p.item.id))
    .sort((a, b) => b.score - a.score);

  for (const r of remaining) {
    if (selected.length >= maxCount) break;
    selected.push(r);
    usedIds.add(r.item.id);
  }

  // 4. If closet does not have enough compatible pieces (e.g. less than maxCount),
  // supplement with curated companion suggestions (matching shrugs, accessories, shoes):
  if (selected.length < maxCount) {
    const candidatePool = CURATED_COMPANION_SUGGESTIONS
      .map((c, idx) => ({
        ...c,
        id: `curated-sugg-${c.category}-${idx}`,
        createdAt: Date.now(),
      } as GarmentItem))
      .filter(c => isGarmentPairCompatible(item, c) && !wardrobe.some(w => w.name.toLowerCase() === c.name.toLowerCase()));

    // Rank curated pool by harmony with the base item
    const scoredSuggestions = candidatePool.map(s => {
      const harmony = evaluateColorHarmony([
        { hex: item.colorHex, name: item.colorName },
        { hex: s.colorHex, name: s.colorName },
      ]);
      return {
        item: s,
        score: harmony.score,
        harmonyType: harmony.harmonyType,
        description: harmony.description,
        isSuggestion: true,
      };
    }).sort((a, b) => b.score - a.score);

    for (const sugg of scoredSuggestions) {
      if (selected.length >= maxCount) break;
      // Avoid duplicate categories if possible
      if (!selected.some(s => s.item.category === sugg.item.category && s.item.name === sugg.item.name)) {
        selected.push(sugg);
      }
    }
  }

  return selected.slice(0, maxCount);
}
