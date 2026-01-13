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

    // Install Getty queue shim ONLY if window.gie doesn't exist or is not a function
    if (typeof window.gie !== 'function') {
      // CRITICAL: window.gie MUST be a function, never an object
      window.gie = function(c: any) {
        (window.gie.q = window.gie.q || []).push(c)
      }
      console.log('GettyWidgetEmbed: Installed queue shim (window.gie is now a function)')
    }

    // Load widgets.js once globally
    if (!document.getElementById('getty-widgets-script')) {
      const s = document.createElement('script')
      s.id = 'getty-widgets-script'
      s.src = 'https://embed-cdn.gettyimages.com/widgets.js'
      s.async = true
      s.onload = () => {
        console.log('GettyWidgetEmbed: widgets.js script loaded')
        // Wait a tick for widgets.js to initialize window.gie.widgets
        setTimeout(() => {
          triggerWidgetLoad()
        }, 100)
      }
      document.body.appendChild(s)
      console.log('GettyWidgetEmbed: Loading widgets.js script')
    } else {
      // Script already exists, wait a tick then trigger load
      setTimeout(() => {
        triggerWidgetLoad()
      }, 100)
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

      // Verify window.gie is still a function (never overwrite it!)
      if (typeof window.gie !== 'function') {
        console.error('GettyWidgetEmbed: CRITICAL - window.gie is not a function! Reinstalling shim...')
        window.gie = function(c: any) {
          (window.gie.q = window.gie.q || []).push(c)
        }
      }

      // Wait for widgets.load to be available, then queue the load call
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

        // Check if widgets.js has initialized window.gie.widgets
        if (window.gie?.widgets?.load) {
          console.log(`GettyWidgetEmbed: Queuing widgets.load() for anchor ${widgetId}`)
          try {
            // Mark as loaded BEFORE queuing (to prevent retries)
            hasLoadedRef.current = true

            // CRITICAL: Always use the queue pattern - never call widgets.load() directly
            // Queue the load call inside window.gie(() => ...)
            window.gie(() => {
              if (widgetConfig && widgetConfig.sig) {
                console.log(`GettyWidgetEmbed: Queued widgets.load() with config (sig: ${widgetConfig.sig.substring(0, 10)}...)`)
                window.gie.widgets.load({
                  id: widgetConfig.id,
                  sig: widgetConfig.sig,
                  items: widgetConfig.items,
                  w: widgetConfig.w || '100%',
                  h: widgetConfig.h || '100%',
                  caption: false,
                  tld: 'com',
                  is360: false
                })
              } else {
                // Fallback: queue a DOM scan (widgets.js will find all gie-single anchors)
                console.log(`GettyWidgetEmbed: Queued widgets.load() without config (will scan DOM)`)
                window.gie.widgets.load()
              }
            })
            console.log('GettyWidgetEmbed: widgets.load() queued successfully')
          } catch (error: any) {
            console.error('GettyWidgetEmbed: Error queuing widgets.load():', error.message)
            // Reset on error so we can retry
            hasLoadedRef.current = false
          }
        } else {
          console.log('GettyWidgetEmbed: window.gie.widgets.load not ready yet, retrying...')
          loadTimeoutRef.current = setTimeout(tryLoad, 200)
        }
      }

      // Wait a tick for anchor to be fully in DOM, then try
      loadTimeoutRef.current = setTimeout(tryLoad, 100)
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
