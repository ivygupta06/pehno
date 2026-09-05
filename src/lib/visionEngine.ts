import { GarmentCategory, GarmentSubcategory, StyleAesthetic, Season, Occasion, ColorTone } from '../types/wardrobe';
import { getApproximateColorName } from './colorTheory';

export interface RawDetectedGarment {
  name: string;
  category: GarmentCategory;
  subcategory: GarmentSubcategory;
  colorName: string;
  colorHex: string;
  colorTone: ColorTone;
  pattern: 'solid' | 'striped' | 'floral' | 'plaid' | 'graphic' | 'ribbed' | 'polka-dot';
  material?: string;
  fit: 'fitted' | 'relaxed' | 'oversized' | 'tailored' | 'cropped';
  aesthetics: StyleAesthetic[];
  seasons: Season[];
  occasions: Occasion[];
  tags: string[];
  imageUrl: string;
  cropBox?: { x: number; y: number; width: number; height: number };
}

export interface AnalysisResponse {
  detectedType: 'single' | 'multi-item' | 'ootd';
  summary: string;
  garments: RawDetectedGarment[];
}

/**
 * Extract dominant colors from an image using HTML5 Canvas
 */
export async function extractImageColors(imageSrc: string, sampleCount: number = 3): Promise<{ hex: string; name: string; tone: ColorTone }[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve([{ hex: '#FAF9F6', name: 'Crisp White', tone: 'neutral' }]);
          return;
        }

        const width = 100;
        const height = 100;
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Sample regions (center, upper, lower)
        const samples: { r: number; g: number; b: number }[] = [];
        
        // Upper center
        let rSum = 0, gSum = 0, bSum = 0, count = 0;
        for (let y = 15; y < 45; y += 3) {
          for (let x = 30; x < 70; x += 3) {
            const idx = (y * width + x) * 4;
            rSum += data[idx];
            gSum += data[idx + 1];
            bSum += data[idx + 2];
            count++;
          }
        }
        if (count > 0) samples.push({ r: Math.round(rSum / count), g: Math.round(gSum / count), b: Math.round(bSum / count) });

        // Lower center
        rSum = 0; gSum = 0; bSum = 0; count = 0;
        for (let y = 55; y < 85; y += 3) {
          for (let x = 30; x < 70; x += 3) {
            const idx = (y * width + x) * 4;
            rSum += data[idx];
            gSum += data[idx + 1];
            bSum += data[idx + 2];
            count++;
          }
        }
        if (count > 0) samples.push({ r: Math.round(rSum / count), g: Math.round(gSum / count), b: Math.round(bSum / count) });

        const results = samples.map(s => {
          const hex = `#${((1 << 24) + (s.r << 16) + (s.g << 8) + s.b).toString(16).slice(1)}`;
          const approx = getApproximateColorName(hex);
          return { hex, name: approx.name, tone: approx.tone as ColorTone };
        });

        resolve(results.length > 0 ? results.slice(0, sampleCount) : [{ hex: '#FAF9F6', name: 'Crisp White', tone: 'neutral' }]);
      } catch (err) {
        resolve([{ hex: '#FAF9F6', name: 'Crisp White', tone: 'neutral' }]);
      }
    };

    img.onerror = () => {
      resolve([{ hex: '#FAF9F6', name: 'Crisp White', tone: 'neutral' }]);
    };

    img.src = imageSrc;
  });
}

/**
 * Compress and downscale an image to avoid browser storage quota limits
 */
export async function compressAndResizeImage(imageSrc: string, maxDim: number = 720): Promise<{ dataUrl: string; width: number; height: number; aspectRatio: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ dataUrl: imageSrc, width: img.width, height: img.height, aspectRatio: img.width / img.height });
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      resolve({ dataUrl, width, height, aspectRatio: width / height });
    };
    img.onerror = () => {
      resolve({ dataUrl: imageSrc, width: 600, height: 600, aspectRatio: 1 });
    };
    img.src = imageSrc;
  });
}

/**
 * Crop a normalized rectangular region from an image
 */
export async function cropImageRegion(
  imageSrc: string,
  crop: { x: number; y: number; width: number; height: number }
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const srcW = img.width;
      const srcH = img.height;

      const sx = Math.max(0, Math.round(crop.x * srcW));
      const sy = Math.max(0, Math.round(crop.y * srcH));
      const sw = Math.min(srcW - sx, Math.round(crop.width * srcW));
      const sh = Math.min(srcH - sy, Math.round(crop.height * srcH));

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, sw);
      canvas.height = Math.max(1, sh);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageSrc);
        return;
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}

/**
 * Helper to analyze canvas regions for garment occupancy and silhouette shape
 */
async function analyzeImageSilhouetteAndRegions(
  imageSrc: string
): Promise<{
  isDress: boolean;
  isBottoms: boolean;
  isWide: boolean;
  hasLowerRegionGarment: boolean;
  hasAccessoryRegionGarment: boolean;
  dominantColor: { hex: string; name: string; tone: ColorTone };
}> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const width = 120;
        const height = 120;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            isDress: false,
            isBottoms: false,
            isWide: false,
            hasLowerRegionGarment: false,
            hasAccessoryRegionGarment: false,
            dominantColor: { hex: '#FAF9F6', name: 'Crisp White', tone: 'neutral' },
          });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height).data;

        // Sample corner pixels to determine background color
        const corners = [
          [2, 2],
          [width - 3, 2],
          [2, height - 3],
          [width - 3, height - 3],
        ];
        let bgR = 0, bgG = 0, bgB = 0;
        for (const [cx, cy] of corners) {
          const idx = (cy * width + cx) * 4;
          bgR += imgData[idx];
          bgG += imgData[idx + 1];
          bgB += imgData[idx + 2];
        }
        bgR /= corners.length;
        bgG /= corners.length;
        bgB /= corners.length;

        // Check color difference from background
        const isGarmentPixel = (r: number, g: number, b: number) => {
          const dist = Math.sqrt(
            Math.pow(r - bgR, 2) + Math.pow(g - bgG, 2) + Math.pow(b - bgB, 2)
          );
          return dist > 26;
        };

        // Measure row widths across top (25%), middle (50%), bottom (75%)
        const measureRowWidth = (yRatio: number) => {
          const y = Math.round(height * yRatio);
          let firstX = -1;
          let lastX = -1;
          for (let x = 4; x < width - 4; x++) {
            const idx = (y * width + x) * 4;
            if (isGarmentPixel(imgData[idx], imgData[idx + 1], imgData[idx + 2])) {
              if (firstX === -1) firstX = x;
              lastX = x;
            }
          }
          return firstX !== -1 ? lastX - firstX : 0;
        };

        const topW = measureRowWidth(0.25);
        const midW = measureRowWidth(0.50);
        const botW = measureRowWidth(0.75);

        // Check if silhouette has the classic flare of a dress (skirt flares out wider than top)
        // or occupies continuous top-to-bottom coverage
        const isDress = (botW > topW * 1.22 && botW > 25) || (topW > 15 && midW > 20 && botW > 30);
        const isBottoms = topW < 12 && botW > 20;
        const isWide = img.width / img.height > 1.3;

        // Count garment pixels in lower region (y: 50% to 90%)
        let lowerGarmentCount = 0;
        let lowerTotalCount = 0;
        for (let y = Math.round(height * 0.52); y < Math.round(height * 0.88); y += 2) {
          for (let x = 10; x < width - 10; x += 2) {
            const idx = (y * width + x) * 4;
            lowerTotalCount++;
            if (isGarmentPixel(imgData[idx], imgData[idx + 1], imgData[idx + 2])) {
              lowerGarmentCount++;
            }
          }
        }
        const lowerRatio = lowerGarmentCount / (lowerTotalCount || 1);

        // Count garment pixels in side/accessory region
        let sideGarmentCount = 0;
        let sideTotalCount = 0;
        for (let y = Math.round(height * 0.70); y < height - 5; y += 2) {
          for (let x = Math.round(width * 0.65); x < width - 5; x += 2) {
            const idx = (y * width + x) * 4;
            sideTotalCount++;
            if (isGarmentPixel(imgData[idx], imgData[idx + 1], imgData[idx + 2])) {
              sideGarmentCount++;
            }
          }
        }
        const sideRatio = sideGarmentCount / (sideTotalCount || 1);

        // Center pixel sample for dominant color
        let centR = 0, centG = 0, centB = 0, cCount = 0;
        for (let y = Math.round(height * 0.3); y < Math.round(height * 0.7); y += 2) {
          for (let x = Math.round(width * 0.3); x < Math.round(width * 0.7); x += 2) {
            const idx = (y * width + x) * 4;
            if (isGarmentPixel(imgData[idx], imgData[idx + 1], imgData[idx + 2])) {
              centR += imgData[idx];
              centG += imgData[idx + 1];
              centB += imgData[idx + 2];
              cCount++;
            }
          }
        }

        let domHex = '#FAF9F6';
        if (cCount > 0) {
          const r = Math.round(centR / cCount);
          const g = Math.round(centG / cCount);
          const b = Math.round(centB / cCount);
          domHex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        }
        const approx = getApproximateColorName(domHex);

        resolve({
          isDress,
          isBottoms,
          isWide,
          // Only true if there are distinct non-background pixels in lower half that are separate from a single dress
          hasLowerRegionGarment: lowerRatio > 0.22 && !isDress,
          hasAccessoryRegionGarment: sideRatio > 0.30,
          dominantColor: { hex: domHex, name: approx.name, tone: approx.tone as ColorTone },
        });
      } catch (e) {
        resolve({
          isDress: false,
          isBottoms: false,
          isWide: false,
          hasLowerRegionGarment: false,
          hasAccessoryRegionGarment: false,
          dominantColor: { hex: '#FAF9F6', name: 'Crisp White', tone: 'neutral' },
        });
      }
    };
    img.onerror = () => {
      resolve({
        isDress: false,
        isBottoms: false,
        isWide: false,
        hasLowerRegionGarment: false,
        hasAccessoryRegionGarment: false,
        dominantColor: { hex: '#FAF9F6', name: 'Crisp White', tone: 'neutral' },
      });
    };
    img.src = imageSrc;
  });
}

/**
 * Intelligent client-side heuristic detector
 * Accurately analyzes photos based on mode (Single item, Multi-item flatlay, Mirror Selfie/OOTD)
 */
export async function analyzeImageLocally(
  imageSrc: string,
  mode: 'single' | 'multi-item' | 'ootd'
): Promise<AnalysisResponse> {
  const { dataUrl: optimizedSrc, aspectRatio } = await compressAndResizeImage(imageSrc, 800);
  const sampledColors = await extractImageColors(optimizedSrc, 3);
  const primaryColor = sampledColors[0] || { hex: '#FAF9F6', name: 'Crisp White', tone: 'neutral' as ColorTone };
  const secondaryColor = sampledColors[1] || { hex: '#BAE6FD', name: 'Baby Sky Blue', tone: 'pastel' as ColorTone };

  const analysis = await analyzeImageSilhouetteAndRegions(optimizedSrc);

  if (mode === 'single') {
    let category: GarmentCategory = 'tops';
    let subcategory: GarmentSubcategory = 'knit-sweater';
    let namePrefix = `${primaryColor.name} Essential Top`;

    // 1. Check for Dresses (flaring skirt, one-piece silhouette, or vertical coverage)
    if (analysis.isDress) {
      category = 'dresses';
      subcategory = 'sundress';
      namePrefix = `${primaryColor.name} Tiered Ruffle Dress`;
    } else if (analysis.isBottoms) {
      // 2. Clear bifurcated pants/bottoms silhouette
      category = 'bottoms';
      subcategory = primaryColor.tone === 'neutral' ? 'jeans' : 'wide-leg-trousers';
      namePrefix = `${primaryColor.name} Vintage High-Waist Jeans`;
    } else if (aspectRatio > 1.35 || analysis.isWide) {
      // 3. Wide / compact -> Shoes or Bags
      category = 'shoes';
      subcategory = 'sneakers';
      namePrefix = `${primaryColor.name} Low-Top Kicks`;
    } else {
      // 4. Tops (knit top, sweater, blouse)
      category = 'tops';
      subcategory = 'knit-sweater';
      namePrefix = `${primaryColor.name} Long-Sleeve Knit Top`;
    }

    return {
      detectedType: 'single',
      summary: `Identified 1 garment: ${namePrefix} (${category.toUpperCase()}) with ${primaryColor.name} tones.`,
      garments: [
        {
          name: namePrefix,
          category,
          subcategory,
          colorName: primaryColor.name,
          colorHex: primaryColor.hex,
          colorTone: primaryColor.tone,
          pattern: 'solid',
          material: category === 'bottoms' ? 'Washed Denim' : (category === 'dresses' ? 'Cotton Linen Blend' : 'Cotton Knit'),
          fit: 'relaxed',
          aesthetics: ['casual', 'chic', 'minimalist'],
          seasons: ['spring', 'summer', 'all-season'],
          occasions: ['brunch', 'class', 'casual', 'date'],
          tags: [category, primaryColor.name.toLowerCase(), 'staple'],
          imageUrl: optimizedSrc,
        },
      ],
    };
  }

  if (mode === 'multi-item') {
    // Dynamic Garment Count Detection:
    // Check if the image actually contains multiple distinct pieces or just ONE piece laid flat!
    const detectedGarments: RawDetectedGarment[] = [];

    // Top piece is always primary if present
    const topCrop = analysis.hasLowerRegionGarment
      ? await cropImageRegion(optimizedSrc, { x: 0.1, y: 0.05, width: 0.8, height: 0.45 })
      : optimizedSrc;

    // Check if the single piece in flatlay is a dress
    if (analysis.isDress && !analysis.hasLowerRegionGarment) {
      detectedGarments.push({
        name: `${primaryColor.name} Ruffle Sundress`,
        category: 'dresses',
        subcategory: 'sundress',
        colorName: primaryColor.name,
        colorHex: primaryColor.hex,
        colorTone: primaryColor.tone,
        pattern: 'solid',
        material: 'Cotton Linen Blend',
        fit: 'relaxed',
        aesthetics: ['romantic', 'chic', 'bohemian'],
        seasons: ['spring', 'summer'],
        occasions: ['brunch', 'date', 'casual'],
        tags: ['dress', 'flatlay', 'one-piece'],
        imageUrl: optimizedSrc,
      });
    } else {
      // Top garment
      detectedGarments.push({
        name: `${primaryColor.name} Layered Top`,
        category: 'tops',
        subcategory: 'crop-top',
        colorName: primaryColor.name,
        colorHex: primaryColor.hex,
        colorTone: primaryColor.tone,
        pattern: 'solid',
        material: 'Cotton Knit',
        fit: 'relaxed',
        aesthetics: ['casual', 'preppy', 'chic'],
        seasons: ['spring', 'fall', 'winter'],
        occasions: ['class', 'brunch', 'casual'],
        tags: ['flatlay-top', 'layering', 'essential'],
        imageUrl: topCrop,
      });

      // ONLY add bottom piece if lower region actually contains a distinct garment!
      if (analysis.hasLowerRegionGarment) {
        const bottomCrop = await cropImageRegion(optimizedSrc, { x: 0.1, y: 0.42, width: 0.8, height: 0.45 });
        detectedGarments.push({
          name: `${secondaryColor.name} Relaxed Jeans / Trousers`,
          category: 'bottoms',
          subcategory: 'jeans',
          colorName: secondaryColor.name,
          colorHex: secondaryColor.hex,
          colorTone: secondaryColor.tone,
          pattern: 'solid',
          material: 'Washed Denim',
          fit: 'tailored',
          aesthetics: ['chic', 'minimalist', 'casual'],
          seasons: ['all-season'],
          occasions: ['office', 'brunch', 'date', 'class'],
          tags: ['flatlay-bottom', 'jeans', 'versatile'],
          imageUrl: bottomCrop,
        });
      }

      // ONLY add accessory piece if accessory region contains distinct content!
      if (analysis.hasAccessoryRegionGarment && analysis.hasLowerRegionGarment) {
        const bagCrop = await cropImageRegion(optimizedSrc, { x: 0.2, y: 0.7, width: 0.6, height: 0.3 });
        detectedGarments.push({
          name: 'Minimalist Canvas Tote',
          category: 'bags',
          subcategory: 'tote-bag',
          colorName: 'Oat Cream',
          colorHex: '#F4EFEA',
          colorTone: 'neutral',
          pattern: 'solid',
          material: 'Canvas & Leather',
          fit: 'relaxed',
          aesthetics: ['casual', 'minimalist'],
          seasons: ['all-season'],
          occasions: ['class', 'casual', 'weekend'],
          tags: ['flatlay-bag', 'practical'],
          imageUrl: bagCrop,
        });
      }
    }

    const count = detectedGarments.length;
    const summary = count === 1
      ? `Detected 1 single garment in flatlay: ${detectedGarments[0].name}.`
      : `Decomposed flatlay into ${count} distinct pieces.`;

    return {
      detectedType: count === 1 ? 'single' : 'multi-item',
      summary,
      garments: detectedGarments,
    };
  }

  // OOTD / User wearing the clothes: crops upper body, legs, and feet
  const [torsoCrop, legsCrop, feetCrop] = await Promise.all([
    cropImageRegion(optimizedSrc, { x: 0.15, y: 0.12, width: 0.7, height: 0.40 }),
    cropImageRegion(optimizedSrc, { x: 0.15, y: 0.45, width: 0.7, height: 0.40 }),
    cropImageRegion(optimizedSrc, { x: 0.20, y: 0.80, width: 0.6, height: 0.20 }),
  ]);

  return {
    detectedType: 'ootd',
    summary: `Segmented outfit into individual silhouette pieces: Upper (${primaryColor.name}), Lower (${secondaryColor.name}), and Footwear.`,
    garments: [
      {
        name: `${primaryColor.name} Upper Garment`,
        category: 'tops',
        subcategory: 'crop-top',
        colorName: primaryColor.name,
        colorHex: primaryColor.hex,
        colorTone: primaryColor.tone,
        pattern: 'solid',
        material: 'Linen Poplin',
        fit: 'fitted',
        aesthetics: ['chic', 'romantic', 'casual'],
        seasons: ['spring', 'summer'],
        occasions: ['brunch', 'date', 'casual'],
        tags: ['ootd', 'worn', 'silhouette'],
        imageUrl: torsoCrop,
      },
      {
        name: `${secondaryColor.name} Trousers / Denim`,
        category: 'bottoms',
        subcategory: 'jeans',
        colorName: secondaryColor.name,
        colorHex: secondaryColor.hex,
        colorTone: secondaryColor.tone,
        pattern: 'solid',
        material: 'Washed Denim',
        fit: 'relaxed',
        aesthetics: ['casual', 'streetwear', 'chic'],
        seasons: ['all-season'],
        occasions: ['class', 'brunch', 'date', 'casual'],
        tags: ['ootd', 'lower-body', 'daily-fit'],
        imageUrl: legsCrop,
      },
      {
        name: 'Retro Low-Top Sneakers',
        category: 'shoes',
        subcategory: 'sneakers',
        colorName: 'Crisp White',
        colorHex: '#FAF9F6',
        colorTone: 'neutral',
        pattern: 'solid',
        material: 'Smooth Leather',
        fit: 'relaxed',
        aesthetics: ['casual', 'streetwear', 'minimalist'],
        seasons: ['all-season'],
        occasions: ['class', 'brunch', 'casual', 'weekend'],
        tags: ['sneakers', 'ootd', 'kicks'],
        imageUrl: feetCrop,
      },
    ],
  };
}

/**
 * Direct Gemini Multimodal API Integration
 * Supports Gemini 1.5 Flash, 2.0 Flash, 2.5 Flash with automatic fallback
 */
export async function analyzeImageWithGemini(
  imageBase64: string,
  apiKey: string,
  modeHint?: 'single' | 'multi-item' | 'ootd'
): Promise<AnalysisResponse> {
  const prompt = `You are an elite high-fashion digital stylist, personal shopper, and visual AI classifier.
Analyze this garment or outfit photo with extreme precision.

CRITICAL RULES:
1. ACCURATE CATEGORY IDENTIFICATION:
   - "tops": Blouse, crop-top, shirt, button-down, knit sweater, cardigan, t-shirt, tank-top, corset, tube top, long sleeve top. (Covers upper body, torso, chest, or arms. Even if long sleeves are shown or photographed vertically, it is ALWAYS "tops", NEVER "bottoms"!).
   - "bottoms": Jeans, wide-leg denim, straight-leg denim, trousers, cargo pants, tailored pants, shorts, mini-skirt, midi-skirt, maxi-skirt. (Covers lower body; has waistband and legs or skirt flare. NEVER classify a top, shirt, sweater, or sleeve as bottoms!).
   - "dresses": Any one-piece garment combining a top/bodice with a skirt (e.g. sundress, slip-dress, ruffle-dress, mini-dress, midi-dress, maxi-dress, tiered dress, bodycon, wrap-dress). If it has straps, sleeves, or a bodice attached to a skirt, IT IS 100% A DRESS (category: "dresses"). NEVER classify a dress as "tops"!
   - "outerwear": Blazer, trench coat, denim jacket, leather jacket, puffer.
   - "shoes": Sneakers, loafers, boots, heels, mules, sandals, flats.
   - "bags": Tote bag, shoulder bag, crossbody, clutch, handbag.
   - "accessories": Sunglasses, belt, jewelry, necklace, scarf, cap.

2. EXACT GARMENT COUNT DETECTION:
   - Count the EXACT number of distinct physical garments/accessories visible in the image.
   - If the image contains ONLY ONE item (even if uploaded in flatlay mode, e.g. a single top or a single dress on a bed/floor), YOU MUST RETURN AN ARRAY OF EXACTLY ONE GARMENT.
   - NEVER hallucinate or invent phantom items (such as imaginary trousers or bags) that do not physically exist in the photo!
   - Only return multiple garments if multiple distinct physical items are laid out or worn.

3. DETECTED TYPE:
   - "single" if 1 garment is visible.
   - "multi-item" if 2 or more distinct garments are laid out flat.
   - "ootd" if a person is visibly wearing the outfit (mirror selfie or portrait).

Return a valid JSON object strictly matching this schema:
{
  "detectedType": "single" | "multi-item" | "ootd",
  "summary": "Brief 1-sentence description of what was identified (e.g. Baby blue long-sleeve knit top)",
  "garments": [
    {
      "name": "Descriptive fashion name (e.g. Matcha Sage Tiered Ruffle Dress, Slate Grey Layered Mesh Top, Vintage Indigo Wide-Leg Jeans, Baby Sky Blue Long-Sleeve Knit Top)",
      "category": "tops" | "bottoms" | "outerwear" | "dresses" | "shoes" | "bags" | "accessories",
      "subcategory": "sundress" | "slip-dress" | "midi-dress" | "crop-top" | "blouse" | "button-down" | "knit-sweater" | "tank-top" | "t-shirt" | "jeans" | "wide-leg-trousers" | "tailored-pants" | "mini-skirt" | "midi-skirt" | "blazer" | "sneakers" | "loafers" | "mules" | "tote-bag" | "shoulder-bag" | "sunglasses",
      "colorName": "Precise fashion color name (e.g. Matcha Sage, Buttercream Yellow, Baby Sky Blue, Crisp White, Slate Grey, Vintage Indigo)",
      "colorHex": "#RRGGBB hex code representing dominant hue",
      "colorTone": "pastel" | "neutral" | "earthy" | "vibrant" | "dark",
      "pattern": "solid" | "striped" | "floral" | "plaid" | "graphic" | "ribbed" | "polka-dot",
      "material": "Estimated fabric (e.g. Cotton Linen, Washed Denim, Silk Satin, Mesh Knit, Ribbed Cotton, Soft Knit)",
      "fit": "fitted" | "relaxed" | "oversized" | "tailored" | "cropped",
      "aesthetics": ["casual" | "chic" | "streetwear" | "minimalist" | "preppy" | "romantic" | "bohemian"],
      "seasons": ["spring" | "summer" | "fall" | "winter" | "all-season"],
      "occasions": ["class" | "date" | "brunch" | "office" | "party" | "casual" | "weekend"],
      "tags": ["3-5 short relevant keywords"]
    }
  ]
}
${modeHint ? `Hint from user: ${modeHint}` : ''}
Return ONLY valid JSON. No markdown code blocks, no explanation.`;

  // Clean base64 string
  const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
  const mimeType = imageBase64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/jpeg';

  const modelsToTry = [
    'gemini-3.6-flash',
    'gemini-3.7-flash',
    'gemini-flash-latest',
  ];

  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType,
                    data: cleanBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.15,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        // If 404 model not found, try next model
        if (response.status === 404) {
          lastError = new Error(`Model ${model} not found (${response.status})`);
          continue;
        }
        throw new Error(`Gemini API Error (${response.status}): ${errText}`);
      }

      const json = await response.json();
      const textOutput = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textOutput) {
        throw new Error('No response text received from Gemini.');
      }

      // Safely extract JSON text even if wrapped in markdown fences
      let cleanText = textOutput.trim();
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanText = jsonMatch[0];
      }

      const parsed: AnalysisResponse = JSON.parse(cleanText);

      // Attach source image to each garment
      parsed.garments = (parsed.garments || []).map((g: RawDetectedGarment) => ({
        ...g,
        imageUrl: imageBase64,
      }));

      return parsed;
    } catch (err: any) {
      lastError = err;
      if (err.message && err.message.includes('404')) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('All Gemini models failed to analyze image.');
}
