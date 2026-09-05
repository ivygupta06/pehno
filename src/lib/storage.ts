import { GarmentItem, Outfit } from '../types/wardrobe';
import { INITIAL_WARDROBE } from '../data/initialWardrobe';

const WARDROBE_KEY_PREFIX = 'pehno_wardrobe_items_';
const FAVORITES_KEY_PREFIX = 'pehno_favorite_outfits_';
const SETTINGS_KEY = 'pehno_user_settings_v1';

export interface UserSettings {
  geminiApiKey: string;
  enableSoundEffects?: boolean;
  defaultOccasion?: string;
}

export function getWardrobeStorageKey(userId?: string | null): string {
  return userId ? `${WARDROBE_KEY_PREFIX}${userId}` : 'pehno_wardrobe_items_v1';
}

export function getFavoritesStorageKey(userId?: string | null): string {
  return userId ? `${FAVORITES_KEY_PREFIX}${userId}` : 'pehno_favorite_outfits_v1';
}

export function loadWardrobe(userId?: string | null): GarmentItem[] {
  try {
    const key = getWardrobeStorageKey(userId);
    const data = localStorage.getItem(key);
    if (!data) {
      // If new account, copy existing closet or seed initial
      const legacyData = localStorage.getItem('pehno_wardrobe_items_v1');
      if (legacyData) {
        try {
          const parsed = JSON.parse(legacyData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            saveWardrobe(parsed, userId);
            return parsed;
          }
        } catch (e) {}
      }
      saveWardrobe(INITIAL_WARDROBE, userId);
      return INITIAL_WARDROBE;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Error loading wardrobe from localStorage', e);
    return INITIAL_WARDROBE;
  }
}

export function saveWardrobe(items: GarmentItem[], userId?: string | null): void {
  try {
    const key = getWardrobeStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(items));
    if (!userId) {
      localStorage.setItem('pehno_wardrobe_items_v1', JSON.stringify(items));
    }
  } catch (e) {
    console.error('Error saving wardrobe to localStorage', e);
  }
}

export function loadFavorites(userId?: string | null): Outfit[] {
  try {
    const key = getFavoritesStorageKey(userId);
    const data = localStorage.getItem(key);
    if (!data && userId) {
      const legacy = localStorage.getItem('pehno_favorite_outfits_v1');
      if (legacy) return JSON.parse(legacy);
    }
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error loading favorites from localStorage', e);
    return [];
  }
}

export function saveFavorites(favorites: Outfit[], userId?: string | null): void {
  try {
    const key = getFavoritesStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(favorites));
    if (!userId) {
      localStorage.setItem('pehno_favorite_outfits_v1', JSON.stringify(favorites));
    }
  } catch (e) {
    console.error('Error saving favorites to localStorage', e);
  }
}

export function loadSettings(): UserSettings {
  const envKey = ((import.meta as any).env?.VITE_GEMINI_API_KEY || '').trim();
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    const parsed = data ? JSON.parse(data) : {};
    const key = (parsed.geminiApiKey && parsed.geminiApiKey.trim().length > 10)
      ? parsed.geminiApiKey.trim()
      : envKey;
    return {
      ...parsed,
      geminiApiKey: key,
    };
  } catch (e) {
    return { geminiApiKey: envKey };
  }
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings to localStorage', e);
  }
}

export function resetWardrobe(userId?: string | null): GarmentItem[] {
  saveWardrobe(INITIAL_WARDROBE, userId);
  return INITIAL_WARDROBE;
}
