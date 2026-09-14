import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

// ── Gemini model configuration ─────────────────────────────────────────────────
// Using gemini-3.6-flash (current supported Google Generative AI model)
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

/**
 * Get the Gemini client. Throws a clear error if the API key is not set.
 */
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Minimal auth gate: require a non-empty Bearer token (session user ID).
 * Full JWT validation is optional — the key security is that the Gemini API
 * key never leaves the server.
 */
function requireAuth(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) {
    return res.status(401).json({ success: false, error: 'Sign in to use Gemini AI.' });
  }
  req.sessionToken = token;
  next();
}

// ── GET /api/gemini/health ─────────────────────────────────────────────────────
// Lightweight ping to check if Gemini is properly configured on the server.
router.get('/health', requireAuth, async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return res.json({ success: false, configured: false, error: 'GEMINI_API_KEY not set on server.' });
    }

    // Quick single-token ping to verify the key is valid
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    await model.generateContent({ contents: [{ role: 'user', parts: [{ text: 'hi' }] }], generationConfig: { maxOutputTokens: 4 } });

    return res.json({ success: true, configured: true, model: GEMINI_MODEL });
  } catch (err) {
    console.error('[Gemini /health]', err.message);
    return res.json({ success: false, configured: false, error: err.message });
  }
});

// ── POST /api/gemini/text ──────────────────────────────────────────────────────
// Text-only generation — used by geminiStylist.ts for outfit generation.
// Body: { prompt: string, maxOutputTokens?: number }
router.post('/text', requireAuth, async (req, res) => {
  try {
    const { prompt, maxOutputTokens = 8192 } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ success: false, error: 'prompt is required.' });
    }

    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        maxOutputTokens,
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    console.log(`[Gemini /text] OK — ${text.length} chars`);
    return res.json({ success: true, text });
  } catch (err) {
    console.error('[Gemini /text]', err.message);
    return res.status(500).json({ success: false, error: err.message || 'Gemini text generation failed.' });
  }
});

// ── POST /api/gemini/vision ────────────────────────────────────────────────────
// Multimodal vision — used by visionEngine.ts to analyze garment images.
// Body: { prompt: string, imageDataUrl: string }
router.post('/vision', requireAuth, async (req, res) => {
  try {
    const { prompt, imageDataUrl } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ success: false, error: 'prompt is required.' });
    }
    if (!imageDataUrl || typeof imageDataUrl !== 'string') {
      return res.status(400).json({ success: false, error: 'imageDataUrl is required.' });
    }

    // Parse the data URL: "data:<mimeType>;base64,<data>"
    const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ success: false, error: 'imageDataUrl must be a valid base64 data URL.' });
    }
    const mimeType = match[1];
    const base64Data = match[2];

    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.4,
        responseMimeType: 'application/json',
      },
    });

    const result = await model.generateContent([
      { inlineData: { mimeType, data: base64Data } },
      { text: prompt },
    ]);
    const text = result.response.text();

    console.log(`[Gemini /vision] OK — ${text.length} chars`);
    return res.json({ success: true, text });
  } catch (err) {
    console.error('[Gemini /vision]', err.message);
    return res.status(500).json({ success: false, error: err.message || 'Gemini vision analysis failed.' });
  }
});

export default router;
