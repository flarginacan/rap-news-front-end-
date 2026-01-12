'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'

/**
 * Client component that intercepts clicks on entity links (.rn-entity-link)
 * and ensures the from= parameter is always set to the current article slug.
 * This guarantees from always matches the article slug the user is on.
 */
export default function EntityLinkInterceptor() {
  const params = useParams()
  const currentSlug = params?.slug as string | undefined

  useEffect(() => {
    if (!currentSlug) return

    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a.rn-entity-link') as HTMLAnchorElement | null
      
      if (!link) return

      try {
        const url = new URL(link.href, window.location.origin)
        // Always set from to current article slug
        url.searchParams.set('from', currentSlug)
        link.href = url.pathname + url.search
      } catch (error) {
        console.error('[EntityLinkInterceptor] Error updating link:', error)
      }
    }

    // Use capture phase to intercept before navigation
    document.addEventListener('click', handler, true)
    
    return () => {
      document.removeEventListener('click', handler, true)
    }
  }, [currentSlug])

  return null // This component doesn't render anything
}
