export type GarmentCategory = 
  | 'tops' 
  | 'bottoms' 
  | 'outerwear' 
  | 'dresses' 
  | 'shoes' 
  | 'bags' 
  | 'accessories';

export type GarmentSubcategory = 
  // Tops
  | 't-shirt' | 'crop-top' | 'blouse' | 'button-down' | 'knit-sweater' | 'tank-top' | 'tube-top' | 'corset' | 'cardigan' | 'hoodie'
  // Bottoms
  | 'jeans' | 'wide-leg-trousers' | 'tailored-pants' | 'cargo-pants' | 'shorts' | 'mini-skirt' | 'midi-skirt' | 'linen-pants'
  // Outerwear
  | 'blazer' | 'trench-coat' | 'denim-jacket' | 'leather-jacket' | 'puffer' | 'duster' | 'shrug' | 'bolero'
  // Dresses
  | 'slip-dress' | 'sundress' | 'midi-dress' | 'mini-dress' | 'maxi-dress' | 'wrap-dress' | 'bodycon' | 'shirt-dress' | 'jumpsuit'
  // Shoes
  | 'sneakers' | 'loafers' | 'mules' | 'heels' | 'sandals' | 'boots' | 'flats'
  // Bags
  | 'tote-bag' | 'shoulder-bag' | 'crossbody' | 'clutch' | 'backpack' | 'woven-bag'
  // Accessories
  | 'sunglasses' | 'necklace' | 'earrings' | 'belt' | 'cap' | 'scarf' | 'watch';

export type ColorTone = 
  | 'pastel' 
  | 'neutral' 
  | 'earthy' 
  | 'vibrant' 
  | 'dark' 
  | 'monochrome';

export type StyleAesthetic = 
  | 'casual' 
  | 'chic' 
  | 'streetwear' 
  | 'minimalist' 
  | 'preppy' 
  | 'romantic' 
  | 'formal' 
  | 'bohemian' 
  | 'athleisure'
  | 'retro';

export type Season = 'spring' | 'summer' | 'fall' | 'winter' | 'all-season';

export type Occasion = 
  | 'class' 
  | 'date' 
  | 'brunch' 
  | 'office' 
  | 'party' 
  | 'casual' 
  | 'weekend'
  | 'formal';

export interface GarmentItem {
  id: string;
  name: string;
  category: GarmentCategory;
  subcategory: GarmentSubcategory;
  colorName: string;
  colorHex: string;
  colorTone: ColorTone;
  secondaryColor?: string;
  pattern: 'solid' | 'striped' | 'floral' | 'plaid' | 'graphic' | 'ribbed' | 'polka-dot';
  material?: string;
  aesthetics: StyleAesthetic[];
  seasons: Season[];
  occasions: Occasion[];
  fit: 'fitted' | 'relaxed' | 'oversized' | 'tailored' | 'cropped';
  imageUrl: string;
  createdAt: number;
  isFavorite?: boolean;
  notes?: string;
  tags: string[];
}

export interface ExternalSuggestion {
  id: string;
  category: GarmentCategory;
  name: string;
  color: string;
  colorHex: string;
  reasoning: string;
  searchQuery: string;
  vibe: string;
}

export interface Outfit {
  id: string;
  title: string;
  description: string;
  top?: GarmentItem;
  bottom?: GarmentItem;
  dress?: GarmentItem;
  outerwear?: GarmentItem;
  shoes?: GarmentItem;
  bag?: GarmentItem;
  accessory?: GarmentItem;
  secondaryAccessory?: GarmentItem;
  // Suggestions for items the user might not have in their wardrobe:
  externalSuggestions?: ExternalSuggestion[];
  occasion: Occasion;
  compatibilityScore: number; // 0 - 100
  colorHarmonyType: string; // e.g. "Complementary Pastel", "Crisp High Contrast", "Tonal Neutral"
  stylingNotes: string[];
  vibe: StyleAesthetic;
  createdAt?: number;
  rating?: number; // 1 - 5
  userNotes?: string;
}

export interface DetectionResult {
  garments: Omit<GarmentItem, 'id' | 'createdAt'>[];
  detectedType: 'single' | 'multi-item' | 'ootd';
  analysisSummary: string;
  confidence: number;
}

export interface WardrobeFilter {
  category?: GarmentCategory | 'all';
  colorTone?: ColorTone | 'all';
  season?: Season | 'all';
  aesthetic?: StyleAesthetic | 'all';
  occasion?: Occasion | 'all';
  searchQuery: string;
}
