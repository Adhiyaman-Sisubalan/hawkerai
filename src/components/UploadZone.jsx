import { useState, useRef, useCallback } from 'react'
import { imageToBase64 } from '../utils/imageToBase64'
import { matchDish } from '../utils/matchDish'
import nutritionData from '../data/hawker_nutrition.json'
import aliases from '../data/dish_aliases.json'

export default function UploadZone({ onLoading, onResult }) {
  const [preview, setPreview] = useState(null)   // { file, url }
  const [isDragging, setIsDragging] = useState(false)
  const [inputError, setInputError] = useState(null)

  const cameraRef = useRef(null)
  const galleryRef = useRef(null)

  const handleFile = useCallback((file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setInputError('Please choose an image file.')
      return
    }
    setInputError(null)
    // Revoke previous object URL to avoid memory leak
    if (preview?.url) URL.revokeObjectURL(preview.url)
    setPreview({ file, url: URL.createObjectURL(file) })
  }, [preview])

  const handleAnalyse = async () => {
    if (!preview) return
    onLoading(preview.url)

    try {
      const base64 = await imageToBase64(preview.file)

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      })

      const aiData = await res.json()

      // Rate limited
      if (aiData.rateLimited) {
        onResult({ rateLimited: true, resetAt: aiData.resetAt, imageUrl: preview.url })
        return
      }

      if (aiData.error) throw new Error(aiData.message)

      const matched = matchDish(aiData.dishName, nutritionData, aliases)

      onResult({
        ai: aiData,
        nutrition: matched?.dish ?? null,
        matchConfidence: matched?.confidence ?? aiData.confidence ?? 0,
        imageUrl: preview.url,
      })
    } catch (err) {
      // Give a friendly message for network failures
      const msg =
        !navigator.onLine ||
        err.message?.toLowerCase().includes('fetch') ||
        err.message?.toLowerCase().includes('network') ||
        err.message?.toLowerCase().includes('failed to fetch')
          ? 'Something went wrong. Check your connection and try again.'
          : err.message
      onResult({ error: msg, imageUrl: preview.url })
    }
  }

  // ── Drag-and-drop handlers ───────────────────────────────────────────────────
  const onDragOver  = (e) => { e.preventDefault(); setIsDragging(true) }
  const onDragLeave = ()  => setIsDragging(false)
  const onDrop      = (e) => {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div className="space-y-4">

      {/* ── Hidden file inputs ── */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />

      {!preview ? (
        /* ── Drop zone ── */
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={[
            'rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all duration-200',
            isDragging
              ? 'border-amber-400 bg-amber-50 scale-[1.01]'
              : 'border-gray-200 bg-white',
          ].join(' ')}
        >
          <div className="text-5xl mb-4 select-none">📸</div>
          <p className="text-base font-semibold text-gray-800 mb-1">
            Drop your photo here
          </p>
          <p className="text-sm text-gray-400 mb-8">
            Or use the buttons below — works on mobile camera too
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => cameraRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors shadow-sm shadow-amber-200"
            >
              📷 Take Photo
            </button>
            <button
              onClick={() => galleryRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 active:bg-gray-100 text-gray-700 font-semibold py-3 rounded-xl text-sm transition-colors"
            >
              🖼 Gallery
            </button>
          </div>
        </div>
      ) : (
        /* ── Preview ── */
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden bg-gray-100">
            <img
              src={preview.url}
              alt="Selected dish"
              className="w-full object-cover max-h-72"
            />
            {/* Remove button */}
            <button
              onClick={() => setPreview(null)}
              aria-label="Remove photo"
              className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg leading-none transition-colors"
            >
              ×
            </button>
          </div>

          {/* Primary CTA */}
          <button
            onClick={handleAnalyse}
            className="w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold py-4 rounded-xl text-lg tracking-tight transition-colors shadow-md shadow-amber-200"
          >
            Analyse Dish →
          </button>

          {/* Secondary actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => cameraRef.current?.click()}
              className="flex-1 py-2.5 text-sm text-gray-500 hover:text-amber-600 font-medium transition-colors"
            >
              📷 Retake
            </button>
            <div className="w-px bg-gray-200" />
            <button
              onClick={() => galleryRef.current?.click()}
              className="flex-1 py-2.5 text-sm text-gray-500 hover:text-amber-600 font-medium transition-colors"
            >
              🖼 Change photo
            </button>
          </div>
        </div>
      )}

      {inputError && (
        <p className="text-sm text-red-500 text-center">{inputError}</p>
      )}

      {/* Footer hint */}
      <p className="text-center text-xs text-gray-300 pt-2">
        60+ Singapore hawker dishes · HPB nutrition data · Free forever
      </p>
    </div>
  )
}
