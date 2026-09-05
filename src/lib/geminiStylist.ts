import { GarmentCategory, GarmentItem, Outfit, Occasion, ExternalSuggestion, StyleAesthetic } from '../types/wardrobe';

interface GeminiOutfitResponse {
  outfits: {
    title: string;
    vibe: StyleAesthetic;
    colorHarmonyType: string;
    compatibilityScore: number;
    topId?: string;
    bottomId?: string;
    dressId?: string;
    outerwearId?: string;
    shoesId?: string;
    bagId?: string;
    accessoryId?: string;
    stylingNotes: string[];
    externalSuggestions?: {
      category: GarmentCategory;
      name: string;
      color: string;
      colorHex: string;
      reasoning: string;
      searchQuery: string;
      vibe: string;
    }[];
  }[];
}

const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-3.7-flash'];

/**
 * Execute Gemini text generation with multi-model fallback
 */
async function callGeminiText(apiKey: string, prompt: string, maxTokens?: number): Promise<string> {
  let lastError: any = null;

  for (const model of GEMINI_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
            ...(maxTokens ? { maxOutputTokens: maxTokens } : {}),
          },
        }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          lastError = new Error(`Model ${model} not found (404)`);
          continue;
        }
        const errText = await response.text();
        let msg = `Gemini API Error (${response.status})`;
        try {
          const parsed = JSON.parse(errText);
          msg = parsed.error?.message || msg;
        } catch (e) {}
        throw new Error(msg);
      }

      const json = await response.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('Empty response from Gemini.');
      return rawText;
    } catch (err: any) {
      lastError = err;
      if (err.message && err.message.includes('404')) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('All Gemini models failed to respond.');
}

/**
 * Validate a Gemini API key by making a lightweight test call
 */
export async function validateGeminiApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  if (!apiKey || apiKey.trim().length < 15) {
    return { valid: false, error: 'API key is too short or empty.' };
  }

  try {
    await callGeminiText(apiKey, 'Respond with {"status": "ok"}', 10);
    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Network connection failed.' };
  }
}

/**
 * Generate 3 curated outfits using Google Gemini
 */
export async function generateOutfitsWithGemini(
  wardrobe: GarmentItem[],
  occasion: Occasion,
  apiKey: string
): Promise<Outfit[]> {
  // Simplified inventory of wardrobe items for the prompt
  const inventory = wardrobe.map(i => ({
    id: i.id,
    name: i.name,
    category: i.category,
    subcategory: i.subcategory,
    colorName: i.colorName,
    colorHex: i.colorHex,
    colorTone: i.colorTone,
    fit: i.fit,
    material: i.material || 'Cotton blend',
    occasions: i.occasions,
    aesthetics: i.aesthetics,
  }));

  const prompt = `You are an elite high-fashion digital stylist, personal shopper, and color theory expert.
Your client wants 3 distinct, COMPLETE full outfits for the occasion: "${occasion.toUpperCase()}".

Here is the client's current wardrobe inventory:
${JSON.stringify(inventory, null, 2)}

FASHION & STYLING RULES TO APPLY:
1. STRICT SILHOUETTE RULES:
   - DRESSES: If an outfit uses a DRESS (dressId), you MUST NEVER assign topId or bottomId! A dress is a complete one-piece garment. NEVER pair a dress with a top or blouse! Only pair with shoesId, bagId, accessoryId, and optional outerwearId.
   - TOPS & BOTTOMS: Pair topId with bottomId from inventory. If the client has NO bottoms or jeans in their closet, LEAVE bottomId NULL. DO NOT randomly match with another top or dress! Instead, add a recommended pair of jeans/bottoms to 'externalSuggestions'.
   - BOTTOMS: If styling bottoms and client has NO tops, LEAVE topId NULL and recommend a top in 'externalSuggestions'.
2. COLOR HARMONY:
   - Use high-contrast neutral foundations (e.g. crisp white top + vintage blue denim, cream + slate grey).
   - Use soft pastel harmonies (e.g. matcha sage green + buttercream yellow + cream; baby blue + oat linen; blush + heather grey).
   - Use tonal quiet-luxury monochromes (e.g. shades of oat, beige, and camel).
3. SILHOUETTE BALANCE:
   - Contrast volume: pair fitted tops with relaxed/wide-leg bottoms, or oversized drape with tailored bottoms.
4. INVENTORY USAGE:
   - Select item IDs that physically exist in the wardrobe inventory.
5. EXTERNAL SUGGESTIONS:
   - Whenever an outfit needs missing pieces (e.g. no jeans in closet for a top, or no shoes/bag for a dress), provide them in 'externalSuggestions' with search queries and fashion reasoning.

Return a JSON object strictly adhering to this schema:
{
  "outfits": [
    {
      "title": "Evocative fashion outfit title (e.g. Golden Hour Linen Chic)",
      "vibe": "casual" | "chic" | "streetwear" | "minimalist" | "preppy" | "romantic" | "formal",
      "colorHarmonyType": "e.g. Crisp High-Contrast, Soft Pastel Harmony, Tonal Neutral",
      "compatibilityScore": 95,
      "topId": "item-id (null if wearing dress or no top)",
      "bottomId": "item-id (null if wearing dress or no bottoms in closet)",
      "dressId": "item-id (optional)",
      "outerwearId": "item-id (optional)",
      "shoesId": "item-id (optional)",
      "bagId": "item-id (optional)",
      "accessoryId": "item-id (optional)",
      "stylingNotes": [
        "Specific explanation of why these colors work together",
        "How the silhouette balances volume",
        "Why this is perfect for ${occasion}"
      ],
      "externalSuggestions": [
        {
          "category": "accessories" | "bags" | "shoes" | "outerwear" | "bottoms" | "tops",
          "name": "Tortoiseshell Cat-Eye Sunglasses",
          "color": "Warm Amber",
          "colorHex": "#B45309",
          "reasoning": "Adds warm retro contrast to ground the light pastel tones",
          "searchQuery": "tortoiseshell cat eye sunglasses vintage aesthetic",
          "vibe": "chic"
        }
      ]
    }
  ]
}

Return ONLY valid JSON with no markdown backticks or commentary.`;

  const rawText = await callGeminiText(apiKey, prompt);

  let cleanRaw = rawText.trim();
  const jsonMatch = cleanRaw.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleanRaw = jsonMatch[0];

  const parsed: GeminiOutfitResponse = JSON.parse(cleanRaw);
  const wardrobeMap = new Map(wardrobe.map(i => [i.id, i]));

  return parsed.outfits.map((o, idx) => {
    let top = o.topId ? wardrobeMap.get(o.topId) : undefined;
    let bottom = o.bottomId ? wardrobeMap.get(o.bottomId) : undefined;
    const dress = o.dressId ? wardrobeMap.get(o.dressId) : undefined;
    const outerwear = o.outerwearId ? wardrobeMap.get(o.outerwearId) : undefined;
    let shoes = o.shoesId ? wardrobeMap.get(o.shoesId) : undefined;
    let bag = o.bagId ? wardrobeMap.get(o.bagId) : undefined;
    const accessory = o.accessoryId ? wardrobeMap.get(o.accessoryId) : undefined;

    const externalSuggestions: ExternalSuggestion[] = (o.externalSuggestions || []).map((s, sIdx) => ({
      id: `gemini-ext-${Date.now()}-${sIdx}`,
      category: s.category as GarmentCategory,
      name: s.name,
      color: s.color,
      colorHex: s.colorHex || '#B45309',
      reasoning: s.reasoning,
      searchQuery: s.searchQuery,
      vibe: s.vibe || 'chic',
    }));

    // CRITICAL RULE 1: If a dress is chosen, it is a complete 1-piece. NEVER pair with a top or bottom!
    if (dress) {
      top = undefined;
      bottom = undefined;
    } else {
      const topsInWardrobe = wardrobe.filter(i => i.category === 'tops');
      const bottomsInWardrobe = wardrobe.filter(i => i.category === 'bottoms');

      if (!top && topsInWardrobe.length > 0) {
        top = topsInWardrobe[idx % topsInWardrobe.length];
      }

      if (!bottom && bottomsInWardrobe.length > 0) {
        const jean = bottomsInWardrobe.find(b => b.subcategory === 'jeans' || b.name.toLowerCase().includes('jean'));
        bottom = jean || bottomsInWardrobe[idx % bottomsInWardrobe.length];
      }

      // If top exists but NO bottoms exist in wardrobe, do NOT randomly match!
      // Add a recommended bottom/jeans link to externalSuggestions:
      if (top && !bottom) {
        const hasBottomSugg = externalSuggestions.some(s => s.category === 'bottoms');
        if (!hasBottomSugg) {
          externalSuggestions.unshift({
            id: `gemini-ext-jeans-${Date.now()}-${idx}`,
            category: 'bottoms',
            name: 'High-Waist Straight-Leg Vintage Blue Jeans',
            color: 'Classic Vintage Blue',
            colorHex: '#3B82F6',
            reasoning: `No bottoms in closet. Complete this ${top.name} with classic straight-leg denim.`,
            searchQuery: `high waist straight leg blue jeans ${top.name}`,
            vibe: o.vibe || 'casual',
          });
        }
      }

      // If bottom exists but NO tops exist in wardrobe:
      if (bottom && !top) {
        const hasTopSugg = externalSuggestions.some(s => s.category === 'tops');
        if (!hasTopSugg) {
          externalSuggestions.unshift({
            id: `gemini-ext-top-${Date.now()}-${idx}`,
            category: 'tops',
            name: 'Crisp Cotton Poplin Relaxed Shirt',
            color: 'Crisp White',
            colorHex: '#FFFFFF',
            reasoning: `No tops in closet. Pair your ${bottom.name} with a timeless white poplin shirt.`,
            searchQuery: `relaxed white cotton poplin button down shirt`,
            vibe: o.vibe || 'chic',
          });
        }
      }
    }

    // Footwear & bag fallback only if present in closet
    if (!shoes) {
      const shoesInWardrobe = wardrobe.filter(i => i.category === 'shoes');
      if (shoesInWardrobe.length > 0) shoes = shoesInWardrobe[idx % shoesInWardrobe.length];
    }
    if (!bag) {
      const bagsInWardrobe = wardrobe.filter(i => i.category === 'bags');
      if (bagsInWardrobe.length > 0) bag = bagsInWardrobe[idx % bagsInWardrobe.length];
    }

    return {
      id: `gemini-outfit-${occasion}-${idx}-${Date.now()}`,
      title: o.title,
      description: `${o.vibe.toUpperCase()} • Styled by Gemini AI for ${occasion.toUpperCase()}`,
      top,
      bottom,
      dress,
      outerwear,
      shoes,
      bag,
      accessory,
      externalSuggestions,
      occasion,
      compatibilityScore: o.compatibilityScore || 95,
      colorHarmonyType: o.colorHarmonyType || 'Gemini AI Harmony',
      stylingNotes: o.stylingNotes || ['Styled based on color harmony and silhouette proportion balance.'],
      vibe: o.vibe || 'chic',
      createdAt: Date.now(),
    };
  });
}

/**
 * Style a specific hero piece using Gemini AI
 */
export async function styleItemWithGemini(
  selectedItem: GarmentItem,
  wardrobe: GarmentItem[],
  apiKey: string
): Promise<Outfit[]> {
  const inventory = wardrobe.map(i => ({
    id: i.id,
    name: i.name,
    category: i.category,
    subcategory: i.subcategory,
    colorName: i.colorName,
    colorHex: i.colorHex,
    fit: i.fit,
    material: i.material,
  }));

  const prompt = `You are an elite celebrity fashion stylist and color theory specialist.
Your client wants 3 distinct styling looks built around one specific hero piece from their closet:
Hero Item: "${selectedItem.name}" (${selectedItem.colorName}, Category: ${selectedItem.category}, Fit: ${selectedItem.fit})

Here is the rest of their wardrobe:
${JSON.stringify(inventory, null, 2)}

CRITICAL STYLING REQUIREMENTS:
1. COMPLETE FULL OUTFIT:
   - If the hero item is a TOP (category: tops), you MUST select a matching bottom (bottomId) from the inventory (PRIORITIZE the client's uploaded jeans or denim for casual/everyday looks).
   - If the hero item is a BOTTOM/JEANS (category: bottoms), you MUST select a matching top (topId) from the inventory.
   - If the hero item is a DRESS (category: dresses), pair with shoesId, bagId, accessoryId, and optional outerwearId.
   - NEVER return an incomplete outfit with only 1 piece! Always create a full look.
2. 3 DISTINCT LOOKS:
   Look 1: Casual Day-to-Day / Campus
   Look 2: Elevated Weekend Patio Brunch / Day Out
   Look 3: Golden Hour Date / Evening Drinks

Return JSON strictly adhering to schema:
{
  "outfits": [
    {
      "title": "Evocative Look Title",
      "vibe": "casual" | "chic" | "romantic",
      "colorHarmonyType": "Harmony description (e.g. Crisp White & Vintage Denim Contrast)",
      "compatibilityScore": 96,
      "topId": "item-id",
      "bottomId": "item-id",
      "dressId": "item-id (optional)",
      "outerwearId": "item-id (optional)",
      "shoesId": "item-id",
      "bagId": "item-id",
      "accessoryId": "item-id",
      "stylingNotes": ["Specific note explaining why the hero piece pairs so well with the selected items"],
      "externalSuggestions": [
        {
          "category": "accessories" | "bags" | "shoes" | "bottoms" | "tops",
          "name": "Suggestion Name",
          "color": "Color",
          "colorHex": "#HEX",
          "reasoning": "Reason",
          "searchQuery": "Google shopping query",
          "vibe": "chic"
        }
      ]
    }
  ]
}
Return ONLY valid JSON with no markdown code blocks.`;

  const rawText = await callGeminiText(apiKey, prompt);

  let cleanRaw = rawText.trim();
  const jsonMatch = cleanRaw.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleanRaw = jsonMatch[0];

  const parsed: GeminiOutfitResponse = JSON.parse(cleanRaw);
  const wardrobeMap = new Map(wardrobe.map(i => [i.id, i]));

  return parsed.outfits.map((o, idx) => {
    let top = o.topId ? wardrobeMap.get(o.topId) : (selectedItem.category === 'tops' ? selectedItem : undefined);
    let bottom = o.bottomId ? wardrobeMap.get(o.bottomId) : (selectedItem.category === 'bottoms' ? selectedItem : undefined);
    const dress = selectedItem.category === 'dresses' ? selectedItem : (o.dressId ? wardrobeMap.get(o.dressId) : undefined);
    const outerwear = o.outerwearId ? wardrobeMap.get(o.outerwearId) : undefined;
    let shoes = o.shoesId ? wardrobeMap.get(o.shoesId) : undefined;
    let bag = o.bagId ? wardrobeMap.get(o.bagId) : undefined;
    const accessory = o.accessoryId ? wardrobeMap.get(o.accessoryId) : undefined;

    // Guaranteed complete outfit fallback:
    // If hero item is top and bottom is missing, pull client's uploaded jeans or bottoms
    if (selectedItem.category === 'tops' && !bottom && !dress) {
      const bottomsInWardrobe = wardrobe.filter(i => i.category === 'bottoms');
      const jeans = bottomsInWardrobe.find(b => b.subcategory === 'jeans' || b.name.toLowerCase().includes('jean'));
      bottom = jeans || bottomsInWardrobe[idx % (bottomsInWardrobe.length || 1)];
    }

    // If hero item is bottoms/jeans and top is missing, pull client's tops
    if (selectedItem.category === 'bottoms' && !top && !dress) {
      const topsInWardrobe = wardrobe.filter(i => i.category === 'tops');
      top = topsInWardrobe[idx % (topsInWardrobe.length || 1)];
    }

    // Footwear fallback
    if (!shoes) {
      const shoesInWardrobe = wardrobe.filter(i => i.category === 'shoes');
      shoes = shoesInWardrobe[idx % (shoesInWardrobe.length || 1)];
    }

    // Bag fallback
    if (!bag) {
      const bagsInWardrobe = wardrobe.filter(i => i.category === 'bags');
      bag = bagsInWardrobe[idx % (bagsInWardrobe.length || 1)];
    }

    const externalSuggestions: ExternalSuggestion[] = (o.externalSuggestions || []).map((s, sIdx) => ({
      id: `gemini-ext-${Date.now()}-${sIdx}`,
      category: s.category as GarmentCategory,
      name: s.name,
      color: s.color,
      colorHex: s.colorHex || '#B45309',
      reasoning: s.reasoning,
      searchQuery: s.searchQuery,
      vibe: s.vibe || 'chic',
    }));

    const occasions: Occasion[] = ['casual', 'brunch', 'date'];

    return {
      id: `gemini-styled-${selectedItem.id}-${idx}-${Date.now()}`,
      title: o.title,
      description: `Hero Piece: ${selectedItem.name} • Styled by Gemini AI`,
      top,
      bottom,
      dress,
      outerwear,
      shoes,
      bag,
      accessory,
      externalSuggestions,
      occasion: occasions[idx % occasions.length],
      compatibilityScore: o.compatibilityScore || 96,
      colorHarmonyType: o.colorHarmonyType || 'Gemini AI Color Harmony',
      stylingNotes: o.stylingNotes || [`Anchored around ${selectedItem.name}`],
      vibe: o.vibe || 'chic',
      createdAt: Date.now(),
    };
  });
}
