import { useRef, useState, useEffect } from 'react'
import { findBestMatch } from 'string-similarity'
import nutritionData from '../data/hawker_nutrition.json'
import ShareCard from './ShareCard'

// ── Macro configuration ───────────────────────────────────────────────────────
const MACROS = [
  {
    key: 'kcal',
    label: 'Calories',
    unit: 'kcal',
    icon: '🔥',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    valueColor: 'text-amber-700',
    labelColor: 'text-amber-500',
    fullWidth: true,
  },
  {
    key: 'protein_g',
    label: 'Protein',
    unit: 'g',
    icon: '🍗',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    valueColor: 'text-blue-700',
    labelColor: 'text-blue-400',
  },
  {
    key: 'carbs_g',
    label: 'Carbs',
    unit: 'g',
    icon: '🍚',
    bg: 'bg-yellow-50',
    border: 'border-yellow-100',
    valueColor: 'text-yellow-700',
    labelColor: 'text-yellow-500',
  },
  {
    key: 'fat_g',
    label: 'Fat',
    unit: 'g',
    icon: '🥑',
    bg: 'bg-orange-50',
    border: 'border-orange-100',
    valueColor: 'text-orange-700',
    labelColor: 'text-orange-400',
  },
  {
    key: 'sodium_mg',
    label: 'Sodium',
    unit: 'mg',
    icon: '🧂',
    bg: 'bg-red-50',
    border: 'border-red-100',
    valueColor: 'text-red-700',
    labelColor: 'text-red-400',
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function ConfidenceBadge({ confidence }) {
  const pct = Math.round(confidence * 100)
  const [bg, text] =
    confidence > 0.8
      ? ['bg-green-100', 'text-green-700']
      : confidence >= 0.5
      ? ['bg-amber-100', 'text-amber-700']
      : ['bg-red-100', 'text-red-600']
  const dot =
    confidence > 0.8 ? 'bg-green-500' : confidence >= 0.5 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${bg} ${text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {pct}% match
    </span>
  )
}

function MacroPill({ macro, value }) {
  return (
    <div
      className={[
        'rounded-xl border px-4 py-3',
        macro.bg,
        macro.border,
        macro.fullWidth ? 'col-span-2 flex items-center justify-between' : '',
      ].join(' ')}
    >
      {macro.fullWidth ? (
        <>
          <div className="flex items-center gap-2">
            <span className="text-lg">{macro.icon}</span>
            <span className={`text-sm font-semibold uppercase tracking-wide ${macro.labelColor}`}>
              {macro.label}
            </span>
          </div>
          <div className={`text-3xl font-bold tabular-nums ${macro.valueColor}`}>
            {value}
            <span className="text-sm font-normal ml-1 opacity-70">{macro.unit}</span>
          </div>
        </>
      ) : (
        <>
          <div className={`text-xs font-semibold uppercase tracking-wide mb-1.5 ${macro.labelColor}`}>
            {macro.icon} {macro.label}
          </div>
          <div className={`text-2xl font-bold tabular-nums ${macro.valueColor}`}>
            {value}
            <span className="text-xs font-normal ml-0.5 opacity-70">{macro.unit}</span>
          </div>
        </>
      )}
    </div>
  )
}

/** Counts down to a target Unix timestamp (ms). Returns seconds remaining. */
function useCountdown(targetMs) {
  const [secsLeft, setSecsLeft] = useState(() =>
    Math.max(0, Math.ceil((targetMs - Date.now()) / 1000))
  )
  useEffect(() => {
    if (!targetMs) return
    const t = setInterval(() => {
      const left = Math.max(0, Math.ceil((targetMs - Date.now()) / 1000))
      setSecsLeft(left)
      if (left === 0) clearInterval(t)
    }, 1000)
    return () => clearInterval(t)
  }, [targetMs])
  return secsLeft
}

// ── Special screens ───────────────────────────────────────────────────────────
function ErrorScreen({ message, onReset }) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
        <div className="text-5xl mb-4">😕</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-gray-500 text-sm leading-relaxed">{message}</p>
      </div>
      <button
        onClick={onReset}
        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 rounded-xl transition-colors"
      >
        Try again
      </button>
    </div>
  )
}

function RateLimitScreen({ resetAt, onReset }) {
  const secsLeft = useCountdown(resetAt)
  const mins = Math.floor(secsLeft / 60)
  const secs = secsLeft % 60
  const timeStr = secsLeft > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : '—'

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
        <div className="text-5xl mb-4">⏱</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          5 free analyses per hour
        </h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-5">
          Come back later — you're making good use of HawkerAI!
        </p>
        {secsLeft > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-5 py-4 inline-block">
            <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-1">
              Resets in
            </p>
            <p className="text-3xl font-bold tabular-nums text-amber-700">{timeStr}</p>
          </div>
        )}
        {secsLeft === 0 && (
          <p className="text-green-600 font-semibold text-sm">
            You're good to go — try again!
          </p>
        )}
      </div>
      <button
        onClick={onReset}
        className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold py-3.5 rounded-xl text-sm transition-colors"
      >
        ← Go back
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ResultCard({ result, onReset }) {
  const cardRef = useRef(null)
  const [nutrition, setNutrition] = useState(result.nutrition)
  const [correction, setCorrection] = useState('')
  const [correctionError, setCorrectionError] = useState(null)

  const { ai, imageUrl, error, rateLimited, resetAt } = result

  // ── Special states ────────────────────────────────────────────────────────────
  if (rateLimited) return <RateLimitScreen resetAt={resetAt} onReset={onReset} />
  if (error)       return <ErrorScreen message={error} onReset={onReset} />

  // ── Correction handler ────────────────────────────────────────────────────────
  const handleCorrection = (e) => {
    e.preventDefault()
    if (!correction.trim()) return
    const names = nutritionData.map((d) => d.name)
    const { bestMatch } = findBestMatch(correction.trim(), names)
    if (bestMatch.rating > 0.2) {
      setNutrition(nutritionData.find((d) => d.name === bestMatch.target))
      setCorrectionError(null)
      setCorrection('')
    } else {
      setCorrectionError(`Couldn't find "${correction}" — try a different spelling.`)
    }
  }

  const isUnidentified    = ai?.dishName === null
  const displayName       = nutrition?.name ?? ai?.dishName ?? 'Unknown dish'
  const confidence        = result.matchConfidence ?? ai?.confidence ?? 0
  const isLowConfidence   = !isUnidentified && confidence < 0.6
  const portionAndVariant = [ai?.variant, ai?.portionSize].filter(Boolean).join(' · ')

  return (
    <div className="space-y-4">

      {/* ── Unidentified dish banner ── */}
      {isUnidentified && (
        <div className="bg-white rounded-2xl px-5 py-5 shadow-sm border-l-4 border-amber-400">
          <p className="font-semibold text-gray-800 mb-1">Dish not recognised</p>
          <p className="text-sm text-gray-500 leading-relaxed">
            We couldn't identify this dish. Type the name below to look it up manually.
          </p>
        </div>
      )}

      {/* ── Low confidence warning ── */}
      {isLowConfidence && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <span className="text-lg leading-none mt-0.5">⚠️</span>
          <p className="text-sm text-amber-800 font-medium">
            Low confidence — does this look right? Correct the dish name below if not.
          </p>
        </div>
      )}

      {/* ── Captured area: food image + result card ── */}
      {!isUnidentified && (
        <div ref={cardRef} className="rounded-2xl overflow-hidden shadow-sm">

          {/* Food photo */}
          {imageUrl && (
            <div className="h-48 bg-gray-100 overflow-hidden">
              <img src={imageUrl} alt="Your dish" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="bg-white">
            {/* ── Dish name + confidence ── */}
            <div className="px-5 pt-5 pb-4 border-b border-gray-50">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-2xl font-bold text-gray-900 leading-snug">
                    {displayName}
                  </h2>
                  {portionAndVariant && (
                    <p className="text-sm text-gray-400 mt-0.5 capitalize">
                      {portionAndVariant}
                    </p>
                  )}
                </div>
                <ConfidenceBadge confidence={confidence} />
              </div>
              {nutrition?.serving_g && (
                <p className="text-xs text-gray-300 mt-2">Per {nutrition.serving_g}g serving</p>
              )}
            </div>

            {/* ── Macros ── */}
            {nutrition ? (
              <div className="p-4">
                <div className="grid grid-cols-2 gap-2">
                  {MACROS.map((m) => (
                    <MacroPill key={m.key} macro={m} value={nutrition[m.key]} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-5 py-6 text-center">
                <p className="text-gray-400 text-sm">
                  No nutrition data — try correcting the dish name below.
                </p>
              </div>
            )}

            {/* ── Smart tip ── */}
            {nutrition?.tip && (
              <div className="mx-4 mb-4 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3.5">
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-1">
                  💡 Smart tip
                </p>
                <p className="text-sm text-amber-900 leading-relaxed">{nutrition.tip}</p>
              </div>
            )}

            {/* ── Watermark strip ── */}
            <div className="px-5 py-2.5 border-t border-gray-50 flex items-center justify-between">
              <span className="text-[11px] text-gray-300 font-medium">hawkerai-eight.vercel.app</span>
              <span className="text-[11px] text-gray-300 font-semibold tracking-tight">
                🍜 HawkerAI
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Correction form ── */}
      <form
        onSubmit={handleCorrection}
        className="bg-white rounded-2xl px-5 py-4 shadow-sm"
      >
        <p className="text-sm font-semibold text-gray-700 mb-3">
          {isUnidentified ? 'Type the dish name to look it up' : 'Not right? Correct it'}
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={correction}
            onChange={(e) => { setCorrection(e.target.value); setCorrectionError(null) }}
            placeholder="e.g. Laksa, Char Kway Teow…"
            autoFocus={isUnidentified}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all placeholder-gray-300"
          />
          <button
            type="submit"
            className="bg-gray-900 hover:bg-gray-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shrink-0"
          >
            {isUnidentified ? 'Look up' : 'Update'}
          </button>
        </div>
        {correctionError && (
          <p className="mt-2 text-xs text-red-500">{correctionError}</p>
        )}
      </form>

      {/* ── Share + Reset ── */}
      {!isUnidentified && (
        <ShareCard
          dishName={displayName}
          nutrition={nutrition}
          imageDataUrl={imageUrl}
        />
      )}

      <button
        onClick={onReset}
        className="w-full bg-white border border-gray-200 hover:bg-gray-50 active:bg-gray-100 text-gray-600 font-semibold py-3.5 rounded-xl text-sm transition-colors"
      >
        ↩ Analyse another dish
      </button>

    </div>
  )
}
