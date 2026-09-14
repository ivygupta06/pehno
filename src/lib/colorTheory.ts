// Color Theory & Fashion Harmony Engine

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number; // 0 - 360
  s: number; // 0 - 100
  l: number; // 0 - 100
}

export function hexToRgb(hex: string): RGB {
  const sanitized = hex.replace('#', '').trim();
  const fullHex = sanitized.length === 3 
    ? sanitized.split('').map(c => c + c).join('') 
    : sanitized;
  
  const intVal = parseInt(fullHex, 16);
  return {
    r: (intVal >> 16) & 255,
    g: (intVal >> 8) & 255,
    b: intVal & 255,
  };
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hexToHsl(hex: string): HSL {
  return rgbToHsl(hexToRgb(hex));
}

// Check if a color is a fashion neutral
export function isNeutral(hex: string, colorName: string = ''): boolean {
  const name = colorName.toLowerCase();
  if (
    name.includes('white') ||
    name.includes('black') ||
    name.includes('grey') ||
    name.includes('gray') ||
    name.includes('cream') ||
    name.includes('beige') ||
    name.includes('denim') ||
    name.includes('oat') ||
    name.includes('sand') ||
    name.includes('tan') ||
    name.includes('charcoal') ||
    name.includes('navy')
  ) {
    return true;
  }

  const { s, l } = hexToHsl(hex);
  // Low saturation is usually neutral, or extreme lightness
  return s < 18 || l > 93 || l < 12;
}

// Check if a color is pastel
export function isPastel(hex: string, colorName: string = ''): boolean {
  const name = colorName.toLowerCase();
  if (name.includes('pastel') || name.includes('baby') || name.includes('sage') || name.includes('butter') || name.includes('lavender') || name.includes('blush')) {
    return true;
  }
  const { s, l } = hexToHsl(hex);
  return l >= 70 && s >= 15 && s <= 75;
}

export interface HarmonyEvaluation {
  score: number; // 0 - 100
  harmonyType: string;
  description: string;
  verdict: 'flawless' | 'great' | 'harmonious' | 'bold' | 'clashing';
}

/**
 * Evaluates pairing between 2 or more garment colors based on fashion rules:
 * - Neutral anchoring (e.g. crisp white + blue denim)
 * - Tonal / Monochromatic
 * - Soft pastel harmony (sage + cream, butter + sky blue)
 * - Complementary contrast
 */
export function evaluateColorHarmony(colors: { hex: string; name: string }[]): HarmonyEvaluation {
  if (colors.length <= 1) {
    return {
      score: 95,
      harmonyType: 'Minimalist Clean',
      description: 'Clean single-palette statement.',
      verdict: 'flawless',
    };
  }

  const primary = colors[0];
  const secondary = colors[1];

  const primaryNeutral = isNeutral(primary.hex, primary.name);
  const secondaryNeutral = isNeutral(secondary.hex, secondary.name);

  const primaryHsl = hexToHsl(primary.hex);
  const secondaryHsl = hexToHsl(secondary.hex);

  // 1. Classic Neutral Pairing (e.g. Crisp White Top + Blue Jeans / Black Trousers)
  if (primaryNeutral && secondaryNeutral) {
    // Both neutral: check lightness contrast
    const lDiff = Math.abs(primaryHsl.l - secondaryHsl.l);
    if (lDiff > 40) {
      return {
        score: 98,
        harmonyType: 'Crisp High-Contrast Neutral',
        description: 'Timeless high-contrast pairing (like clean white with deep slate or indigo) providing instant structure.',
        verdict: 'flawless',
      };
    }
    return {
      score: 94,
      harmonyType: 'Tonal Oat & Neutral Harmony',
      description: 'Sophisticated quiet-luxury tonal blend with soft gradient undertones.',
      verdict: 'flawless',
    };
  }

  // 2. One Neutral + One Color (e.g. Butter Yellow knit + Denim/Cream or Sage Top + White Pants)
  if (primaryNeutral || secondaryNeutral) {
    const coloredItem = primaryNeutral ? secondary : primary;
    const neutralItem = primaryNeutral ? primary : secondary;

    if (isPastel(coloredItem.hex, coloredItem.name)) {
      return {
        score: 96,
        harmonyType: 'Soft Pastel & Neutral Anchor',
        description: `${coloredItem.name} paired with neutral ${neutralItem.name} lets the pastel glow without overwhelming the silhouette.`,
        verdict: 'flawless',
      };
    }

    return {
      score: 92,
      harmonyType: 'Grounded Accent Harmony',
      description: `The grounding neutral tones of ${neutralItem.name} anchor the vibrant personality of ${coloredItem.name}.`,
      verdict: 'great',
    };
  }

  // 3. Both are colored: Evaluate hue difference
  let hueDiff = Math.abs(primaryHsl.h - secondaryHsl.h);
  if (hueDiff > 180) hueDiff = 360 - hueDiff;

  // Pastels pair beautifully even across hues!
  const bothPastel = isPastel(primary.hex, primary.name) && isPastel(secondary.hex, secondary.name);
  if (bothPastel) {
    return {
      score: 93,
      harmonyType: 'Pastel Dreamscape Harmony',
      description: `Soft ${primary.name} and gentle ${secondary.name} share delicate saturation, creating an airy, Pinterest-worthy aesthetic.`,
      verdict: 'flawless',
    };
  }

  // Analogous hues (close together on the color wheel: 0 - 45 deg)
  if (hueDiff <= 45) {
    return {
      score: 90,
      harmonyType: 'Analogous Flow',
      description: 'Adjacent shades on the color wheel create a cohesive, poetic gradient.',
      verdict: 'harmonious',
    };
  }

  // Complementary hues (opposite on the color wheel: 150 - 180 deg)
  if (hueDiff >= 140 && hueDiff <= 180) {
    return {
      score: 88,
      harmonyType: 'Complementary Color Play',
      description: 'Artistic complementary contrast that creates high visual energy when balanced with accessories.',
      verdict: 'bold',
    };
  }

  // Triadic or dynamic
  return {
    score: 82,
    harmonyType: 'Eclectic Palette',
    description: 'Dynamic color pairing that works best when styled with clean neutral footwear and bags.',
    verdict: 'harmonious',
  };
}

// Approximate color name from hex
export function getApproximateColorName(hex: string): { name: string; hex: string; tone: 'pastel' | 'neutral' | 'earthy' | 'vibrant' | 'dark' } {
  const hsl = hexToHsl(hex);
  const { h, s, l } = hsl;

  if (l > 92 && s < 15) return { name: 'Crisp White', hex: '#FAF9F6', tone: 'neutral' };
  if (l < 15) return { name: 'Deep Charcoal', hex: '#23272F', tone: 'neutral' };
  if (s < 12) {
    if (l > 75) return { name: 'Oat Cream', hex: '#F4EFEA', tone: 'neutral' };
    if (l > 40) return { name: 'Soft Heather Grey', hex: '#9CA3AF', tone: 'neutral' };
    return { name: 'Slate Grey', hex: '#4B5563', tone: 'neutral' };
  }

  // Blue spectrum (180 - 240)
  if (h >= 180 && h <= 250) {
    if (l >= 75) return { name: 'Baby Sky Blue', hex: '#BAE6FD', tone: 'pastel' };
    if (s > 40 && l < 45) return { name: 'Vintage Indigo Denim', hex: '#3B82F6', tone: 'neutral' };
    return { name: 'Powder Blue', hex: '#93C5FD', tone: 'pastel' };
  }

  // Green spectrum (70 - 170)
  if (h >= 70 && h <= 170) {
    if (l >= 70) return { name: 'Matcha Sage Green', hex: '#D5E5DA', tone: 'pastel' };
    if (l < 40) return { name: 'Forest Olive', hex: '#3F6212', tone: 'earthy' };
    return { name: 'Mint Green', hex: '#86EFAC', tone: 'pastel' };
  }

  // Yellow / Butter (40 - 69)
  if (h >= 40 && h <= 69) {
    if (l >= 75) return { name: 'Buttercream Yellow', hex: '#FEF08A', tone: 'pastel' };
    return { name: 'Warm Mustard', hex: '#EAB308', tone: 'earthy' };
  }

  // Orange / Peach (20 - 39)
  if (h >= 20 && h <= 39) {
    if (l >= 75) return { name: 'Peach Sorbet', hex: '#FED7AA', tone: 'pastel' };
    if (l < 45) return { name: 'Warm Terracotta', hex: '#C2410C', tone: 'earthy' };
    return { name: 'Apricot Cream', hex: '#FDBA74', tone: 'pastel' };
  }

  // Purple / Lavender (251 - 310)
  if (h >= 251 && h <= 310) {
    if (l >= 70) return { name: 'Lavender Mist', hex: '#E9D5FF', tone: 'pastel' };
    return { name: 'Lilac Berry', hex: '#A855F7', tone: 'vibrant' };
  }

  // Pink / Rose (311 - 360 || 0 - 19)
  if (l >= 75) return { name: 'Blush Rose', hex: '#FCE7F3', tone: 'pastel' };
  if (l < 40) return { name: 'Burgundy Wine', hex: '#881337', tone: 'dark' };
  return { name: 'Dusty Rose', hex: '#F472B6', tone: 'pastel' };
}

/**
 * Simplifies any fashion color name to a single, clean color word
 * (e.g., "Burgundy Wine" -> "Brown", "Slate Grey" -> "Grey")
 */
export function getSimpleColorWord(colorName: string = ''): string {
  const lower = (colorName || '').toLowerCase().trim();

  // Red & Deep Reds
  if (lower.includes('burgundy') || lower.includes('wine') || lower.includes('maroon')) {
    return 'Brown'; // User specifically requested "Brown layer top" for burgundy/wine tops
  }
  if (lower.includes('red') || lower.includes('crimson') || lower.includes('scarlet') || lower.includes('ruby') || lower.includes('cherry')) {
    return 'Red';
  }

  // Black & Darks
  if (lower.includes('black') || lower.includes('charcoal')) {
    return 'Black';
  }

  // Grey & Silver
  if (lower.includes('grey') || lower.includes('gray') || lower.includes('silver') || lower.includes('ash') || lower.includes('heather')) {
    return 'Grey';
  }

  // White
  if (lower.includes('white') || lower.includes('ivory') || lower.includes('chalk')) {
    return 'White';
  }

  // Cream / Beige / Neutral
  if (lower.includes('cream') || lower.includes('buttercream') || lower.includes('oat') || lower.includes('beige') || lower.includes('ecru') || lower.includes('sand') || lower.includes('nude') || lower.includes('camel') || lower.includes('tan')) {
    return 'Cream';
  }

  // Brown
  if (lower.includes('brown') || lower.includes('chocolate') || lower.includes('espresso') || lower.includes('mocha') || lower.includes('coffee')) {
    return 'Brown';
  }

  // Blue & Navy
  if (lower.includes('navy')) {
    return 'Navy';
  }
  if (lower.includes('blue') || lower.includes('denim') || lower.includes('indigo') || lower.includes('sky') || lower.includes('cyan') || lower.includes('azure') || lower.includes('cobalt') || lower.includes('teal')) {
    return 'Blue';
  }

  // Green & Sage
  if (lower.includes('sage') || lower.includes('matcha')) {
    return 'Sage';
  }
  if (lower.includes('olive') || lower.includes('khaki')) {
    return 'Olive';
  }
  if (lower.includes('green') || lower.includes('mint') || lower.includes('emerald') || lower.includes('forest') || lower.includes('pistachio')) {
    return 'Green';
  }

  // Yellow
  if (lower.includes('yellow') || lower.includes('butter') || lower.includes('lemon') || lower.includes('mustard')) {
    return 'Yellow';
  }

  // Pink
  if (lower.includes('pink') || lower.includes('blush') || lower.includes('rose') || lower.includes('fuchsia') || lower.includes('coral') || lower.includes('peach')) {
    return 'Pink';
  }

  // Purple & Lavender
  if (lower.includes('lavender') || lower.includes('lilac')) {
    return 'Lavender';
  }
  if (lower.includes('purple') || lower.includes('violet') || lower.includes('plum') || lower.includes('mauve')) {
    return 'Purple';
  }

  // Orange & Amber
  if (lower.includes('orange') || lower.includes('terracotta') || lower.includes('rust') || lower.includes('apricot') || lower.includes('amber')) {
    return 'Orange';
  }

  // Gold
  if (lower.includes('gold')) {
    return 'Gold';
  }

  // Fallback to the first word, cleaned
  const first = colorName.trim().split(/\s+/)[0] || 'Classic';
  const clean = first.replace(/[^a-zA-Z]/g, '');
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase() : 'Classic';
}

/**
 * Universal Garment Naming Formatter
 * STRICT RULES:
 * 1. Maximum 3 words total (1 or 2 descriptor/noun words + 1 color word).
 * 2. The FIRST word is ALWAYS the simple color!
 * 3. The LAST word is ALWAYS the garment noun (never lost/cut off).
 * Examples: "Brown Layer Top", "Black Net Top", "Blue Knit Top", "Red Slip Dress", "Blue Straight Jeans"
 */
export function formatGarmentName(
  rawName: string = '',
  colorName: string = '',
  category: string = '',
  subcategory: string = ''
): string {
  const cleanRaw = (rawName || '').trim();
  const lowerRaw = cleanRaw.toLowerCase();
  const lowerColor = (colorName || '').toLowerCase();
  const lowerSub = (subcategory || '').toLowerCase();
  const lowerCat = (category || '').toLowerCase();

  // 1. Identify the Primary Simple Color Word (Word 1).
  // Never infer "net" (or any other fabric) from a dark color. It must be
  // explicitly present in the visual model's label or garment metadata.
  const colorWord = getSimpleColorWord(colorName || cleanRaw);

  // 2. Determine the Core Garment Noun (Word 3 or Word 2)
  let coreNoun = '';
  if (lowerCat === 'dresses' || lowerSub.includes('dress') || lowerRaw.includes('dress')) {
    coreNoun = 'Dress';
  } else if (lowerCat === 'bottoms' || lowerSub.includes('jean') || lowerRaw.includes('jean')) {
    coreNoun = (lowerSub.includes('jean') || lowerRaw.includes('jean') || lowerSub === 'bottoms') ? 'Jeans' : (lowerRaw.includes('skirt') || lowerSub.includes('skirt') ? 'Skirt' : (lowerRaw.includes('shorts') ? 'Shorts' : 'Trousers'));
  } else if (lowerCat === 'shoes' || lowerSub.includes('heel') || lowerRaw.includes('heel') || lowerRaw.includes('sneaker') || lowerSub.includes('sneaker') || lowerRaw.includes('boot') || lowerRaw.includes('mule') || lowerRaw.includes('loafer')) {
    if (lowerRaw.includes('heel') || lowerSub.includes('heel') || lowerSub.includes('pump') || lowerRaw.includes('stiletto') || lowerRaw.includes('slingback')) {
      coreNoun = 'Heels';
    } else if (lowerRaw.includes('sneaker') || lowerSub.includes('sneaker')) {
      coreNoun = 'Sneakers';
    } else if (lowerRaw.includes('mule') || lowerSub.includes('mule')) {
      coreNoun = 'Mules';
    } else if (lowerRaw.includes('loafer') || lowerSub.includes('loafer')) {
      coreNoun = 'Loafers';
    } else if (lowerRaw.includes('boot') || lowerSub.includes('boot')) {
      coreNoun = 'Boots';
    } else {
      coreNoun = 'Shoes';
    }
  } else if (lowerCat === 'bags' || lowerSub.includes('bag') || lowerRaw.includes('bag') || lowerRaw.includes('tote') || lowerRaw.includes('clutch')) {
    coreNoun = lowerRaw.includes('clutch') ? 'Clutch' : (lowerRaw.includes('tote') ? 'Tote' : 'Bag');
  } else if (lowerCat === 'outerwear' || lowerSub.includes('jacket') || lowerRaw.includes('jacket') || lowerSub.includes('coat') || lowerRaw.includes('coat') || lowerSub.includes('blazer') || lowerRaw.includes('blazer')) {
    coreNoun = lowerRaw.includes('blazer') ? 'Blazer' : (lowerRaw.includes('coat') ? 'Coat' : (lowerRaw.includes('shrug') ? 'Shrug' : 'Jacket'));
  } else if (lowerCat === 'accessories') {
    if (lowerRaw.includes('sunglasses') || lowerSub.includes('sunglasses')) coreNoun = 'Sunglasses';
    else if (lowerRaw.includes('necklace') || lowerSub.includes('necklace')) coreNoun = 'Necklace';
    else if (lowerRaw.includes('earrings') || lowerSub.includes('earrings')) coreNoun = 'Earrings';
    else if (lowerRaw.includes('belt') || lowerSub.includes('belt')) coreNoun = 'Belt';
    else coreNoun = 'Accessory';
  } else {
    // Tops. Prefer the model's actual subcategory so two black pieces do not
    // both collapse into the generic name "Black Top".
    if (lowerRaw.includes('cardigan') || lowerSub.includes('cardigan')) coreNoun = 'Cardigan';
    else if (lowerRaw.includes('hoodie') || lowerSub.includes('hoodie')) coreNoun = 'Hoodie';
    else if (lowerRaw.includes('corset') || lowerSub.includes('corset')) coreNoun = 'Corset';
    else if (lowerRaw.includes('tube') || lowerSub.includes('tube-top')) coreNoun = 'Tube Top';
    else if (lowerRaw.includes('shirt') || lowerSub.includes('button-down')) coreNoun = 'Shirt';
    else if (lowerRaw.includes('blouse') || lowerSub.includes('blouse')) coreNoun = 'Blouse';
    else if (lowerRaw.includes('sweater') || lowerSub.includes('knit-sweater')) coreNoun = 'Sweater';
    else if (lowerRaw.includes('tank') || lowerSub.includes('tank-top')) coreNoun = 'Tank';
    else if (lowerRaw.includes('tee') || lowerSub.includes('t-shirt')) coreNoun = 'Tee';
    else coreNoun = 'Top';
  }

  // 3. Extract an optional clean 1-word style descriptor (Word 2)
  let styleDescriptor = '';
  const searchCorpus = `${lowerRaw} ${lowerSub} ${lowerColor}`;

  if (coreNoun === 'Dress') {
    if (searchCorpus.includes('slip')) styleDescriptor = 'Slip';
    else if (searchCorpus.includes('midi')) styleDescriptor = 'Midi';
    else if (searchCorpus.includes('mini')) styleDescriptor = 'Mini';
    else if (searchCorpus.includes('maxi')) styleDescriptor = 'Maxi';
    else if (searchCorpus.includes('wrap')) styleDescriptor = 'Wrap';
    else if (searchCorpus.includes('bodycon')) styleDescriptor = 'Bodycon';
    else if (searchCorpus.includes('sundress') || searchCorpus.includes('summer')) styleDescriptor = 'Sun';
    else if (searchCorpus.includes('strappy') || searchCorpus.includes('strap')) styleDescriptor = 'Strappy';
    else if (searchCorpus.includes('floral')) styleDescriptor = 'Floral';
    else if (searchCorpus.includes('ruffle')) styleDescriptor = 'Ruffle';
  } else if (coreNoun === 'Jeans' || coreNoun === 'Trousers') {
    if (searchCorpus.includes('straight')) styleDescriptor = 'Straight';
    else if (searchCorpus.includes('wide')) styleDescriptor = 'Wide';
    else if (searchCorpus.includes('flare') || searchCorpus.includes('flared')) styleDescriptor = 'Flared';
    else if (searchCorpus.includes('crop') || searchCorpus.includes('cropped')) styleDescriptor = 'Cropped';
    else if (searchCorpus.includes('cargo')) styleDescriptor = 'Cargo';
    else if (searchCorpus.includes('tailored')) styleDescriptor = 'Tailored';
    else if (searchCorpus.includes('vintage')) styleDescriptor = 'Vintage';
    else if (searchCorpus.includes('denim')) styleDescriptor = 'Denim';
  } else if (coreNoun === 'Heels' || coreNoun === 'Shoes' || coreNoun === 'Mules') {
    if (searchCorpus.includes('strappy')) styleDescriptor = 'Strappy';
    else if (searchCorpus.includes('kitten')) styleDescriptor = 'Kitten';
    else if (searchCorpus.includes('block')) styleDescriptor = 'Block';
    else if (searchCorpus.includes('slingback')) styleDescriptor = 'Slingback';
    else if (searchCorpus.includes('pointed')) styleDescriptor = 'Pointed';
    else if (searchCorpus.includes('stiletto')) styleDescriptor = 'Stiletto';
  } else if (coreNoun === 'Sneakers') {
    if (searchCorpus.includes('court')) styleDescriptor = 'Court';
    else if (searchCorpus.includes('chunky')) styleDescriptor = 'Chunky';
    else if (searchCorpus.includes('canvas')) styleDescriptor = 'Canvas';
    else if (searchCorpus.includes('platform')) styleDescriptor = 'Platform';
  } else if (coreNoun === 'Bag' || coreNoun === 'Tote' || coreNoun === 'Clutch') {
    if (searchCorpus.includes('leather')) styleDescriptor = 'Leather';
    else if (searchCorpus.includes('shoulder')) styleDescriptor = 'Shoulder';
    else if (searchCorpus.includes('crossbody')) styleDescriptor = 'Crossbody';
    else if (searchCorpus.includes('woven') || searchCorpus.includes('raffia')) styleDescriptor = 'Woven';
    else if (searchCorpus.includes('canvas')) styleDescriptor = 'Canvas';
  } else if (coreNoun === 'Jacket' || coreNoun === 'Blazer' || coreNoun === 'Coat' || coreNoun === 'Shrug') {
    if (searchCorpus.includes('leather')) styleDescriptor = 'Leather';
    else if (searchCorpus.includes('denim')) styleDescriptor = 'Denim';
    else if (searchCorpus.includes('trench')) styleDescriptor = 'Trench';
    else if (searchCorpus.includes('wool')) styleDescriptor = 'Wool';
    else if (searchCorpus.includes('puffer')) styleDescriptor = 'Puffer';
    else if (searchCorpus.includes('ribbed')) styleDescriptor = 'Ribbed';
  } else if (coreNoun === 'Sunglasses' || coreNoun === 'Necklace' || coreNoun === 'Earrings') {
    if (searchCorpus.includes('cat-eye') || searchCorpus.includes('cat eye')) styleDescriptor = 'Cat-Eye';
    else if (searchCorpus.includes('chain')) styleDescriptor = 'Chain';
    else if (searchCorpus.includes('huggie')) styleDescriptor = 'Huggie';
    else if (searchCorpus.includes('tortoiseshell')) styleDescriptor = 'Tortoiseshell';
  } else {
    // Tops and others
    if (searchCorpus.includes('layer') || searchCorpus.includes('layered')) styleDescriptor = 'Layer';
    else if (searchCorpus.includes('net') || searchCorpus.includes('mesh')) styleDescriptor = 'Net';
    else if (searchCorpus.includes('knit')) styleDescriptor = 'Knit';
    else if (searchCorpus.includes('off shoulder') || searchCorpus.includes('off-shoulder')) styleDescriptor = 'Off-Shoulder';
    else if (searchCorpus.includes('long sleeve') || searchCorpus.includes('long-sleeve')) styleDescriptor = 'Long';
    else if (searchCorpus.includes('crop') || searchCorpus.includes('cropped')) styleDescriptor = 'Crop';
    else if (searchCorpus.includes('poplin')) styleDescriptor = 'Poplin';
    else if (searchCorpus.includes('linen')) styleDescriptor = 'Linen';
    else if (searchCorpus.includes('ribbed') || searchCorpus.includes('rib')) styleDescriptor = 'Ribbed';
    else if (searchCorpus.includes('cotton')) styleDescriptor = 'Cotton';
    else if (searchCorpus.includes('silk') || searchCorpus.includes('satin')) styleDescriptor = 'Satin';
    else if (searchCorpus.includes('oversized')) styleDescriptor = 'Oversized';
    else if (searchCorpus.includes('tube')) styleDescriptor = 'Tube';
  }

  // "Tube Top" is already a two-word garment noun. Do not add another
  // descriptor and accidentally exceed the three-word name limit.
  if (coreNoun.split(/\s+/).length > 1) {
    styleDescriptor = '';
  }

  // Ensure styleDescriptor does not duplicate color or noun.
  if (styleDescriptor.toLowerCase() === colorWord.toLowerCase() || coreNoun.toLowerCase().split(/\s+/).includes(styleDescriptor.toLowerCase())) {
    styleDescriptor = '';
  }

  // 4. Assemble strictly: Color (Word 1) + [Style (Word 2)] + Noun (Word 3) = MAX 3 WORDS!
  if (styleDescriptor) {
    return `${colorWord} ${styleDescriptor} ${coreNoun}`;
  }
  return `${colorWord} ${coreNoun}`;
}
