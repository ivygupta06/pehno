import { GarmentItem, Outfit, GarmentCategory } from '../types/wardrobe';

export interface DuplicateMatch {
  matchedItem: GarmentItem;
  confidence: number; // 0 - 100
  matchType: 'exact' | 'visual' | 'semantic';
  reason: string;
}

export interface DuplicateCluster {
  id: string;
  category: GarmentCategory;
  primaryItem: GarmentItem;
  duplicates: {
    item: GarmentItem;
    confidence: number;
    reason: string;
  }[];
}

// In-memory hash cache to make repeated checks instantaneous
const hashCache = new Map<string, string>();

/**
 * Computes a 64-bit perceptual difference hash (dHash) using HTML5 Canvas
 * Resizes to 9x8, converts to grayscale, and compares horizontal gradient
 */
export async function computeImageHash(imageSrc: string): Promise<string> {
  if (!imageSrc) return '';
  if (hashCache.has(imageSrc)) {
    return hashCache.get(imageSrc)!;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      try {
        const width = 9;
        const height = 8;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          resolve('');
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height).data;

        // Grayscale values (8 rows of 9 columns)
        const gray: number[][] = [];
        for (let y = 0; y < height; y++) {
          const row: number[] = [];
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            // Standard luminance calculation
            const luma = 0.299 * imgData[idx] + 0.587 * imgData[idx + 1] + 0.114 * imgData[idx + 2];
            row.push(luma);
          }
          gray.push(row);
        }

        // Compare adjacent pixels: 8 rows x 8 comparisons = 64 bits
        let hash = '';
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < 8; x++) {
            hash += gray[y][x] < gray[y][x + 1] ? '1' : '0';
          }
        }

        hashCache.set(imageSrc, hash);
        resolve(hash);
      } catch (err) {
        resolve('');
      }
    };

    img.onerror = () => resolve('');
    img.src = imageSrc;
  });
}

/**
 * Calculate Hamming distance between two 64-bit hash strings
 */
export function hammingDistance(hash1: string, hash2: string): number {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return 64;
  let dist = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) dist++;
  }
  return dist;
}

/**
 * Calculate Euclidean RGB distance between two hex colors
 */
export function hexColorDistance(hex1?: string, hex2?: string): number {
  if (!hex1 || !hex2) return 255;
  const parseHex = (h: string) => {
    const clean = h.replace('#', '');
    if (clean.length === 3) {
      return [
        parseInt(clean[0] + clean[0], 16),
        parseInt(clean[1] + clean[1], 16),
        parseInt(clean[2] + clean[2], 16),
      ];
    }
    return [
      parseInt(clean.slice(0, 2), 16) || 0,
      parseInt(clean.slice(2, 4), 16) || 0,
      parseInt(clean.slice(4, 6), 16) || 0,
    ];
  };

  const [r1, g1, b1] = parseHex(hex1);
  const [r2, g2, b2] = parseHex(hex2);

  return Math.sqrt(
    Math.pow(r1 - r2, 2) +
    Math.pow(g1 - g2, 2) +
    Math.pow(b1 - b2, 2)
  );
}

/**
 * Check if a newly detected or uploaded item is a duplicate of an existing closet item
 */
export async function checkGarmentDuplicate(
  newItem: {
    name: string;
    category: GarmentCategory;
    subcategory?: string;
    colorHex?: string;
    colorName?: string;
    imageUrl?: string;
  },
  wardrobe: GarmentItem[]
): Promise<DuplicateMatch | null> {
  if (!wardrobe || wardrobe.length === 0) return null;

  let newHash = '';
  if (newItem.imageUrl) {
    newHash = await computeImageHash(newItem.imageUrl);
  }

  let bestMatch: DuplicateMatch | null = null;

  for (const existing of wardrobe) {
    // 1. Exact Image URL or Base64 match
    if (newItem.imageUrl && existing.imageUrl && newItem.imageUrl === existing.imageUrl) {
      return {
        matchedItem: existing,
        confidence: 100,
        matchType: 'exact',
        reason: `Exact identical image already in closet as "${existing.name}".`,
      };
    }

    // 2. Perceptual Hash match (same image resized, cropped, or re-saved)
    if (newHash && existing.imageUrl) {
      const existingHash = await computeImageHash(existing.imageUrl);
      if (existingHash) {
        const dist = hammingDistance(newHash, existingHash);
        if (dist <= 6) {
          const confidence = Math.round(((64 - dist) / 64) * 100);
          return {
            matchedItem: existing,
            confidence,
            matchType: 'visual',
            reason: `Visual photo match (${confidence}% visual similarity) to "${existing.name}".`,
          };
        }
      }
    }

    // 3. Semantic Garment Similarity
    // Same category (e.g. tops) + same subcategory + close color match
    if (newItem.category === existing.category) {
      let score = 0;
      const reasons: string[] = [];

      // Subcategory match
      if (newItem.subcategory && existing.subcategory && newItem.subcategory === existing.subcategory) {
        score += 45;
        reasons.push(`same type (${newItem.subcategory})`);
      } else if (
        newItem.name.toLowerCase().includes(existing.subcategory.toLowerCase()) ||
        existing.name.toLowerCase().includes((newItem.subcategory || '').toLowerCase())
      ) {
        score += 30;
      }

      // Color match
      const cDist = hexColorDistance(newItem.colorHex, existing.colorHex);
      if (cDist < 25) {
        score += 35;
        reasons.push(`matching ${existing.colorName} hue`);
      } else if (cDist < 45) {
        score += 20;
      }

      // Name similarity
      const cleanNew = newItem.name.toLowerCase().replace(/[^a-z0-9]/g, ' ');
      const cleanOld = existing.name.toLowerCase().replace(/[^a-z0-9]/g, ' ');
      const wordsNew = cleanNew.split(/\s+/).filter(w => w.length > 2);
      const commonWords = wordsNew.filter(w => cleanOld.includes(w));
      if (commonWords.length >= 2) {
        score += 25;
        reasons.push(`similar title`);
      }

      if (score >= 75) {
        const confidence = Math.min(96, score);
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = {
            matchedItem: existing,
            confidence,
            matchType: 'semantic',
            reason: `Very similar garment: ${reasons.join(', ')} to "${existing.name}".`,
          };
        }
      }
    }
  }

  return bestMatch;
}

/**
 * Scan entire wardrobe to identify all duplicate pairs or clusters
 */
export async function findWardrobeDuplicates(wardrobe: GarmentItem[]): Promise<DuplicateCluster[]> {
  const clusters: DuplicateCluster[] = [];
  const processedIds = new Set<string>();

  // Precompute hashes for all items
  const hashes = new Map<string, string>();
  for (const item of wardrobe) {
    if (item.imageUrl) {
      const h = await computeImageHash(item.imageUrl);
      if (h) hashes.set(item.id, h);
    }
  }

  for (let i = 0; i < wardrobe.length; i++) {
    const itemA = wardrobe[i];
    if (processedIds.has(itemA.id)) continue;

    const duplicates: { item: GarmentItem; confidence: number; reason: string }[] = [];

    for (let j = i + 1; j < wardrobe.length; j++) {
      const itemB = wardrobe[j];
      if (processedIds.has(itemB.id)) continue;

      let isDup = false;
      let conf = 0;
      let reason = '';

      // Check visual hash
      const hashA = hashes.get(itemA.id);
      const hashB = hashes.get(itemB.id);
      if (hashA && hashB) {
        const dist = hammingDistance(hashA, hashB);
        if (dist <= 6) {
          isDup = true;
          conf = Math.round(((64 - dist) / 64) * 100);
          reason = `Identical or near-identical photo (${conf}% visual match)`;
        }
      }

      // Check semantic similarity if not already visual duplicate
      if (!isDup && itemA.category === itemB.category) {
        const cDist = hexColorDistance(itemA.colorHex, itemB.colorHex);
        const sameSubcat = itemA.subcategory === itemB.subcategory;
        if (sameSubcat && cDist < 30) {
          isDup = true;
          conf = 88;
          reason = `Matching ${itemA.category} (${itemA.subcategory}) in ${itemA.colorName}`;
        }
      }

      if (isDup) {
        duplicates.push({ item: itemB, confidence: conf, reason });
        processedIds.add(itemB.id);
      }
    }

    if (duplicates.length > 0) {
      processedIds.add(itemA.id);
      clusters.push({
        id: `cluster-${itemA.id}`,
        category: itemA.category,
        primaryItem: itemA,
        duplicates,
      });
    }
  }

  return clusters;
}

/**
 * Check if an outfit already exists in favorites by matching its core garments
 */
export function checkOutfitDuplicate(
  outfit: Outfit,
  savedFavorites: Outfit[]
): { isDuplicate: boolean; matchedOutfit?: Outfit; reason?: string } {
  if (!savedFavorites || savedFavorites.length === 0) {
    return { isDuplicate: false };
  }

  for (const fav of savedFavorites) {
    // Exact ID match
    if (fav.id === outfit.id) {
      return { isDuplicate: true, matchedOutfit: fav, reason: 'This exact outfit is already saved in your favorites.' };
    }

    // Matching piece composition
    const sameTop = outfit.top && fav.top && outfit.top.id === fav.top.id;
    const sameBottom = outfit.bottom && fav.bottom && outfit.bottom.id === fav.bottom.id;
    const sameDress = outfit.dress && fav.dress && outfit.dress.id === fav.dress.id;

    if (sameDress && (!outfit.shoes || (fav.shoes && outfit.shoes.id === fav.shoes.id))) {
      return {
        isDuplicate: true,
        matchedOutfit: fav,
        reason: `Identical dress fit already saved as "${fav.title}".`,
      };
    }

    if (sameTop && sameBottom) {
      return {
        isDuplicate: true,
        matchedOutfit: fav,
        reason: `Fit with same top and bottoms already saved as "${fav.title}".`,
      };
    }
  }

  return { isDuplicate: false };
}
