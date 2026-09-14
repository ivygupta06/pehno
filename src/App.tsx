import React, { useState, useEffect } from 'react';
import { GarmentItem, Outfit } from './types/wardrobe';
import { User } from './types/auth';
import {
  loadWardrobe,
  saveWardrobe,
  loadFavorites,
  saveFavorites,
  loadSettings,
  saveSettings,
  resetWardrobe,
  syncWardrobeWithServer,
  UserSettings,
} from './lib/storage';
import { getCurrentUser, signOut as authSignOut, isCreatorUser } from './lib/auth';
import { Navbar } from './components/Navbar';
import { ClosetView } from './components/ClosetView';
import { StylistView } from './components/StylistView';
import { OutfitStudio } from './components/OutfitStudio';
import { FavoritesView } from './components/FavoritesView';
import { ColorWheelView } from './components/ColorWheelView';
import { UploadModal } from './components/UploadModal';
import { ItemDetailModal } from './components/ItemDetailModal';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { DuplicatesModal } from './components/DuplicatesModal';
import { BackendModal } from './components/BackendModal';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'closet' | 'stylist' | 'studio' | 'favorites' | 'spin'>('closet');
  const [wardrobe, setWardrobe] = useState<GarmentItem[]>([]);
  const [favorites, setFavorites] = useState<Outfit[]>([]);
  const [settings, setSettings] = useState<UserSettings>({ geminiApiKey: '' });
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Modals & transient selections
  const [uploadOpen, setUploadOpen] = useState(false);
  const [duplicatesOpen, setDuplicatesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [backendOpen, setBackendOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [itemDetail, setItemDetail] = useState<GarmentItem | null>(null);
  const [garmentToStyle, setGarmentToStyle] = useState<GarmentItem | null>(null);

  // Initialize data from LocalStorage and sync on user changes
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    const loadedS = loadSettings();
    setSettings(loadedS);
  }, []);

  // When currentUser changes (e.g. login / logout), load that user's wardrobe & favorites
  useEffect(() => {
    const userId = currentUser?.id || null;
    const loadedW = loadWardrobe(userId);
    const loadedF = loadFavorites(userId);
    setWardrobe(loadedW);
    setFavorites(loadedF);

    // Sync from local central server database
    syncWardrobeWithServer(userId).then(serverData => {
      if (serverData && serverData.wardrobe && serverData.wardrobe.length > 0) {
        setWardrobe(serverData.wardrobe);
        if (serverData.favorites) setFavorites(serverData.favorites);
      }
    });
  }, [currentUser]);

  // Update wardrobe helper
  const updateWardrobe = (newItems: GarmentItem[]) => {
    setWardrobe(newItems);
    saveWardrobe(newItems, currentUser?.id || null);
  };

  // Add new pieces from photo ingestion
  const handleAddGarments = (newPieces: GarmentItem[]) => {
    const updated = [...newPieces, ...wardrobe];
    updateWardrobe(updated);
  };

  // Toggle favorite on an individual garment
  const handleToggleGarmentFavorite = (itemId: string) => {
    const updated = wardrobe.map(item => {
      if (item.id === itemId) {
        return { ...item, isFavorite: !item.isFavorite };
      }
      return item;
    });
    updateWardrobe(updated);
    if (itemDetail && itemDetail.id === itemId) {
      setItemDetail(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
    }
  };

  // Delete an individual garment
  const handleDeleteGarment = (itemId: string) => {
    const updated = wardrobe.filter(i => i.id !== itemId);
    updateWardrobe(updated);
  };

  // Eliminate multiple duplicate garments
  const handleEliminateMultiple = (itemIds: string[]) => {
    const toRemove = new Set(itemIds);
    const updated = wardrobe.filter(i => !toRemove.has(i.id));
    updateWardrobe(updated);
  };

  // Replace an existing garment with a newly uploaded item
  const handleReplaceGarment = (replacedId: string, newItem: GarmentItem) => {
    const updated = wardrobe.map(i => i.id === replacedId ? { ...newItem, id: replacedId } : i);
    updateWardrobe(updated);
  };

  // Update an existing garment (change category, name, etc.)
  const handleUpdateGarment = (updatedItem: GarmentItem) => {
    const updated = wardrobe.map(i => i.id === updatedItem.id ? updatedItem : i);
    updateWardrobe(updated);
    if (itemDetail && itemDetail.id === updatedItem.id) {
      setItemDetail(updatedItem);
    }
  };

  // Save outfit to favorites
  const handleSaveOutfitToFavorites = (outfit: Outfit) => {
    const userId = currentUser?.id || null;
    if (favorites.some(f => f.id === outfit.id)) {
      const updated = favorites.filter(f => f.id !== outfit.id);
      setFavorites(updated);
      saveFavorites(updated, userId);
    } else {
      const updated = [outfit, ...favorites];
      setFavorites(updated);
      saveFavorites(updated, userId);
    }
  };

  const handleRemoveFavorite = (outfitId: string) => {
    const userId = currentUser?.id || null;
    const updated = favorites.filter(f => f.id !== outfitId);
    setFavorites(updated);
    saveFavorites(updated, userId);
  };

  const handleUpdateFavorite = (updatedOutfit: Outfit) => {
    const userId = currentUser?.id || null;
    const updated = favorites.map(f => f.id === updatedOutfit.id ? updatedOutfit : f);
    setFavorites(updated);
    saveFavorites(updated, userId);
  };

  const isOutfitSaved = (outfitId: string) => {
    return favorites.some(f => f.id === outfitId);
  };

  // Direct "Style This" flow from Closet
  const handleSelectGarmentToStyle = (garment: GarmentItem) => {
    setGarmentToStyle(garment);
    setActiveTab('stylist');
  };

  // Reset / Clear
  const handleResetWardrobe = () => {
    const fresh = resetWardrobe(currentUser?.id || null);
    setWardrobe(fresh);
  };

  const handleClearAll = () => {
    updateWardrobe([]);
    setFavorites([]);
    saveFavorites([], currentUser?.id || null);
  };

  const handleSyncWardrobe = (syncedWardrobe: GarmentItem[], syncedFavorites: Outfit[]) => {
    updateWardrobe(syncedWardrobe);
    setFavorites(syncedFavorites);
    const userId = currentUser?.id || null;
    saveWardrobe(syncedWardrobe, userId);
    saveFavorites(syncedFavorites, userId);
  };

  const handleSignOut = () => {
    authSignOut();
    setCurrentUser(null);
  };

  const hasGeminiKey = Boolean(settings.geminiApiKey && settings.geminiApiKey.trim().length > 15);

  return (
    <div className="min-h-screen bg-pastel-cream-100 flex flex-col selection:bg-pastel-lavender selection:text-pastel-charcoal">
      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        closetCount={wardrobe.length}
        favoritesCount={favorites.length}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenBackend={() => setBackendOpen(true)}
        currentUser={currentUser}
        onOpenAuth={() => setAuthOpen(true)}
        onSignOut={handleSignOut}
        hasGeminiKey={hasGeminiKey}
      />

      {/* Main Tab Views */}
      <main className="flex-1 pb-16">
        {activeTab === 'closet' && (
          <ClosetView
            wardrobe={wardrobe}
            onToggleFavorite={handleToggleGarmentFavorite}
            onSelectGarmentToStyle={handleSelectGarmentToStyle}
            onViewItemDetail={(g) => setItemDetail(g)}
            onOpenUpload={() => setUploadOpen(true)}
            onOpenDuplicates={() => setDuplicatesOpen(true)}
          />
        )}

        {activeTab === 'stylist' && (
          <StylistView
            wardrobe={wardrobe}
            preselectedItem={garmentToStyle}
            onSaveOutfitToFavorites={handleSaveOutfitToFavorites}
            isOutfitSaved={isOutfitSaved}
            onViewItemDetail={(g) => setItemDetail(g)}
            geminiApiKey={settings.geminiApiKey}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        )}

        {activeTab === 'studio' && (
          <OutfitStudio
            wardrobe={wardrobe}
            onSaveOutfit={handleSaveOutfitToFavorites}
          />
        )}

        {activeTab === 'favorites' && (
          <FavoritesView
            favorites={favorites}
            onRemoveFavorite={handleRemoveFavorite}
            onUpdateFavorite={handleUpdateFavorite}
            onNavigateToStylist={() => setActiveTab('stylist')}
            onViewItemDetail={(g) => setItemDetail(g)}
          />
        )}

        {activeTab === 'spin' && (
          <ColorWheelView
            wardrobe={wardrobe}
            favorites={favorites}
            onSaveFavorite={handleSaveOutfitToFavorites}
            onSelectGarmentToStyle={handleSelectGarmentToStyle}
            onNavigateToStylist={() => setActiveTab('stylist')}
          />
        )}
      </main>

      {/* Upload Photo Modal */}
      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onAddGarments={handleAddGarments}
        geminiApiKey={settings.geminiApiKey}
        wardrobe={wardrobe}
        onReplaceGarment={handleReplaceGarment}
        onSaveApiKey={(key) => {
          const updated = { ...settings, geminiApiKey: key };
          setSettings(updated);
          saveSettings(updated);
        }}
      />

      {/* Wardrobe Duplicates Scanner & Eliminator Modal */}
      <DuplicatesModal
        isOpen={duplicatesOpen}
        onClose={() => setDuplicatesOpen(false)}
        wardrobe={wardrobe}
        onEliminateGarment={handleDeleteGarment}
        onEliminateMultiple={handleEliminateMultiple}
      />

      {/* Garment Details Modal */}
      <ItemDetailModal
        item={itemDetail}
        wardrobe={wardrobe}
        onClose={() => setItemDetail(null)}
        onToggleFavorite={handleToggleGarmentFavorite}
        onDelete={handleDeleteGarment}
        onStyleThis={handleSelectGarmentToStyle}
        onUpdateGarment={handleUpdateGarment}
        onSelectGarment={(garment) => setItemDetail(garment)}
        onAddGarments={handleAddGarments}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSaveSettings={(newS) => {
          setSettings(newS);
          saveSettings(newS);
        }}
        onResetWardrobe={handleResetWardrobe}
        onClearAll={handleClearAll}
        wardrobe={wardrobe}
        favorites={favorites}
        onSyncWardrobe={handleSyncWardrobe}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={(user) => setCurrentUser(user)}
      />

      {/* Backend & Database Control Modal (Only for Website Creator) */}
      {isCreatorUser(currentUser) && (
        <BackendModal
          isOpen={backendOpen}
          onClose={() => setBackendOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
