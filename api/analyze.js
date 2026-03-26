/**
 * api/analyze.js — Vercel Edge Function
 * Accepts POST { image: base64string } and returns dish identification
 * from Claude's vision API.
 */
export const config = { runtime: 'edge' };

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 512;

const SYSTEM_PROMPT = `You are a Singapore hawker food expert. Analyse this image and identify the Singapore hawker dish shown.
Return ONLY valid JSON:
{
  "dishName": string (canonical English name, e.g. "Char Kway Teow"),
  "confidence": number (0.0–1.0),
  "portionSize": "small" | "standard" | "large",
  "variant": string or null (e.g. "dry", "roasted", "with egg"),
  "notes": string or null
}
If no hawker dish is identifiable, return dishName: null, confidence: 0. No text outside the JSON object.`;

// ── Rate limiter ──────────────────────────────────────────────────────────────
// Simple in-memory Map: ip → { count, windowStart }
// Resets per-IP after WINDOW_MS. Each edge instance holds its own Map.
const rateLimiter = new Map();
const RATE_LIMIT  = 5;
const WINDOW_MS   = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip) {
  const now   = Date.now();
  const entry = rateLimiter.get(ip);

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    // New or expired window — start fresh
    rateLimiter.set(ip, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT) {
    return { allowed: false, resetAt: entry.windowStart + WINDOW_MS };
  }

  entry.count += 1; // mutates in place (same Map reference)
  return { allowed: true };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function detectMediaType(base64) {
  if (base64.startsWith('/9j/'))        return 'image/jpeg';
  if (base64.startsWith('iVBORw0KGgo')) return 'image/png';
  if (base64.startsWith('UklGR'))       return 'image/webp';
  if (base64.startsWith('R0lGOD'))      return 'image/gif';
  return 'image/jpeg';
}

function extractJson(text) {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenceMatch ? fenceMatch[1].trim() : text.trim();
  return JSON.parse(raw);
}

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(request) {
  // ── Method guard ─────────────────────────────────────────────────────────────
  if (request.method !== 'POST') {
    return jsonResponse({ error: true, message: 'Method not allowed' }, 405);
  }

  // ── Rate limit ────────────────────────────────────────────────────────────────
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return jsonResponse(
      {
        error: true,
        rateLimited: true,
        message: '5 free analyses per hour — come back later!',
        resetAt: rl.resetAt,
      },
      429,
      { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) }
    );
  }

  // ── API key guard ─────────────────────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonResponse(
      { error: true, message: 'Server misconfiguration: missing API key' },
      500
    );
  }

  // ── Parse request body ────────────────────────────────────────────────────────
  let image;
  try {
    const body = await request.json();
    image = body?.image;
  } catch {
    return jsonResponse({ error: true, message: 'Invalid JSON body' }, 400);
  }

  if (!image || typeof image !== 'string') {
    return jsonResponse(
      { error: true, message: 'Missing required field: image (base64 string)' },
      400
    );
  }

  const mediaType = detectMediaType(image);

  // ── Call Anthropic Claude vision API ──────────────────────────────────────────
  let anthropicResponse;
  try {
    anthropicResponse = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: image },
              },
              { type: 'text', text: SYSTEM_PROMPT },
            ],
          },
        ],
      }),
    });
  } catch {
    return jsonResponse(
      { error: true, message: 'Failed to reach Anthropic API' },
      502
    );
  }

  if (!anthropicResponse.ok) {
    let detail = '';
    try {
      const errBody = await anthropicResponse.json();
      detail = errBody?.error?.message ?? '';
    } catch { /* ignore */ }
    return jsonResponse(
      { error: true, message: `Anthropic API error ${anthropicResponse.status}${detail ? `: ${detail}` : ''}` },
      502
    );
  }

  // ── Parse Claude's response ───────────────────────────────────────────────────
  let claudeText;
  try {
    const data = await anthropicResponse.json();
    claudeText = data?.content?.[0]?.text ?? '';
  } catch {
    return jsonResponse(
      { error: true, message: 'Malformed response from Anthropic API' },
      502
    );
  }

  let result;
  try {
    result = extractJson(claudeText);
  } catch {
    return jsonResponse(
      { error: true, message: 'Claude returned non-JSON output', raw: claudeText },
      502
    );
  }

  return jsonResponse(result, 200);
}
