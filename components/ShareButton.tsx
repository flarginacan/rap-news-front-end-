'use client'

import { useState, useEffect } from 'react'

interface ShareButtonProps {
  articleSlug: string
  articleTitle: string
}

export default function ShareButton({ articleSlug, articleTitle }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [supportsNativeShare, setSupportsNativeShare] = useState(false)

  const articleUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/article/${articleSlug}`
    : `https://rapnews.com/article/${articleSlug}`

  useEffect(() => {
    // Check if Web Share API is supported
    if (typeof navigator !== 'undefined' && 'share' in navigator && typeof navigator.share === 'function') {
      setSupportsNativeShare(true)
    }
  }, [])

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

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: articleTitle,
          text: articleTitle,
          url: articleUrl,
        })
        setShowModal(false)
      } catch (err) {
        // User cancelled or error occurred
        if ((err as Error).name !== 'AbortError') {
          console.error('Error sharing:', err)
        }
      }
    }
  }

  const handleTwitterShare = () => {
    const text = encodeURIComponent(`${articleTitle} - ${articleUrl}`)
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'width=550,height=420')
  }

  const handleFacebookShare = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`, '_blank', 'width=550,height=420')
  }

  const handleInstagramShare = async () => {
    // Instagram doesn't support direct web sharing, so we copy the link
    // Users can paste it in their Instagram app
    try {
      await navigator.clipboard.writeText(articleUrl)
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
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
        }, 2000)
      } catch (e) {
        console.error('Failed to copy:', e)
      }
      document.body.removeChild(textArea)
    }
  }

  const handleRedditShare = () => {
    const title = encodeURIComponent(articleTitle)
    window.open(`https://reddit.com/submit?url=${encodeURIComponent(articleUrl)}&title=${title}`, '_blank', 'width=550,height=420')
  }

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`${articleTitle} ${articleUrl}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
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
            
            {/* Social Media Share Buttons */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Share to:
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {/* Native Share (Mobile) */}
                {supportsNativeShare && (
                  <button
                    onClick={handleNativeShare}
                    className="flex flex-col items-center justify-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    title="Share via device"
                  >
                    <svg className="w-6 h-6 mb-1 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.885 12.938 9 12.482 9 12c0-.482-.115-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    <span className="text-xs text-gray-600">Share</span>
                  </button>
                )}

                {/* Twitter/X */}
                <button
                  onClick={handleTwitterShare}
                  className="flex flex-col items-center justify-center p-3 border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  title="Share on Twitter/X"
                >
                  <svg className="w-6 h-6 mb-1 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  <span className="text-xs text-gray-600">Twitter</span>
                </button>

                {/* Facebook */}
                <button
                  onClick={handleFacebookShare}
                  className="flex flex-col items-center justify-center p-3 border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  title="Share on Facebook"
                >
                  <svg className="w-6 h-6 mb-1 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span className="text-xs text-gray-600">Facebook</span>
                </button>

                {/* Instagram */}
                <button
                  onClick={handleInstagramShare}
                  className="flex flex-col items-center justify-center p-3 border border-gray-300 rounded-lg hover:bg-pink-50 hover:border-pink-300 transition-colors"
                  title="Copy link for Instagram"
                >
                  <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" fill="url(#instagram-gradient)"/>
                    <defs>
                      <linearGradient id="instagram-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f09433" />
                        <stop offset="25%" stopColor="#e6683c" />
                        <stop offset="50%" stopColor="#dc2743" />
                        <stop offset="75%" stopColor="#cc2366" />
                        <stop offset="100%" stopColor="#bc1888" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className="text-xs text-gray-600">Instagram</span>
                </button>

                {/* Reddit */}
                <button
                  onClick={handleRedditShare}
                  className="flex flex-col items-center justify-center p-3 border border-gray-300 rounded-lg hover:bg-orange-50 hover:border-orange-300 transition-colors"
                  title="Share on Reddit"
                >
                  <svg className="w-6 h-6 mb-1 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
                  </svg>
                  <span className="text-xs text-gray-600">Reddit</span>
                </button>

                {/* WhatsApp */}
                <button
                  onClick={handleWhatsAppShare}
                  className="flex flex-col items-center justify-center p-3 border border-gray-300 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors"
                  title="Share on WhatsApp"
                >
                  <svg className="w-6 h-6 mb-1 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  <span className="text-xs text-gray-600">WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Copy Link Section */}
            <div className="mb-4 pt-4 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or copy link:
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
            
            {copied && (
              <p className="text-xs text-green-600 text-center font-medium">
                Link copied to clipboard!
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
