import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  timestamp: { type: Number, default: () => Date.now() },
  type: { type: String, required: true }, // LOGIN | REGISTER | USER_DELETE | WARDROBE_SYNC
  email: { type: String, default: '' },
  userName: { type: String, default: '' },
  browser: { type: String, default: 'Browser' },
  details: { type: String, default: '' },
});

// Keep activity log sorted newest-first; cap at 100 docs
activitySchema.index({ timestamp: -1 });

export default mongoose.models.Activity || mongoose.model('Activity', activitySchema);
