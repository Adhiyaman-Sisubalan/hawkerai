import { useState } from 'react'
import html2canvas from 'html2canvas'

const SITE_URL = 'https://hawkerai-eight.vercel.app'

/** Build a plain-text macro summary suitable for WhatsApp / Telegram / iMessage */
function buildShareText(dishName, nutrition) {
  if (!nutrition) return `🍜 ${dishName ?? 'Hawker dish'}\n\nTry HawkerAI → ${SITE_URL}`

  const lines = [
    `🍜 *${dishName}* — via HawkerAI`,
    ``,
    `🔥 ${nutrition.kcal} kcal`,
    `🍗 Protein  ${nutrition.protein_g}g`,
    `🍚 Carbs    ${nutrition.carbs_g}g`,
    `🥑 Fat      ${nutrition.fat_g}g`,
    `🧂 Sodium   ${nutrition.sodium_mg}mg`,
    ``,
    `Per ${nutrition.serving_g}g serving · Data from Singapore HPB`,
    ``,
    `Check your hawker macros free → ${SITE_URL}`,
  ]
  return lines.join('\n')
}

export default function ShareCard({ targetRef, dishName, nutrition }) {
  const [saving, setSaving]   = useState(false)
  const [copied, setCopied]   = useState(false)

  // ── Save as Image ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!targetRef?.current || saving) return
    setSaving(true)

    try {
      const captured = await html2canvas(targetRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        // Inline images are data URLs — no cross-origin issues
        imageTimeout: 0,
      })

      // Square canvas centred on the capture
      const size = Math.max(captured.width, captured.height)
      const sq   = document.createElement('canvas')
      sq.width   = size
      sq.height  = size
      const ctx  = sq.getContext('2d')

      // White background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size, size)

      // Centre the captured content
      const ox = Math.round((size - captured.width)  / 2)
      const oy = Math.round((size - captured.height) / 2)
      ctx.drawImage(captured, ox, oy)

      // Watermark — semi-transparent text at the bottom
      const pillH  = Math.round(size * 0.055)
      const pillY  = size - pillH - Math.round(size * 0.025)
      const pillPX = Math.round(size * 0.035)
      const fontSize = Math.round(size * 0.022)   // slightly smaller for long URL

      ctx.save()
      ctx.font         = `600 ${fontSize}px system-ui, -apple-system, sans-serif`
      ctx.fillStyle    = 'rgba(0,0,0,0.30)'
      ctx.textBaseline = 'middle'

      ctx.textAlign = 'left'
      ctx.fillText('hawkerai-eight.vercel.app', pillPX, pillY + pillH / 2)

      ctx.textAlign = 'right'
      ctx.fillText('🍜 HawkerAI', size - pillPX, pillY + pillH / 2)
      ctx.restore()

      // Download
      const slug    = (dishName ?? 'result')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      const link      = document.createElement('a')
      link.download   = `hawkerai-${slug}.png`
      link.href       = sq.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('[ShareCard] html2canvas error:', err)
      alert('Could not generate image. Try a screenshot instead.')
    } finally {
      setSaving(false)
    }
  }

  // ── Copy result text ─────────────────────────────────────────────────────────
  const handleCopyResult = async () => {
    const text = buildShareText(dishName, nutrition)
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Fallback for browsers that block clipboard without interaction
      const el = document.createElement('textarea')
      el.value = text
      el.style.position = 'fixed'
      el.style.opacity  = '0'
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
      {/* Save as Image */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex-1 flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-700 active:bg-gray-800 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors"
      >
        {saving ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Saving…
          </>
        ) : (
          '💾 Save as Image'
        )}
      </button>

      {/* Copy result */}
      <button
        onClick={handleCopyResult}
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
