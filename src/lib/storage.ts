import { GarmentItem, Outfit } from '../types/wardrobe';
import { INITIAL_WARDROBE } from '../data/initialWardrobe';
import { formatGarmentName } from './colorTheory';
import { apiUrl } from './api';

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

/**
 * Older imports used "Net" as a color-based guess. Correct that legacy label
 * only when the saved material and tags provide no evidence of mesh/net fabric.
 * New imports retain their model-provided garment names as usual.
 */
function formatStoredGarmentName(item: GarmentItem): string {
  const evidence = `${item.material || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
  const claimsNetWithoutEvidence = /\b(net|mesh)\b/i.test(item.name) && !/\b(net|mesh)\b/.test(evidence);
  const reliableDescription = claimsNetWithoutEvidence
    ? `${(item.tags || []).join(' ')} ${item.subcategory}`
    : item.name;

  return formatGarmentName(reliableDescription, item.colorName, item.category, item.subcategory);
}

function normalizeWardrobeNames(items: GarmentItem[]): { items: GarmentItem[]; hasChanges: boolean } {
  let hasChanges = false;
  const normalized = items.map(item => {
    const name = formatStoredGarmentName(item);
    if (name !== item.name) {
      hasChanges = true;
      return { ...item, name };
    }
    return item;
  });
  return { items: normalized, hasChanges };
}

export function loadWardrobe(userId?: string | null): GarmentItem[] {
  try {
    const key = getWardrobeStorageKey(userId);
    const data = localStorage.getItem(key);
    let items: GarmentItem[] = [];
    if (!data) {
      if (!userId) {
        // Unauthenticated guest: fall back to legacy shared key or seed initial wardrobe
        const legacyData = localStorage.getItem('pehno_wardrobe_items_v1');
        if (legacyData) {
          try {
            const parsed = JSON.parse(legacyData);
            if (Array.isArray(parsed) && parsed.length > 0) {
              items = parsed;
            }
          } catch (e) {}
        }
        if (items.length === 0) {
          items = INITIAL_WARDROBE;
        }
      }
      // Authenticated new user: start with a fresh empty wardrobe (items stays [])
    } else {
      items = JSON.parse(data);
    }

    if (Array.isArray(items)) {
      // Auto-migrate garment names: MAX 3 words, 1st word color
      const { items: cleaned, hasChanges } = normalizeWardrobeNames(items);
      if (hasChanges) {
        saveWardrobe(cleaned, userId);
      }
      return cleaned;
    }
    return [];
  } catch (e) {
    console.error('Error loading wardrobe from localStorage', e);
    return [];
  }
}

export function saveWardrobe(items: GarmentItem[], userId?: string | null): void {
  try {
    const key = getWardrobeStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(items));
    if (!userId) {
      localStorage.setItem('pehno_wardrobe_items_v1', JSON.stringify(items));
    }
    // Background sync to local backend database
    fetch(apiUrl('/api/wardrobe/save'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userId || 'default',
        wardrobe: items,
        favorites: loadFavorites(userId),
        browser: typeof navigator !== 'undefined' ? navigator.userAgent.split(' ')[0] : 'Browser',
      }),
    }).catch(() => {});
  } catch (e) {
    console.error('Error saving wardrobe to localStorage', e);
  }
}

export async function syncWardrobeWithServer(userId?: string | null): Promise<{
  wardrobe?: GarmentItem[];
  favorites?: Outfit[];
} | null> {
  try {
    const res = await fetch(apiUrl(`/api/wardrobe/get?userId=${encodeURIComponent(userId || 'default')}`));
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && Array.isArray(data.wardrobe) && data.wardrobe.length > 0) {
      const { items: cleanedWardrobe, hasChanges } = normalizeWardrobeNames(data.wardrobe);
      const key = getWardrobeStorageKey(userId);
      localStorage.setItem(key, JSON.stringify(cleanedWardrobe));
      if (hasChanges) {
        saveWardrobe(cleanedWardrobe, userId);
      }
      if (Array.isArray(data.favorites)) {
        const favKey = getFavoritesStorageKey(userId);
        localStorage.setItem(favKey, JSON.stringify(data.favorites));
      }
      return {
        wardrobe: cleanedWardrobe,
        favorites: data.favorites || [],
      };
    }
    return null;
  } catch (e) {
    return null;
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
    // If envKey is provided via .env, prioritize it so changes in .env are picked up immediately
    const key = envKey || ((parsed.geminiApiKey && parsed.geminiApiKey.trim().length > 10)
      ? parsed.geminiApiKey.trim()
      : '');
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

export interface WardrobeBackup {
  version: number;
  exportedAt: number;
  wardrobe: GarmentItem[];
  favorites: Outfit[];
}

export function exportWardrobeBackup(userId?: string | null): WardrobeBackup {
  const wardrobe = loadWardrobe(userId);
  const favorites = loadFavorites(userId);
  return {
    version: 1,
    exportedAt: Date.now(),
    wardrobe,
    favorites,
  };
}

export function importWardrobeBackup(
  backup: any,
  userId?: string | null
): { success: boolean; wardrobe: GarmentItem[]; favorites: Outfit[]; error?: string } {
  try {
    const items = Array.isArray(backup.wardrobe) ? backup.wardrobe : (Array.isArray(backup) ? backup : null);
    if (!items || items.length === 0) {
      return { success: false, wardrobe: [], favorites: [], error: 'Invalid backup format. No garments found.' };
    }
    const favorites = Array.isArray(backup.favorites) ? backup.favorites : [];
    saveWardrobe(items, userId);
    saveFavorites(favorites, userId);
    return { success: true, wardrobe: items, favorites };
  } catch (e: any) {
    return { success: false, wardrobe: [], favorites: [], error: e.message || 'Import failed.' };
  }
}

export async function pushToSharedServer(
  wardrobe: GarmentItem[],
  favorites: Outfit[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(apiUrl('/api/wardrobe/shared'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: 1,
        timestamp: Date.now(),
        wardrobe,
        favorites,
      }),
    });
    if (!res.ok) throw new Error(`Server returned status ${res.status}`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function pullFromSharedServer(): Promise<{
  success: boolean;
  exists: boolean;
  wardrobe?: GarmentItem[];
  favorites?: Outfit[];
  error?: string;
}> {
  try {
    const res = await fetch(apiUrl('/api/wardrobe/shared'));
    if (!res.ok) throw new Error(`Server returned status ${res.status}`);
    const data = await res.json();
    if (!data || data.exists === false || !Array.isArray(data.wardrobe)) {
      return { success: true, exists: false };
    }
    const { items: cleanedWardrobe } = normalizeWardrobeNames(data.wardrobe);
    return {
      success: true,
      exists: true,
      wardrobe: cleanedWardrobe,
      favorites: data.favorites || [],
    };
  } catch (e: any) {
    return { success: false, exists: false, error: e.message };
  }
}
