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
