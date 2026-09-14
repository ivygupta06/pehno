import { GarmentCategory, GarmentItem, Outfit, Occasion, ExternalSuggestion, StyleAesthetic } from '../types/wardrobe';
import { shouldIncludeOuterwear, isHeelOrDressShoe } from './stylingEngine';
import { formatGarmentName } from './colorTheory';

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

const GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

/**
 * Execute Gemini text generation with multi-model fallback
 */
async function callGeminiText(apiKey: string, prompt: string, maxTokens?: number): Promise<string> {
  let lastError: any = null;
  const cleanKey = apiKey.trim();

  for (const model of GEMINI_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cleanKey)}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': cleanKey,
        },
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

        if (msg.includes('OAuth 2') || msg.includes('authentication') || msg.includes('API key') || msg.includes('INVALID_ARGUMENT')) {
          msg = 'Invalid Google Gemini API key. Please generate a free key from Google AI Studio (https://aistudio.google.com/app/apikey) starting with "AIzaSy".';
        }
        throw new Error(msg);
      }

      const json = await response.json();
      const parts = json.candidates?.[0]?.content?.parts || [];
      const textPart = parts.find((p: any) => p.text && !p.thought) || parts.find((p: any) => p.text);
      const rawText = textPart?.text;
      if (!rawText) {
        lastError = new Error(`Model ${model} returned empty response.`);
        continue;
      }
      return rawText;
    } catch (err: any) {
      lastError = err;
      // If auth credential or API key error, stop loop immediately
      if (err.message && (err.message.includes('API key') || err.message.includes('AIzaSy') || err.message.includes('Invalid'))) {
        throw err;
      }
      // Otherwise try next fallback model
      continue;
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
    // 100 maxOutputTokens allows Gemini enough space to comfortably output valid JSON
    await callGeminiText(apiKey, 'Respond with {"status": "ok"}', 100);
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
1. STRICT SILHOUETTE & OCCASION RULES:
   - DRESS IS A COMPLETE STANDALONE ONE-PIECE OUTFIT: If an outfit uses a DRESS (dressId), you MUST NEVER assign topId or bottomId! A dress covers both upper and lower body. NEVER pair a dress with a top, blouse, net top, t-shirt, shirt, or bottoms! Never assign a dress item ID to topId or bottomId!
   - DATE NIGHT / PARTY OCCASION: If the occasion is "date" or "party" and the client has DRESSES in their wardrobe, you MUST prioritize featuring dresses (dressId) for the looks (e.g. Look #1 and Look #2) instead of only repeating casual tops! Dresses are the premier choice for romantic evenings and dates.
   - TOPS & BOTTOMS: Pair topId with bottomId from inventory. If the client has NO bottoms or jeans in their closet, LEAVE bottomId NULL. DO NOT randomly match with another top or dress! Instead, add a recommended pair of jeans/bottoms to 'externalSuggestions'.
   - BOTTOMS: If styling bottoms and client has NO tops, LEAVE topId NULL and recommend a top in 'externalSuggestions'.
2. STRICT NO-OUTERWEAR RULE FOR NORMAL TOPS:
   - For normal tops (t-shirts, shirts, blouses, knit sweaters, layered tops, net tops, button-downs, crop tops), DO NOT suggest outerwear (jackets, blazers, cardigans, coats) either from inventory (outerwearId MUST BE NULL) or in externalSuggestions!
   - Normal tops are complete on their own with bottoms. Never clobber them with outerwear layers.
3. DRESSES WITH SHOES & BAGS (MANDATORY RECOMMENDATIONS):
   - With any DRESS, always coordinate FOOTWEAR and BAGS:
     * FOOTWEAR: Check if client's wardrobe contains matching heels or dress shoes. If not, leave shoesId null and ALWAYS suggest matching heels in 'externalSuggestions' (e.g., 'Black Strappy Kitten Heels', 'Nude Block Heel Mules', 'Gold Minimalist Heels'). NEVER force casual sneakers on an elegant dress!
     * BAGS: Check if client's wardrobe contains a matching bag. If not, leave bagId null and ALWAYS suggest a matching bag in 'externalSuggestions' (e.g., 'Black Leather Tote Bag' for office, 'Black Satin Baguette Bag' for date/party, 'Cream Butter Leather Bag' for brunch/casual)!
4. COLOR HARMONY:
   - Use high-contrast neutral foundations (e.g. crisp white top + vintage blue denim, cream + slate grey).
   - Use soft pastel harmonies (e.g. matcha sage green + buttercream yellow + cream; baby blue + oat linen; blush + heather grey).
   - Use tonal quiet-luxury monochromes (e.g. shades of oat, beige, and camel).
5. SILHOUETTE BALANCE:
   - Contrast volume: pair fitted tops with relaxed/wide-leg bottoms, or oversized drape with tailored bottoms.
6. "WHY THIS OUTFIT WORKS" NOTES (MAX 3 CONCISE POINTS):
   - Keep 'stylingNotes' to MAXIMUM 3 small, concise, easy, convincing bullet points (e.g. 1 on silhouette balance, 1 on color harmony, 1 on occasion vibe). Do NOT write long paragraphs or more than 3 points!
7. INVENTORY USAGE:
   - Select item IDs that physically exist in the wardrobe inventory.
8. SIMPLE NAMES (MAX 3 WORDS):
   - Outfit titles must be simple and clean (e.g., 'Pastel Brunch Look', 'Black Evening Fit', 'Blue Denim Casual', max 3-4 words).
   - All externalSuggestions names must strictly be MAXIMUM 3 WORDS and begin with the simple color name (e.g. 'Black Strappy Heels', 'Nude Block Mules', 'Gold Chain Necklace', 'Tortoiseshell Sunglasses').
9. EXTERNAL SUGGESTIONS:
   - Whenever an outfit needs missing pieces (e.g. no jeans in closet for a top, or no heels/shoes/bag for a dress), provide them in 'externalSuggestions' with search queries and fashion reasoning. Keep these rich and complete.

Return a JSON object strictly adhering to this schema:
{
  "outfits": [
    {
      "title": "Simple clean outfit title (e.g. Pastel Linen Fit, max 3-4 words)",
      "vibe": "casual" | "chic" | "streetwear" | "minimalist" | "preppy" | "romantic" | "formal",
      "colorHarmonyType": "e.g. Crisp High-Contrast, Soft Pastel Harmony, Tonal Neutral",
      "compatibilityScore": 95,
      "topId": "item-id (null if wearing dress or no top)",
      "bottomId": "item-id (null if wearing dress or no bottoms in closet)",
      "dressId": "item-id (optional)",
      "outerwearId": "item-id (null for normal tops)",
      "shoesId": "item-id (null if dress lacks matching heels)",
      "bagId": "item-id (optional)",
      "accessoryId": "item-id (optional)",
      "stylingNotes": [
        "Small convincing point on silhouette balance",
        "Small convincing point on color harmony",
        "Small convincing point on why it works for the occasion"
      ],
      "externalSuggestions": [
        {
          "category": "accessories" | "bags" | "shoes" | "bottoms" | "tops",
          "name": "MAX 3 WORDS: 1st word color (e.g. Black Strappy Heels, Tortoiseshell Sunglasses)",
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
    let dress = o.dressId ? wardrobeMap.get(o.dressId) : undefined;
    const rawOuterwear = o.outerwearId ? wardrobeMap.get(o.outerwearId) : undefined;
    let shoes = o.shoesId ? wardrobeMap.get(o.shoesId) : undefined;
    let bag = o.bagId ? wardrobeMap.get(o.bagId) : undefined;
    const accessory = o.accessoryId ? wardrobeMap.get(o.accessoryId) : undefined;

    // Detect if Gemini mistakenly assigned a dress to topId or bottomId
    if (top && top.category === 'dresses') {
      dress = top;
      top = undefined;
    }
    if (bottom && bottom.category === 'dresses') {
      dress = bottom;
      bottom = undefined;
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

    // CRITICAL RULE: If a dress is chosen, it is a complete 1-piece. NEVER pair with a top or bottom!
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
            name: 'Blue Straight Jeans',
            color: 'Classic Vintage Blue',
            colorHex: '#3B82F6',
            reasoning: `No bottoms in closet. Complete this ${top.name} with classic straight-leg denim.`,
            searchQuery: `vintage high waist straight leg blue jeans ${top.name}`,
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
            name: 'White Poplin Shirt',
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

    if (dress) {
      // If dress is styled, prioritize dressy heels/mules if present in closet, but KEEP sneakers/flats if that is what closet has!
      const dressHeels = wardrobe.filter(i => i.category === 'shoes' && isHeelOrDressShoe(i));
      if (dressHeels.length > 0) {
        shoes = dressHeels[idx % dressHeels.length];
      }
    }

    // Outerwear intelligence: Do NOT force outerwear over normal tops or tops that don't need it
    let outerwear = shouldIncludeOuterwear(top, dress, rawOuterwear, occasion, idx) ? rawOuterwear : undefined;
    if (top) {
      outerwear = undefined; // STRICT: normal tops never have outerwear
    }

    // CRITICAL: Filter out external suggestions for categories ALREADY present in the closet outfit!
    let filteredExternal = externalSuggestions.filter(s => {
      if (s.category === 'shoes' && shoes) return false;
      if (s.category === 'bags' && bag) return false;
      if (s.category === 'tops' && top) return false;
      if (s.category === 'bottoms' && bottom) return false;
      if (s.category === 'outerwear' && (outerwear || top)) return false;
      return true;
    });

    // Guarantee EXACTLY 2 high-fashion accessory recommendations for categories missing in the outfit
    const accessoryPool: ExternalSuggestion[] = [
      {
        id: `gemini-ext-glasses-${Date.now()}-${idx}`,
        category: 'accessories',
        name: 'Tortoiseshell Oval Sunglasses',
        color: 'Warm Terracotta',
        colorHex: '#B45309',
        reasoning: 'Adds a chic, sun-drenched accent to frame the face and elevate daytime proportions.',
        searchQuery: 'tortoiseshell oval sunglasses women',
        vibe: o.vibe || 'chic',
      },
      {
        id: `gemini-ext-hoops-${Date.now()}-${idx}`,
        category: 'accessories',
        name: 'Gold Chunky Hoop Earrings',
        color: 'Polished Gold',
        colorHex: '#D4AF37',
        reasoning: 'Warm metallic shimmer brings instant intentional polish to the neckline.',
        searchQuery: 'gold chunky hoop earrings 18k',
        vibe: o.vibe || 'chic',
      },
    ];

    for (const accItem of accessoryPool) {
      if (filteredExternal.length >= 2) break;
      if (!filteredExternal.some((s) => s.name === accItem.name || s.category === accItem.category)) {
        filteredExternal.push(accItem);
      }
    }

    // Format all external suggestions to be strictly max 3 words
    const formattedExternal: ExternalSuggestion[] = filteredExternal.slice(0, 2).map(s => ({
      ...s,
      name: formatGarmentName(s.name, s.color, s.category),
    }));

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
      externalSuggestions: formattedExternal,
      occasion,
      compatibilityScore: o.compatibilityScore || 95,
      colorHarmonyType: o.colorHarmonyType || 'Gemini AI Harmony',
      stylingNotes: (o.stylingNotes && o.stylingNotes.length > 0
        ? o.stylingNotes
        : ['Styled based on color harmony and silhouette balance.']).slice(0, 3),
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
1. DRESS IS A COMPLETE STANDALONE ONE-PIECE & HEELS REQUIREMENT:
   - If hero item is a DRESS (category: dresses), you MUST NEVER select topId or bottomId! A dress covers both upper and lower body.
   - NEVER pair a dress with a top, blouse, or sweater! Only pair with shoesId, bagId, accessoryId, and optional outerwearId.
   - If the client has no matching heels or dressy shoes in closet, leave shoesId null and ALWAYS suggest matching heels in 'externalSuggestions' (e.g. 'Black Strappy Kitten Heels', 'Nude Block Heel Mules', 'Gold Minimalist Heels') with shopping query and styling reasoning!
2. STRICT NO-OUTERWEAR RULE FOR NORMAL TOPS:
   - For normal tops (t-shirts, shirts, blouses, knit tops, layered tops, net tops, crop tops), DO NOT suggest outerwear (jackets, blazers, cardigans, coats) either from closet or as externalSuggestions!
   - Normal tops are complete on their own with bottoms.
3. MISSING STAPLES (NO JEANS / NO TOPS):
   - If hero item is a TOP and the client has NO matching bottoms or jeans in their inventory:
     LEAVE bottomId NULL! DO NOT randomly pair with another top or dress!
     Instead, suggest complementary jeans/trousers in 'externalSuggestions' with search query and styling reasoning!
   - If hero item is BOTTOMS and the client has NO matching tops in inventory:
     LEAVE topId NULL! DO NOT randomly pair with another bottom or dress!
     Instead, suggest a complementary top/shirt in 'externalSuggestions'!
4. "WHY THIS OUTFIT WORKS" NOTES (MAX 3 SMALL CONVINCING POINTS):
   - Keep 'stylingNotes' to MAXIMUM 3 small, concise, easy, convincing bullet points. Do NOT write long verbose paragraphs or more than 3 points!
5. SIMPLE NAMES (MAX 3 WORDS):
   - Look titles must be simple and clean (e.g., 'Casual Denim Look', 'Patio Chic Fit', 'Evening Drinks Look', max 3-4 words).
   - All externalSuggestions names must strictly be MAXIMUM 3 WORDS and begin with the simple color name (e.g. 'Black Strappy Heels', 'Nude Block Mules', 'Gold Chain Necklace').
6. 3 DISTINCT LOOKS:
   Look 1: Casual Day-to-Day / Campus
   Look 2: Elevated Weekend Patio Brunch / Day Out
   Look 3: Golden Hour Date / Evening Drinks

Return JSON strictly adhering to schema:
{
  "outfits": [
    {
      "title": "Simple Look Title (max 3-4 words)",
      "vibe": "casual" | "chic" | "romantic",
      "colorHarmonyType": "Harmony description (e.g. Crisp White & Vintage Denim Contrast)",
      "compatibilityScore": 96,
      "topId": "item-id (null if hero is dress or no tops in closet)",
      "bottomId": "item-id (null if hero is dress or no bottoms in closet)",
      "dressId": "item-id (optional)",
      "outerwearId": "item-id (null for normal tops)",
      "shoesId": "item-id (null if dress lacks matching heels)",
      "bagId": "item-id (optional)",
      "accessoryId": "item-id (optional)",
      "stylingNotes": [
        "Small convincing point on silhouette balance",
        "Small convincing point on color harmony",
        "Small convincing point on why it works"
      ],
      "externalSuggestions": [
        {
          "category": "accessories" | "bags" | "shoes" | "bottoms" | "tops",
          "name": "MAX 3 WORDS: 1st word color (e.g. Black Strappy Heels, Nude Block Mules)",
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
    let dress = selectedItem.category === 'dresses' ? selectedItem : (o.dressId ? wardrobeMap.get(o.dressId) : undefined);
    const rawOuterwear = o.outerwearId ? wardrobeMap.get(o.outerwearId) : undefined;
    let shoes = o.shoesId ? wardrobeMap.get(o.shoesId) : undefined;
    let bag = o.bagId ? wardrobeMap.get(o.bagId) : undefined;
    const accessory = o.accessoryId ? wardrobeMap.get(o.accessoryId) : undefined;

    // Detect if Gemini mistakenly assigned a dress to topId or bottomId
    if (top && top.category === 'dresses') {
      dress = top;
      top = undefined;
    }
    if (bottom && bottom.category === 'dresses') {
      dress = bottom;
      bottom = undefined;
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

    // CRITICAL: A dress is a complete one-piece outfit. NEVER allow top or bottom when dress is present!
    if (dress) {
      top = undefined;
      bottom = undefined;
    }

    // When hero item is TOP:
    if (selectedItem.category === 'tops') {
      top = selectedItem;
      const bottomsInWardrobe = wardrobe.filter(i => i.category === 'bottoms');
      if (bottomsInWardrobe.length > 0) {
        const jeans = bottomsInWardrobe.find(b => b.subcategory === 'jeans' || b.name.toLowerCase().includes('jean'));
        bottom = bottom || jeans || bottomsInWardrobe[idx % bottomsInWardrobe.length];
      } else {
        // No bottoms in closet! DO NOT randomly match with anything!
        bottom = undefined;
        // Inject Jeans/Bottoms suggestion with Inspo/Shop links:
        const hasBottomSugg = externalSuggestions.some(s => s.category === 'bottoms');
        if (!hasBottomSugg) {
          const defaultJeans = [
            { name: 'Blue Straight Jeans', color: 'Classic Indigo', hex: '#2563EB', query: 'vintage high waist straight leg blue jeans' },
            { name: 'Blue Wide Jeans', color: 'Light Sky Blue', hex: '#60A5FA', query: 'relaxed wide leg washed denim jeans' },
            { name: 'Cream Ankle Trousers', color: 'Oat Cream', hex: '#F3EFEA', query: 'tailored ecru cream high waist trousers' },
          ];
          const j = defaultJeans[idx % defaultJeans.length];
          externalSuggestions.unshift({
            id: `gemini-ext-jeans-${Date.now()}-${idx}`,
            category: 'bottoms',
            name: j.name,
            color: j.color,
            colorHex: j.hex,
            reasoning: `No bottoms in closet: Style this ${selectedItem.name} with ${j.color.toLowerCase()} denim to anchor the silhouette.`,
            searchQuery: j.query,
            vibe: o.vibe || 'casual',
          });
        }
      }
    }

    // When hero item is BOTTOM:
    if (selectedItem.category === 'bottoms') {
      bottom = selectedItem;
      const topsInWardrobe = wardrobe.filter(i => i.category === 'tops');
      if (topsInWardrobe.length > 0) {
        top = top || topsInWardrobe[idx % topsInWardrobe.length];
      } else {
        // No tops in closet! DO NOT randomly match!
        top = undefined;
        const hasTopSugg = externalSuggestions.some(s => s.category === 'tops');
        if (!hasTopSugg) {
          const defaultTops = [
            { name: 'White Poplin Shirt', color: 'Crisp White', hex: '#FFFFFF', query: 'white cotton poplin button down shirt' },
            { name: 'Grey Ribbed Tee', color: 'Heather Grey', hex: '#D1D5DB', query: 'fitted ribbed cotton baby tee' },
            { name: 'Cream Knit Sweater', color: 'Buttercream Cream', hex: '#FEF9C3', query: 'oversized knit crewneck sweater' },
          ];
          const t = defaultTops[idx % defaultTops.length];
          externalSuggestions.unshift({
            id: `gemini-ext-top-${Date.now()}-${idx}`,
            category: 'tops',
            name: t.name,
            color: t.color,
            colorHex: t.hex,
            reasoning: `No tops in closet: Pair your ${selectedItem.name} with this ${t.name.toLowerCase()} for timeless contrast.`,
            searchQuery: t.query,
            vibe: o.vibe || 'chic',
          });
        }
      }
    }

    // Footwear fallback
    if (!shoes) {
      const shoesInWardrobe = wardrobe.filter(i => i.category === 'shoes');
      if (shoesInWardrobe.length > 0) shoes = shoesInWardrobe[idx % shoesInWardrobe.length];
    }

    // Bag fallback
    if (!bag) {
      const bagsInWardrobe = wardrobe.filter(i => i.category === 'bags');
      if (bagsInWardrobe.length > 0) bag = bagsInWardrobe[idx % bagsInWardrobe.length];
    }

    const occasions: Occasion[] = ['casual', 'brunch', 'date'];
    const occasionForLook = occasions[idx % occasions.length];

    // If styling a dress: check if shoes and bags are coordinated
    if (dress) {
      if (shoes && !isHeelOrDressShoe(shoes)) {
        shoes = undefined; // Do NOT force casual sneakers on an elegant dress!
      }
      const hasHeelSugg = externalSuggestions.some(s => s.category === 'shoes');
      if (!shoes && !hasHeelSugg) {
        const dressLower = `${dress.name} ${dress.colorName}`.toLowerCase();
        let heelColor = 'Black';
        let heelHex = '#18181B';
        let heelName = 'Black Strappy Heels';

        if (dressLower.includes('white') || dressLower.includes('cream') || dressLower.includes('yellow') || dress.colorTone === 'pastel') {
          heelColor = 'Nude';
          heelHex = '#E7D7C9';
          heelName = 'Nude Block Mules';
        } else if (dressLower.includes('red') || dressLower.includes('pink') || dressLower.includes('rose') || dressLower.includes('wine')) {
          heelColor = 'Nude';
          heelHex = '#E7D7C9';
          heelName = 'Nude Strappy Heels';
        } else if (dress.colorTone === 'earthy' || dressLower.includes('brown')) {
          heelColor = 'Gold';
          heelHex = '#D4AF37';
          heelName = 'Gold Strappy Heels';
        }

        externalSuggestions.unshift({
          id: `gemini-ext-heels-${Date.now()}-${idx}`,
          category: 'shoes',
          name: heelName,
          color: heelColor,
          colorHex: heelHex,
          reasoning: `No matching heels in closet: Complete your ${dress.name} with ${heelColor.toLowerCase()} strappy heels for an elegant silhouette.`,
          searchQuery: `${heelName.toLowerCase()} shopping`,
          vibe: o.vibe || 'chic',
        });
      }

      // With a dress, also ALWAYS recommend a matching bag if none in closet!
      const hasBagSugg = externalSuggestions.some(s => s.category === 'bags');
      if (!bag && !hasBagSugg) {
        let bagName = 'Cream Butter Leather Bag';
        let bagColor = 'Oat Cream';
        let bagHex = '#F4EFEA';
        let bagQuery = 'cream butter leather shoulder bag';
        let bagReason = `No bags in closet: Complete your ${dress.name} with a chic neutral shoulder bag.`;

        if (occasionForLook === 'date') {
          bagName = 'Black Satin Baguette Bag';
          bagColor = 'Black';
          bagHex = '#18181B';
          bagQuery = 'minimalist black evening baguette shoulder bag';
          bagReason = `No bags in closet: A sleek evening shoulder bag completes your ${dress.name} for dinner and drinks.`;
        } else if (occasionForLook === 'brunch') {
          bagName = 'Woven Raffia Shoulder Bag';
          bagColor = 'Natural Oat';
          bagHex = '#E7D7C9';
          bagQuery = 'woven raffia crescent shoulder bag';
          bagReason = `No bags in closet: Tactile woven texture softens your ${dress.name} for the weekend.`;
        }

        externalSuggestions.push({
          id: `gemini-ext-bag-${Date.now()}-${idx}`,
          category: 'bags',
          name: bagName,
          color: bagColor,
          colorHex: bagHex,
          reasoning: bagReason,
          searchQuery: bagQuery,
          vibe: o.vibe || 'chic',
        });
      }
    }
    let outerwear = shouldIncludeOuterwear(top, dress, rawOuterwear, occasionForLook, idx) ? rawOuterwear : undefined;
    let filteredExternal = externalSuggestions;
    if (top) {
      outerwear = undefined; // STRICT: normal tops never have outerwear
      filteredExternal = externalSuggestions.filter(s => s.category !== 'outerwear');
    }

    // Format all external suggestions to strictly max 3 words
    const formattedExternal: ExternalSuggestion[] = filteredExternal.map(s => ({
      ...s,
      name: formatGarmentName(s.name, s.color, s.category),
    }));

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
      externalSuggestions: formattedExternal,
      occasion: occasionForLook,
      compatibilityScore: o.compatibilityScore || 96,
      colorHarmonyType: o.colorHarmonyType || 'Gemini AI Color Harmony',
      stylingNotes: (o.stylingNotes && o.stylingNotes.length > 0 ? o.stylingNotes : [`Anchored around ${selectedItem.name}`]).slice(0, 3),
      vibe: o.vibe || 'chic',
      createdAt: Date.now(),
    };
  });
}
