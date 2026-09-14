import { GarmentCategory, GarmentSubcategory, StyleAesthetic, Season, Occasion, ColorTone } from '../types/wardrobe';
import { getApproximateColorName, formatGarmentName } from './colorTheory';

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
  /** Normalized to the source image: values may be 0–1 or Gemini's 0–1000 scale. */
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

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Turn a model-provided bounding box into a safe normalized crop. Gemini is
 * asked for 0–1000 coordinates, while older responses may use 0–1 values.
 * A small amount of padding avoids cutting off straps, sleeves, or hems.
 */
export function normalizeGarmentCrop(
  cropBox?: RawDetectedGarment['cropBox']
): { x: number; y: number; width: number; height: number } | null {
  if (!cropBox || ![cropBox.x, cropBox.y, cropBox.width, cropBox.height].every(Number.isFinite)) {
    return null;
  }

  const scale = Math.max(cropBox.x, cropBox.y, cropBox.width, cropBox.height) > 1.25 ? 1000 : 1;
  const width = cropBox.width / scale;
  const height = cropBox.height / scale;
  if (width < 0.04 || height < 0.04) return null;

  const x = cropBox.x / scale;
  const y = cropBox.y / scale;
  const horizontalPadding = Math.min(0.03, width * 0.08);
  const verticalPadding = Math.min(0.03, height * 0.08);
  const left = clamp(x - horizontalPadding, 0, 1);
  const top = clamp(y - verticalPadding, 0, 1);
  const right = clamp(x + width + horizontalPadding, 0, 1);
  const bottom = clamp(y + height + verticalPadding, 0, 1);

  if (right - left < 0.04 || bottom - top < 0.04) return null;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

async function attachGarmentCrops(
  sourceImage: string,
  garments: RawDetectedGarment[]
): Promise<RawDetectedGarment[]> {
  return Promise.all(garments.map(async (garment) => {
    const crop = normalizeGarmentCrop(garment.cropBox);
    return {
      ...garment,
      imageUrl: crop ? await cropImageRegion(sourceImage, crop) : sourceImage,
    };
  }));
}

/**
 * The model occasionally gives two pieces the same short title. Preserve the
 * color-first format while using actual item metadata to distinguish them.
 */
function makeGarmentNamesUnique(garments: RawDetectedGarment[]): RawDetectedGarment[] {
  const usedNames = new Set<string>();

  return garments.map((garment, index) => {
    const baseName = formatGarmentName(garment.name, garment.colorName, garment.category, garment.subcategory);
    const baseKey = baseName.toLowerCase();
    if (!usedNames.has(baseKey)) {
      usedNames.add(baseKey);
      return { ...garment, name: baseName };
    }

    const [color, ...nameParts] = baseName.split(/\s+/);
    const noun = nameParts.at(-1) || 'Item';
    const raw = `${garment.name} ${garment.subcategory} ${garment.material || ''}`.toLowerCase();
    const metadataDescriptors = [
      garment.pattern !== 'solid' ? garment.pattern : '',
      garment.fit,
      raw.includes('ribbed') ? 'ribbed' : '',
      raw.includes('knit') ? 'knit' : '',
      raw.includes('linen') ? 'linen' : '',
      raw.includes('leather') ? 'leather' : '',
    ].filter(Boolean);

    for (const descriptor of metadataDescriptors) {
      const candidate = `${color} ${descriptor.charAt(0).toUpperCase()}${descriptor.slice(1)} ${noun}`;
      if (!usedNames.has(candidate.toLowerCase())) {
        usedNames.add(candidate.toLowerCase());
        return { ...garment, name: candidate };
      }
    }

    // This only applies if the model has returned indistinguishable metadata
    // for separate physical pieces. Keep a short readable fallback instead of
    // silently saving two identical names.
    const fallback = `${color} ${index + 1} ${noun}`;
    usedNames.add(fallback.toLowerCase());
    return { ...garment, name: fallback };
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
    let rawItemName = 'Knit Top';

    // 1. Check for Dresses (flaring skirt, one-piece silhouette, or vertical coverage)
    if (analysis.isDress) {
      category = 'dresses';
      subcategory = 'sundress';
      rawItemName = 'Sundress';
    } else if (analysis.isBottoms) {
      // 2. Clear bifurcated pants/bottoms silhouette
      category = 'bottoms';
      subcategory = primaryColor.tone === 'neutral' ? 'jeans' : 'wide-leg-trousers';
      rawItemName = subcategory === 'jeans' ? 'Straight Jeans' : 'Wide Trousers';
    } else if (aspectRatio > 1.35 || analysis.isWide) {
      // 3. Wide / compact -> Shoes or Bags
      category = 'shoes';
      subcategory = 'sneakers';
      rawItemName = 'Sneakers';
    } else {
      // Canvas color analysis cannot identify a fabric weave or construction.
      // Keep its fallback deliberately neutral instead of inventing "net" or
      // "layered" based solely on black or brown pixels.
      category = 'tops';
      subcategory = 'knit-sweater';
      rawItemName = 'Knit Top';
    }

    const namePrefix = formatGarmentName(rawItemName, primaryColor.name, category, subcategory);

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
        name: formatGarmentName('Sundress', primaryColor.name, 'dresses', 'sundress'),
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
      // Local color analysis cannot verify construction or fabric texture.
      // Use a neutral fallback label; Gemini supplies the precise garment type.
      const topDescriptor = 'Knit Top';

      detectedGarments.push({
        name: formatGarmentName(topDescriptor, primaryColor.name, 'tops', 'crop-top'),
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

      // Bottom piece
      if (analysis.hasLowerRegionGarment || aspectRatio > 1.1) {
        const bottomCrop = await cropImageRegion(optimizedSrc, { x: 0.1, y: 0.42, width: 0.8, height: 0.45 });
        detectedGarments.push({
          name: formatGarmentName('Straight Jeans', secondaryColor.name, 'bottoms', 'jeans'),
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

      // Footwear piece (Shoes/Sneakers/Heels)
      if (analysis.hasLowerRegionGarment || analysis.isWide || aspectRatio > 1.1) {
        const shoesCrop = await cropImageRegion(optimizedSrc, { x: 0.55, y: 0.70, width: 0.42, height: 0.28 });
        detectedGarments.push({
          name: formatGarmentName('Court Sneakers', 'White', 'shoes', 'sneakers'),
          category: 'shoes',
          subcategory: 'sneakers',
          colorName: 'Crisp White',
          colorHex: '#FAF9F6',
          colorTone: 'neutral',
          pattern: 'solid',
          material: 'Leather',
          fit: 'relaxed',
          aesthetics: ['casual', 'minimalist'],
          seasons: ['all-season'],
          occasions: ['casual', 'brunch', 'class'],
          tags: ['flatlay-shoes', 'footwear'],
          imageUrl: shoesCrop,
        });
      }

      // Bag piece
      if (analysis.hasAccessoryRegionGarment || analysis.hasLowerRegionGarment || aspectRatio > 1.1) {
        const bagCrop = await cropImageRegion(optimizedSrc, { x: 0.65, y: 0.15, width: 0.32, height: 0.45 });
        detectedGarments.push({
          name: formatGarmentName('Leather Bag', 'Brown', 'bags', 'shoulder-bag'),
          category: 'bags',
          subcategory: 'shoulder-bag',
          colorName: 'Caramel Brown',
          colorHex: '#9A3412',
          colorTone: 'earthy',
          pattern: 'solid',
          material: 'Vegan Leather',
          fit: 'tailored',
          aesthetics: ['chic', 'preppy'],
          seasons: ['all-season'],
          occasions: ['brunch', 'date', 'office'],
          tags: ['flatlay-bag', 'essential'],
          imageUrl: bagCrop,
        });
      }

      // Accessory piece (e.g. Sunglasses)
      if (analysis.hasAccessoryRegionGarment || aspectRatio > 1.1) {
        const accCrop = await cropImageRegion(optimizedSrc, { x: 0.05, y: 0.72, width: 0.35, height: 0.25 });
        detectedGarments.push({
          name: formatGarmentName('Cat-Eye Sunglasses', 'Amber', 'accessories', 'sunglasses'),
          category: 'accessories',
          subcategory: 'sunglasses',
          colorName: 'Tortoiseshell Amber',
          colorHex: '#B45309',
          colorTone: 'earthy',
          pattern: 'solid',
          material: 'Acetate',
          fit: 'tailored',
          aesthetics: ['chic', 'retro'],
          seasons: ['all-season'],
          occasions: ['brunch', 'weekend', 'casual'],
          tags: ['flatlay-accessory', 'shades'],
          imageUrl: accCrop,
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

  // OOTD / Mirror Selfie:
  if (analysis.isDress) {
    const [dressCrop, feetCrop] = await Promise.all([
      cropImageRegion(optimizedSrc, { x: 0.15, y: 0.12, width: 0.7, height: 0.68 }),
      cropImageRegion(optimizedSrc, { x: 0.20, y: 0.80, width: 0.6, height: 0.20 }),
    ]);

    const dressName = formatGarmentName('Slip Dress', primaryColor.name, 'dresses', 'slip-dress');
    return {
      detectedType: 'ootd',
      summary: `Identified 1-piece dress: ${dressName} (${primaryColor.name}) with matching footwear.`,
      garments: [
        {
          name: dressName,
          category: 'dresses',
          subcategory: 'slip-dress',
          colorName: primaryColor.name,
          colorHex: primaryColor.hex,
          colorTone: primaryColor.tone,
          pattern: 'solid',
          material: 'Cotton Linen / Silk',
          fit: 'relaxed',
          aesthetics: ['romantic', 'chic'],
          seasons: ['spring', 'summer', 'all-season'],
          occasions: ['date', 'brunch', 'party', 'casual'],
          tags: ['ootd', 'dress', 'one-piece'],
          imageUrl: dressCrop,
        },
        {
          name: formatGarmentName('Strappy Heels', 'Black', 'shoes', 'heels'),
          category: 'shoes',
          subcategory: 'heels',
          colorName: 'Black',
          colorHex: '#18181B',
          colorTone: 'dark',
          pattern: 'solid',
          material: 'Smooth Leather',
          fit: 'tailored',
          aesthetics: ['chic', 'romantic'],
          seasons: ['all-season'],
          occasions: ['date', 'party', 'brunch'],
          tags: ['heels', 'ootd', 'dressy'],
          imageUrl: feetCrop,
        },
      ],
    };
  }

  // OOTD Two-piece:
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
        name: formatGarmentName('Linen Top', primaryColor.name, 'tops', 'crop-top'),
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
        name: formatGarmentName('Straight Jeans', secondaryColor.name, 'bottoms', 'jeans'),
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
        name: formatGarmentName('Court Sneakers', 'Crisp White', 'shoes', 'sneakers'),
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
   - "dresses": Any one-piece garment combining a top/bodice with a skirt (e.g. sundress, slip-dress, ruffle-dress, mini-dress, midi-dress, maxi-dress, tiered dress, bodycon, wrap-dress). If it has straps, sleeves, or a bodice attached to a skirt, IT IS 100% A DRESS (category: "dresses"). NEVER classify a dress as "tops" or split into top + skirt/jeans!
   - "outerwear": Blazer, trench coat, denim jacket, leather jacket, puffer, shrug.
   - "shoes": Sneakers, loafers, boots, heels, mules, sandals, flats.
   - "bags": Tote bag, shoulder bag, crossbody, clutch, handbag.
   - "accessories": Sunglasses, belt, jewelry, necklace, scarf, cap.

2. OOTD / MIRROR SELFIE DRESS & TRUE COLOR IDENTIFICATION (CRITICAL FOR OOTD / SELFIE):
   - When the user uploads an OOTD or mirror selfie:
     * DRESS VS TWO-PIECE: Carefully check if the person is wearing a continuous 1-piece DRESS!
       If it is a dress, you MUST set category to "dresses" and determine its exact subcategory: 'slip-dress', 'sundress', 'midi-dress', 'mini-dress', 'maxi-dress', 'wrap-dress', 'bodycon'.
       DO NOT split a one-piece dress into separate top and jeans/bottoms! A dress is ONE garment.
     * TRUE GARMENT FABRIC COLOR EXTRACTION:
       Focus strictly on the actual FABRIC of the garment.
       DO NOT be misled by phone case color, mirror reflections, background walls, skin tone, or warm indoor yellow lighting/shadows/glare!
       Determine the TRUE, daylight fabric color (e.g. Red, Black, Brown, Navy Blue, Emerald Green, White, Cream, Pink, Yellow, Burgundy, Olive).
     * Also detect any visible footwear (heels, sneakers, boots), bag, or outerwear worn by the person.

3. MULTI-ITEM FLAT LAY SCANNING (DETECT UP TO 5+ ITEMS):
   - When the image is a flat lay with multiple items laid out (mode: multi-item):
     * Thoroughly scan the ENTIRE image across all quadrants and corners (top, middle, bottom, left, right).
     * Flat lays frequently contain up to 5 or more distinct items:
       1) Top / Blouse / Shirt / Knit
       2) Bottoms / Jeans / Trousers / Skirt / Shorts
       3) Outerwear / Jacket / Cardigan / Blazer
       4) Footwear / Heels / Sneakers / Loafers / Sandals
       5) Bag / Handbag / Tote / Clutch
       6) Accessories / Sunglasses / Belt / Jewelry
     * If 5 items are visible in the photo, YOU MUST RETURN ALL 5 SEPARATE ITEMS in the 'garments' array! Do not stop after 2 or 3 items, and do not combine separate items into one.
     * For EVERY detected item, return a tight cropBox around that physical item only. Use the 0–1000 coordinate system: x and y are the top-left point, width and height are the size. Do not include neighbouring garments in the box. A brown tank must get the brown tank crop, not the complete flat lay.

4. EXACT GARMENT COUNT:
   - If the image contains ONLY ONE item (single garment photo), return an array with EXACTLY 1 garment.
   - If multiple distinct items are visible (multi-flat lay or complete worn outfit), return ALL distinct physical items visible.

5. STRICT 2-TO-3 WORD SIMPLE NAMING:
   - Garment names MUST BE STRICTLY MAXIMUM 3 WORDS!
   - The FIRST word MUST ALWAYS be the simple color (e.g. "Brown", "Black", "Blue", "White", "Red", "Green", "Yellow", "Pink", "Grey", "Cream", "Navy", "Orange", "Gold").
   - The remaining 1-2 words MUST be the style descriptor and garment noun.
   - Examples: "Brown Ribbed Tank", "Black Knit Top", "Blue Long Top", "Red Slip Dress", "Black Mini Dress", "Blue Straight Jeans", "Black Strappy Heels", "Brown Leather Bag".
   - Only call something "Net" or "Mesh" when that texture is visibly present. Never use those words merely because an item is black or dark. Two different black items must have different names based on their real cut or garment type (for example, "Black Tank" and "Black Long Top").
   - NEVER use long, fluffy names like "Burgundy Wine Essential Top" or "Vintage Washed Straight Denim Jeans"!

Return a valid JSON object strictly matching this schema:
{
  "detectedType": "single" | "multi-item" | "ootd",
  "summary": "Brief 1-sentence description of what was identified",
  "garments": [
    {
      "name": "MAX 3 WORDS: 1st word color (e.g. Black Net Top, Brown Layer Top, Red Slip Dress, Blue Straight Jeans, Black Strappy Heels)",
      "category": "tops" | "bottoms" | "outerwear" | "dresses" | "shoes" | "bags" | "accessories",
      "subcategory": "sundress" | "slip-dress" | "midi-dress" | "mini-dress" | "maxi-dress" | "wrap-dress" | "bodycon" | "crop-top" | "blouse" | "button-down" | "knit-sweater" | "tank-top" | "tube-top" | "t-shirt" | "jeans" | "shorts" | "wide-leg-trousers" | "tailored-pants" | "cargo-pants" | "linen-pants" | "mini-skirt" | "midi-skirt" | "blazer" | "denim-jacket" | "leather-jacket" | "sneakers" | "loafers" | "heels" | "mules" | "sandals" | "boots" | "tote-bag" | "shoulder-bag" | "crossbody" | "sunglasses" | "belt" | "necklace" | "scarf",
      "colorName": "Precise fashion color name (e.g. Crimson Red, Navy Blue, Buttercream Yellow, Crisp White, Slate Grey, Vintage Indigo)",
      "colorHex": "#RRGGBB hex code representing dominant fabric hue",
      "colorTone": "pastel" | "neutral" | "earthy" | "vibrant" | "dark",
      "pattern": "solid" | "striped" | "floral" | "plaid" | "graphic" | "ribbed" | "polka-dot",
      "material": "Estimated fabric (e.g. Cotton Linen, Washed Denim, Silk Satin, Mesh Knit, Ribbed Cotton, Soft Knit)",
      "fit": "fitted" | "relaxed" | "oversized" | "tailored" | "cropped",
      "cropBox": { "x": 0, "y": 0, "width": 0, "height": 0 },
      "aesthetics": ["casual" | "chic" | "streetwear" | "minimalist" | "preppy" | "romantic" | "bohemian"],
      "seasons": ["spring" | "summer" | "fall" | "winter" | "all-season"],
      "occasions": ["class" | "date" | "brunch" | "office" | "party" | "casual" | "weekend"],
      "tags": ["3-5 short relevant keywords"]
    }
  ]
}
${modeHint ? `Hint from user: Mode is '${modeHint}'.` : ''}
Return ONLY valid JSON. No markdown code blocks, no explanation.`;

  // Clean base64 string
  const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
  const mimeType = imageBase64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/jpeg';

  const modelsToTry = [
    'gemini-3.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
  ];

  let lastError: any = null;
  const cleanKey = apiKey.trim();

  for (const model of modelsToTry) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cleanKey)}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': cleanKey,
        },
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
      const parts = json.candidates?.[0]?.content?.parts || [];
      const textPart = parts.find((p: any) => p.text && !p.thought) || parts.find((p: any) => p.text);
      const textOutput = textPart?.text;
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

      // Save an item-specific crop whenever the model supplies a usable box.
      // This is what prevents a Brown Tank card from showing the entire flat lay.
      const croppedGarments = await attachGarmentCrops(imageBase64, parsed.garments || []);
      parsed.garments = makeGarmentNamesUnique(croppedGarments);

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
