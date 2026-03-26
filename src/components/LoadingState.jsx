import { useState, useEffect } from 'react'

const MESSAGES = [
  'Checking the wok...',
  'Counting the char siew...',
  'Consulting the aunty...',
  'Sniffing the sambal...',
  'Asking the uncle nicely...',
]

export default function LoadingState({ imageUrl }) {
  const [msgIndex, setMsgIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out, swap text, fade in
      setVisible(false)
      setTimeout(() => {
        setMsgIndex((i) => (i + 1) % MESSAGES.length)
        setVisible(true)
      }, 200)
    }, 800)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">

      {/* ── Blurred background image ── */}
      {imageUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center scale-110"
          style={{
            backgroundImage: `url(${imageUrl})`,
            filter: 'blur(18px) brightness(0.45)',
          }}
        />
      )}

      {/* ── Fallback dark fill (if no image) ── */}
      {!imageUrl && <div className="absolute inset-0 bg-gray-900" />}

      {/* ── Warm amber vignette overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 30%, rgba(30,15,0,0.55) 100%)',
        }}
      />

      {/* ── Content ── */}
      <div className="relative z-10 text-center px-6 flex flex-col items-center">

        {/* Pulsing ring stack */}
        <div className="relative w-24 h-24 mb-8 flex items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping" />
          <span className="absolute inset-3 rounded-full bg-amber-400/30 animate-pulse" />
          <span className="absolute inset-6 rounded-full bg-amber-500/50" />
          <span className="text-3xl relative z-10 select-none">🍜</span>
        </div>

        {/* Rotating message */}
        <p
          key={msgIndex}
          className="msg-fade text-white text-xl font-semibold tracking-tight h-8"
        >
          {MESSAGES[msgIndex]}
        </p>

        <p className="text-white/50 text-sm mt-3 font-medium">
          Analysing your dish...
        </p>

        {/* Progress dots */}
        <div className="flex gap-1.5 mt-6">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
