import { useState } from 'react'
import UploadZone from './components/UploadZone'
import LoadingState from './components/LoadingState'
import ResultCard from './components/ResultCard'

export default function App() {
  const [phase, setPhase] = useState('upload')   // 'upload' | 'loading' | 'result'
  const [imageUrl, setImageUrl] = useState(null)
  const [result, setResult] = useState(null)

  function handleLoading(url) {
    setImageUrl(url)
    setPhase('loading')
  }

  function handleResult(data) {
    setResult(data)
    setPhase('result')
  }

  function handleReset() {
    setPhase('upload')
    setImageUrl(null)
    setResult(null)
  }

  // LoadingState goes full-screen — render outside the centred container
  if (phase === 'loading') {
    return <LoadingState imageUrl={imageUrl} />
  }

  return (
    <div className="min-h-screen bg-[#fdfaf4] flex flex-col">

      {/* ── Disclaimer banner ── */}
      <div className="w-full bg-gray-100 border-b border-gray-200 text-center px-4 py-1.5">
        <p className="text-[11px] text-gray-400">
          For reference only. Not medical or dietary advice.
        </p>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 max-w-md w-full mx-auto px-4 pt-8 pb-6">

        {/* ── Header ── */}
        <header className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-1">
            <span className="text-3xl leading-none">🍜</span>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Hawker<span className="text-amber-500">AI</span>
            </h1>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Snap a hawker dish · Get the macros in seconds
          </p>
        </header>

        {/* ── Screens ── */}
        {phase === 'upload' && (
          <UploadZone onLoading={handleLoading} onResult={handleResult} />
        )}
        {phase === 'result' && (
          <ResultCard result={result} onReset={handleReset} />
        )}

      </div>

      {/* ── Footer ── */}
      <footer className="max-w-md w-full mx-auto px-4 pt-4 pb-8 border-t border-gray-100">
        <div className="space-y-2 text-center">
          <p className="text-xs text-gray-400">
            Nutrition data sourced from{' '}
            <span className="font-medium text-gray-500">Singapore HPB</span>
          </p>
          <p className="text-xs text-gray-400">
            📵 Photos are never stored or sent to any server
          </p>
          <p className="text-xs text-gray-400">
            Open source —{' '}
            <a
              href="https://github.com/Adhiyaman-Sisubalan/hawkerai"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-amber-500 transition-colors"
            >
              github.com/Adhiyaman-Sisubalan/hawkerai
            </a>
          </p>
          <p className="text-xs text-gray-300 pt-1">
            Built with ♥ ·{' '}
            <a
              href="https://hawkerai-eight.vercel.app"
              className="hover:text-amber-400 transition-colors"
            >
              hawkerai-eight.vercel.app
            </a>
          </p>
        </div>
      </footer>

    </div>
  )
}
