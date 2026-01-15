'use client'

import { useState } from 'react'

interface ShareButtonProps {
  articleSlug: string
  articleTitle: string
}

export default function ShareButton({ articleSlug, articleTitle }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const articleUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/article/${articleSlug}`
    : `https://rapnews.com/article/${articleSlug}`

  const handleShareClick = () => {
    setShowModal(true)
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(articleUrl)
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
        setShowModal(false)
      }, 2000)
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = articleUrl
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => {
          setCopied(false)
          setShowModal(false)
        }, 2000)
      } catch (e) {
        console.error('Failed to copy:', e)
      }
      document.body.removeChild(textArea)
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setCopied(false)
  }

  return (
    <>
      <button
        onClick={handleShareClick}
        className="text-red-600 hover:text-red-700 hover:underline cursor-pointer font-medium whitespace-nowrap"
      >
        Share this post
      </button>

      {showModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleCloseModal}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-black">Share this post</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-gray-600 mb-4 text-sm">{articleTitle}</p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Article URL:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={articleUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-700"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={handleCopyLink}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    copied
                      ? 'bg-green-600 text-white'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {copied ? (
                    <>
                      <svg className="w-5 h-5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 text-center">
              {copied ? 'Link copied to clipboard!' : 'Click the copy button to share this article'}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
