import mongoose from 'mongoose';

const wardrobeSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  wardrobe: { type: mongoose.Schema.Types.Mixed, default: [] },
  favorites: { type: mongoose.Schema.Types.Mixed, default: [] },
  updatedAt: { type: Number, default: () => Date.now() },
});

export default mongoose.models.Wardrobe || mongoose.model('Wardrobe', wardrobeSchema);
