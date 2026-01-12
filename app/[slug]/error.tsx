'use client'

import { useEffect } from 'react'
import Header from '@/components/Header'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[SlugPage Error]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="pt-16 md:pt-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-50 border-2 border-red-500 rounded-lg p-6">
            <h2 className="text-red-800 font-bold text-2xl mb-4">Entity page crashed</h2>
            <p className="text-red-700 mb-2">
              <strong>Error:</strong> {error.message}
            </p>
            {error.digest && (
              <p className="text-red-600 text-sm mb-4">
                <strong>Digest:</strong> {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 font-semibold mt-4"
            >
              Try again
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
