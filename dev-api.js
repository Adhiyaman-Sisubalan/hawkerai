/**
 * dev-api.js — lightweight local API server for development
 * Mirrors what the Vercel Edge Function does, without needing Vercel CLI.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node dev-api.js
 *   (or set the key in .env.local and use: node --env-file=.env.local dev-api.js)
 */

import http from 'http'

const PORT = 3000
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-20250514'

const SYSTEM_PROMPT = `You are a Singapore hawker food expert. Analyse this image and identify the Singapore hawker dish shown.
Return ONLY valid JSON:
{
  "dishName": string (canonical English name, e.g. "Char Kway Teow"),
  "confidence": number (0.0–1.0),
  "portionSize": "small" | "standard" | "large",
  "variant": string or null (e.g. "dry", "roasted", "with egg"),
  "notes": string or null
}
If no hawker dish is identifiable, return dishName: null, confidence: 0. No text outside the JSON object.`

function detectMediaType(base64) {
  if (base64.startsWith('/9j/'))         return 'image/jpeg'
  if (base64.startsWith('iVBORw0KGgo')) return 'image/png'
  if (base64.startsWith('UklGR'))        return 'image/webp'
  return 'image/jpeg'
}

function extractJson(text) {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  return JSON.parse(fence ? fence[1].trim() : text.trim())
}

function send(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(payload)
}

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' })
    res.end()
    return
  }

  if (req.url !== '/api/analyze' || req.method !== 'POST') {
    send(res, 404, { error: true, message: 'Not found' })
    return
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    send(res, 500, { error: true, message: 'ANTHROPIC_API_KEY not set' })
    return
  }

  // Read body
  let body = ''
  for await (const chunk of req) body += chunk
  let image
  try {
    image = JSON.parse(body)?.image
  } catch {
    send(res, 400, { error: true, message: 'Invalid JSON body' })
    return
  }
  if (!image) {
    send(res, 400, { error: true, message: 'Missing image field' })
    return
  }

  // Call Anthropic
  let anthropicRes
  try {
    anthropicRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: detectMediaType(image), data: image } },
            { type: 'text', text: SYSTEM_PROMPT },
          ],
        }],
      }),
    })
  } catch {
    send(res, 502, { error: true, message: 'Failed to reach Anthropic API' })
    return
  }

  if (!anthropicRes.ok) {
    const err = await anthropicRes.json().catch(() => ({}))
    send(res, 502, { error: true, message: `Anthropic ${anthropicRes.status}: ${err?.error?.message ?? ''}` })
    return
  }

  const data = await anthropicRes.json()
  const text = data?.content?.[0]?.text ?? ''

  try {
    send(res, 200, extractJson(text))
  } catch {
    send(res, 502, { error: true, message: 'Claude returned non-JSON output', raw: text })
  }
})

server.listen(PORT, () => {
  console.log(`\n  API server ready → http://localhost:${PORT}/api/analyze`)
  console.log(`  Model: ${MODEL}`)
  console.log(`  API key: ${process.env.ANTHROPIC_API_KEY ? '✓ set' : '✗ MISSING — set ANTHROPIC_API_KEY'}\n`)
})
