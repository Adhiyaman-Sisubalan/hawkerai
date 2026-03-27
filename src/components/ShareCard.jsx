import { useState } from 'react'

const SITE_URL  = 'https://hawkerai-eight.vercel.app'
const CARD_SIZE = 1080   // square canvas — Instagram / WhatsApp standard

// ── Rounded-rectangle helper ──────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// ── Draw text that never overflows a max width (truncates with …) ─────────────
function fillTextClipped(ctx, text, x, y, maxW) {
  let t = text
  while (ctx.measureText(t).width > maxW && t.length > 4) t = t.slice(0, -1)
  if (t !== text) t = t.trimEnd() + '…'
  ctx.fillText(t, x, y)
}

// ── Build the share image on an offscreen canvas ──────────────────────────────
async function buildCanvas(dishName, nutrition, imageDataUrl) {
  const S   = CARD_SIZE
  const PAD = 44
  const GAP = 14

  const canvas = document.createElement('canvas')
  canvas.width  = S
  canvas.height = S
  const ctx = canvas.getContext('2d')

  // ── Background ───────────────────────────────────────────────────────────────
  ctx.fillStyle = '#fdfaf4'
  ctx.fillRect(0, 0, S, S)

  // ── Food photo (top 40 %) ─────────────────────────────────────────────────
  const IMG_H = Math.round(S * 0.40)
  if (imageDataUrl) {
    const img = new Image()
    await new Promise((res) => { img.onload = res; img.onerror = res; img.src = imageDataUrl })
    if (img.naturalWidth) {
      const scale = Math.max(S / img.naturalWidth, IMG_H / img.naturalHeight)
      const sw = img.naturalWidth  * scale
      const sh = img.naturalHeight * scale
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, S, IMG_H)
      ctx.clip()
      ctx.drawImage(img, (S - sw) / 2, 0, sw, sh)
      ctx.restore()
    }
    // Gradient fade at bottom of photo into the background colour
    const grad = ctx.createLinearGradient(0, IMG_H - 100, 0, IMG_H)
    grad.addColorStop(0, 'rgba(253,250,244,0)')
    grad.addColorStop(1, 'rgba(253,250,244,1)')
    ctx.fillStyle = grad
    ctx.fillRect(0, IMG_H - 100, S, 100)
  }

  let y = IMG_H + 28

  // ── Dish name ─────────────────────────────────────────────────────────────
  ctx.fillStyle    = '#111827'
  ctx.font         = `bold 62px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
  ctx.textBaseline = 'top'
  ctx.textAlign    = 'left'
  fillTextClipped(ctx, dishName ?? 'Hawker Dish', PAD, y, S - PAD * 2)
  y += 76

  // Serving size
  if (nutrition?.serving_g) {
    ctx.fillStyle = '#9ca3af'
    ctx.font      = `400 30px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
    ctx.fillText(`Per ${nutrition.serving_g}g serving`, PAD, y)
    y += 46
  }
  y += 18

  if (nutrition) {
    const colW = (S - PAD * 2 - GAP) / 2

    // ── Calories (full-width pill) ──────────────────────────────────────────
    const kcalH = 96
    roundRect(ctx, PAD, y, S - PAD * 2, kcalH, 22)
    ctx.fillStyle   = '#fffbeb'; ctx.fill()
    ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 2; ctx.stroke()

    ctx.textBaseline = 'middle'
    ctx.textAlign    = 'left'
    ctx.fillStyle    = '#92400e'
    ctx.font         = `600 34px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
    ctx.fillText('🔥  Calories', PAD + 22, y + kcalH / 2)

    ctx.textAlign = 'right'
    ctx.font      = `bold 56px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
    ctx.fillStyle = '#d97706'
    const kcalNumW = ctx.measureText(`${nutrition.kcal}`).width
    ctx.fillText(`${nutrition.kcal}`, S - PAD - 70, y + kcalH / 2)

    ctx.font      = `500 28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
    ctx.fillStyle = '#b45309'
    ctx.textAlign = 'left'
    ctx.fillText('kcal', S - PAD - 70 + 8 - kcalNumW + kcalNumW + 8, y + kcalH / 2)

    // simpler: just place "kcal" to the right of the number
    ctx.textAlign = 'right'
    ctx.fillText(' kcal', S - PAD - 22, y + kcalH / 2)

    y += kcalH + GAP

    // ── 2 × 2 macro grid ───────────────────────────────────────────────────
    const macros = [
      { icon: '🍗', label: 'Protein', value: nutrition.protein_g,  unit: 'g',
        bg: '#eff6ff', border: '#bfdbfe', val: '#1d4ed8', lbl: '#93c5fd' },
      { icon: '🍚', label: 'Carbs',   value: nutrition.carbs_g,    unit: 'g',
        bg: '#fefce8', border: '#fef08a', val: '#a16207', lbl: '#fbbf24' },
      { icon: '🥑', label: 'Fat',     value: nutrition.fat_g,      unit: 'g',
        bg: '#fff7ed', border: '#fed7aa', val: '#c2410c', lbl: '#fb923c' },
      { icon: '🧂', label: 'Sodium',  value: nutrition.sodium_mg,  unit: 'mg',
        bg: '#fef2f2', border: '#fecaca', val: '#b91c1c', lbl: '#f87171' },
    ]

    const pillH = 108
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        const m = macros[row * 2 + col]
        const px = PAD + col * (colW + GAP)

        roundRect(ctx, px, y, colW, pillH, 22)
        ctx.fillStyle   = m.bg;     ctx.fill()
        ctx.strokeStyle = m.border; ctx.lineWidth = 2; ctx.stroke()

        // Label
        ctx.textBaseline = 'top'
        ctx.textAlign    = 'left'
        ctx.fillStyle    = m.lbl
        ctx.font         = `600 27px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
        ctx.fillText(`${m.icon}  ${m.label}`, px + 22, y + 18)

        // Value + unit
        ctx.fillStyle = m.val
        ctx.font      = `bold 46px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
        const numStr  = `${m.value}`
        ctx.fillText(numStr, px + 22, y + 52)

        ctx.fillStyle = m.lbl
        ctx.font      = `500 26px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
        const numW    = ctx.measureText(numStr).width
        ctx.fillText(m.unit, px + 22 + numW + 6, y + 62)
      }
      y += pillH + GAP
    }
  }

  // ── Bottom watermark strip ────────────────────────────────────────────────
  const stripH = 64
  const stripY = S - stripH
  ctx.fillStyle = '#1f2937'
  ctx.fillRect(0, stripY, S, stripH)

  ctx.textBaseline = 'middle'
  ctx.fillStyle    = '#f9fafb'
  ctx.font         = `700 28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
  ctx.textAlign    = 'left'
  ctx.fillText('🍜  HawkerAI', PAD, stripY + stripH / 2)

  ctx.textAlign = 'right'
  ctx.fillStyle = '#9ca3af'
  ctx.font      = `400 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
  ctx.fillText(SITE_URL.replace('https://', ''), S - PAD, stripY + stripH / 2)

  return canvas
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ShareCard({ dishName, nutrition, imageDataUrl }) {
  const [sharing, setSharing] = useState(false)
  const [copied,  setCopied]  = useState(false)

  const slug = (dishName ?? 'result')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  // ── Share / Save button ───────────────────────────────────────────────────
  const handleShare = async () => {
    if (sharing) return
    setSharing(true)
    try {
      const canvas = await buildCanvas(dishName, nutrition, imageDataUrl)
      const blob   = await new Promise((res) => canvas.toBlob(res, 'image/png'))
      const file   = new File([blob], `hawkerai-${slug}.png`, { type: 'image/png' })

      const canNativeShare = navigator.canShare?.({ files: [file] })

      if (canNativeShare) {
        // Mobile: opens native share sheet → WhatsApp, Instagram, iMessage …
        await navigator.share({
          files: [file],
          title: `HawkerAI — ${dishName ?? 'Hawker dish'}`,
          text:  `🍜 ${dishName} macros — checked on HawkerAI`,
        })
      } else {
        // Desktop: trigger a PNG download
        const url = URL.createObjectURL(blob)
        const a   = document.createElement('a')
        a.href     = url
        a.download = file.name
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      if (err?.name !== 'AbortError') console.error('[ShareCard]', err)
    } finally {
      setSharing(false)
    }
  }

  // ── Copy result text ──────────────────────────────────────────────────────
  const handleCopy = async () => {
    const lines = [
      `🍜 ${dishName ?? 'Hawker dish'} — via HawkerAI`,
      '',
      nutrition ? [
        `🔥 ${nutrition.kcal} kcal`,
        `🍗 Protein  ${nutrition.protein_g}g`,
        `🍚 Carbs    ${nutrition.carbs_g}g`,
        `🥑 Fat      ${nutrition.fat_g}g`,
        `🧂 Sodium   ${nutrition.sodium_mg}mg`,
        ``,
        `Per ${nutrition.serving_g}g serving · Singapore HPB data`,
      ].join('\n') : '',
      '',
      `Check your hawker macros free → ${SITE_URL}`,
    ].join('\n')

    try {
      await navigator.clipboard.writeText(lines)
    } catch {
      const el = document.createElement('textarea')
      el.value = lines
      el.style.cssText = 'position:fixed;opacity:0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="flex gap-3">

      {/* Share / Save image */}
      <button
        onClick={handleShare}
        disabled={sharing}
        className="flex-1 flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-700 active:bg-gray-800 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors"
      >
        {sharing ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Generating…
          </>
        ) : (
          // Label adapts: mobile shows Share, desktop shows Save
          <span>
            <span className="sm:hidden">📤 Share image</span>
            <span className="hidden sm:inline">💾 Save as Image</span>
          </span>
        )}
      </button>

      {/* Copy result text */}
      <button
        onClick={handleCopy}
        className={[
          'flex-1 flex items-center justify-center gap-2 font-semibold py-3.5 rounded-xl text-sm border transition-all',
          copied
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700',
        ].join(' ')}
      >
        {copied ? '✓ Copied!' : '📋 Copy result'}
      </button>

    </div>
  )
}
