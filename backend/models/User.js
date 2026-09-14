import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  avatarColor: { type: String, default: '#D5E5DA' },
  persona: { type: String, default: 'romantic' },
  role: { type: String, default: 'user' },
  createdAt: { type: Number, default: () => Date.now() },
  lastLoginAt: { type: Number, default: () => Date.now() },
});

export default mongoose.models.User || mongoose.model('User', userSchema);
