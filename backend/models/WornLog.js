import mongoose from 'mongoose';

const wornLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  garmentId: { type: String, default: '' },
  outfitTitle: { type: String, default: '' },
  category: { type: String, default: '' },
  styleTags: [{ type: String }],
  fit: { type: String, default: '' },
  colorTone: { type: String, default: '' },
  occasion: { type: String, default: '' },
  timestamp: { type: Number, default: () => Date.now() },
});

wornLogSchema.index({ userId: 1, timestamp: -1 });

export default mongoose.models.WornLog || mongoose.model('WornLog', wornLogSchema);
