import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

let isConnected = false;

export async function connectDB() {
  if (isConnected) return;

  if (!MONGODB_URI) {
    console.warn('\x1b[33m[MONGODB] ⚠️  No MONGODB_URI set in .env — running without MongoDB (JSON file mode)\x1b[0m');
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: 'Pehno',
    });
    isConnected = true;
    console.log('\x1b[32m[MONGODB] ✅ Connected to MongoDB Atlas\x1b[0m');
  } catch (err) {
    console.error('\x1b[31m[MONGODB] ❌ Connection failed:\x1b[0m', err.message);
    console.warn('\x1b[33m[MONGODB] ⚠️  Falling back to JSON file storage\x1b[0m');
    // Don't exit — keep server running with JSON fallback
  }
}

export function isMongoConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

export default mongoose;
