'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    gie?: any
  }
}

interface GettyWidgetEmbedProps {
  anchorHtml: string
  widgetConfig?: {
    id: string
    sig: string
    items: string
    w?: string
    h?: string
  }
}

export default function GettyWidgetEmbed({ anchorHtml, widgetConfig }: GettyWidgetEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const hasLoadedRef = useRef<boolean>(false)
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Reset load flag when anchor/config changes
    hasLoadedRef.current = false

    // Load widgets.js once globally
    if (!document.getElementById('getty-widgets-script')) {
      const s = document.createElement('script')
      s.id = 'getty-widgets-script'
      s.src = 'https://embed-cdn.gettyimages.com/widgets.js'
      s.async = true
      s.onload = () => {
        console.log('GettyWidgetEmbed: widgets.js script loaded')
        // Wait a bit for script to fully initialize
        setTimeout(() => {
          triggerWidgetLoad()
        }, 200)
      }
      document.body.appendChild(s)
      console.log('GettyWidgetEmbed: Loading widgets.js script')
    } else {
      // Script already exists, wait a bit then trigger load
      setTimeout(() => {
        triggerWidgetLoad()
      }, 200)
    }

    // Function to trigger widget load - waits for anchor to be in DOM
    function triggerWidgetLoad() {
      // Prevent multiple calls
      if (hasLoadedRef.current) {
        console.log('GettyWidgetEmbed: Already loaded, skipping')
        return
      }

      const container = containerRef.current
      if (!container) {
        console.log('GettyWidgetEmbed: Container not ready yet')
        return
      }

      // Check if widget is already loaded (iframe exists)
      const existingIframe = container.querySelector('iframe[src*="embed.gettyimages.com"]')
      if (existingIframe) {
        console.log('GettyWidgetEmbed: Widget already loaded (iframe exists)')
        hasLoadedRef.current = true
        return
      }

      // Wait for anchor to be in DOM
      const anchor = container.querySelector('a.gie-single') as HTMLAnchorElement | null
      if (!anchor) {
        console.log('GettyWidgetEmbed: Anchor not found in DOM yet')
        return
      }

      const widgetId = anchor.id
      if (!widgetId) {
        console.log('GettyWidgetEmbed: Anchor has no ID')
        return
      }

      // Verify anchor is still in the DOM and has a parent (not removed by React)
      if (!anchor.parentNode) {
        console.log('GettyWidgetEmbed: Anchor has no parent (removed from DOM)')
        return
      }

      console.log(`GettyWidgetEmbed: Found anchor with ID: ${widgetId}`)

      // Wait for widgets.js to be ready
      if (!window.gie) {
        // Initialize gie queue
        window.gie = window.gie || function(c: any) { (window.gie.q = window.gie.q || []).push(c); }
      }

      // Wait for widgets.load to be available
      const tryLoad = () => {
        // Check again if already loaded
        if (hasLoadedRef.current) {
          return
        }

        // Verify anchor still exists
        const currentAnchor = container.querySelector(`a.gie-single#${widgetId}`) as HTMLAnchorElement | null
        if (!currentAnchor || !currentAnchor.parentNode) {
          console.log('GettyWidgetEmbed: Anchor no longer exists, aborting')
          return
        }

        if (window.gie?.widgets?.load) {
          console.log(`GettyWidgetEmbed: Calling widgets.load() for anchor ${widgetId}`)
          try {
            // Mark as loaded BEFORE calling (to prevent retries)
            hasLoadedRef.current = true

            // If we have widget config with sig, use it (more reliable)
            if (widgetConfig && widgetConfig.sig) {
              console.log(`GettyWidgetEmbed: Using widget config with sig`)
              window.gie.widgets.load({
                id: widgetConfig.id,
                sig: widgetConfig.sig,
                items: widgetConfig.items,
                w: widgetConfig.w || '594px',
                h: widgetConfig.h || '396px',
                caption: false,
                tld: 'com',
                is360: false
              })
            } else {
              // Fallback: call without arguments - widgets.js will scan DOM
              console.log(`GettyWidgetEmbed: Calling widgets.load() without config (will scan DOM)`)
              window.gie.widgets.load()
            }
            console.log('GettyWidgetEmbed: widgets.load() called successfully')
          } catch (error: any) {
            console.error('GettyWidgetEmbed: Error calling widgets.load():', error.message)
            // Reset on error so we can retry
            hasLoadedRef.current = false
          }
        } else {
          console.log('GettyWidgetEmbed: window.gie.widgets.load not ready yet, retrying...')
          loadTimeoutRef.current = setTimeout(tryLoad, 200)
        }
      }

      // Try once after a delay to ensure DOM is stable
      loadTimeoutRef.current = setTimeout(tryLoad, 500)
    }

    return () => {
      // Cleanup timeouts
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current)
        loadTimeoutRef.current = null
      }
    }
  }, [anchorHtml, widgetConfig])

  return (
    <div
      ref={containerRef}
      className="getty-embed-wrap"
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '100%',
        margin: '0 0 16px 0'
      }}
      dangerouslySetInnerHTML={{ __html: anchorHtml }}
    />
  )
}
