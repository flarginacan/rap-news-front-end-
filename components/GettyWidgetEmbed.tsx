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

// Global Set to track loaded widget IDs (prevents duplicate loads across components)
const loadedWidgetIds = new Set<string>()

export default function GettyWidgetEmbed({ anchorHtml, widgetConfig }: GettyWidgetEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const hasEnqueuedRef = useRef<boolean>(false)

  useEffect(() => {
    // Reset enqueue flag when anchor/config changes
    hasEnqueuedRef.current = false

    // STEP 1: Ensure window.gie is a queue function (canonical Getty pattern)
    if (typeof window.gie !== 'function') {
      window.gie = window.gie || function(c: any) {
        (window.gie.q = window.gie.q || []).push(c)
      }
      console.log('GettyWidgetEmbed: Installed queue shim')
    }

    // STEP 2: Load widgets.js once globally in <head>
    if (!document.getElementById('getty-widgets-script')) {
      const s = document.createElement('script')
      s.id = 'getty-widgets-script'
      s.src = 'https://embed-cdn.gettyimages.com/widgets.js'
      s.async = true
      s.charset = 'utf-8'
      document.head.appendChild(s)
      console.log('GettyWidgetEmbed: Loading widgets.js script in <head>')
    }

    // STEP 3: Wait for DOM to be stable, then enqueue load function
    requestAnimationFrame(() => {
      // Wait another frame to ensure anchor is fully rendered
      requestAnimationFrame(() => {
        enqueueWidgetLoad()
      })
    })

    function enqueueWidgetLoad() {
      // Guard: prevent duplicate enqueues
      if (hasEnqueuedRef.current) {
        return
      }

      const container = containerRef.current
      if (!container) {
        console.log('GettyWidgetEmbed: Container not ready')
        return
      }

      // Guard: if iframe already exists, do nothing
      const existingIframe = container.querySelector('iframe[src*="embed.gettyimages.com"]')
      if (existingIframe) {
        console.log('GettyWidgetEmbed: Widget already loaded (iframe exists)')
        hasEnqueuedRef.current = true
        return
      }

      // Guard: anchor must exist and have an id
      const anchor = container.querySelector('a.gie-single') as HTMLAnchorElement | null
      if (!anchor || !anchor.id) {
        console.log('GettyWidgetEmbed: Anchor not found or missing id')
        return
      }

      const anchorId = anchor.id

      // Guard: verify anchor has parent (not removed by React)
      if (!anchor.parentNode) {
        console.log('GettyWidgetEmbed: Anchor has no parent')
        return
      }

      // Guard: check if this widget ID was already loaded
      if (loadedWidgetIds.has(anchorId)) {
        console.log(`GettyWidgetEmbed: Widget ${anchorId} already loaded (tracked)`)
        hasEnqueuedRef.current = true
        return
      }

      // Verify config.id matches anchor.id (critical for proper loading)
      if (widgetConfig && widgetConfig.id !== anchorId) {
        console.warn(`GettyWidgetEmbed: Config ID (${widgetConfig.id}) != Anchor ID (${anchorId}), using anchor ID`)
        // Use anchor ID as source of truth
        widgetConfig = { ...widgetConfig, id: anchorId }
      }

      console.log(`GettyWidgetEmbed: Enqueuing load for anchor ID: ${anchorId}`)

      // Mark as enqueued BEFORE enqueuing (prevents race conditions)
      hasEnqueuedRef.current = true
      loadedWidgetIds.add(anchorId)

      // CRITICAL: Enqueue a FUNCTION (never an object or config directly)
      // This is the canonical Getty pattern
      window.gie(function() {
        // Inside the queued function, widgets.js has initialized window.gie.widgets
        if (!window.gie?.widgets?.load) {
          console.error('GettyWidgetEmbed: window.gie.widgets.load not available in queue callback')
          console.error('GettyWidgetEmbed: window.gie =', typeof window.gie, window.gie)
          // Retry after a short delay
          setTimeout(() => {
            if (window.gie?.widgets?.load) {
              console.log('GettyWidgetEmbed: Retrying widget load after delay')
              if (widgetConfig && widgetConfig.id && widgetConfig.items) {
                window.gie.widgets.load({
                  id: widgetConfig.id,
                  sig: widgetConfig.sig || '',
                  items: widgetConfig.items,
                  w: widgetConfig.w || '594px',
                  h: widgetConfig.h || '396px',
                  caption: false,
                  tld: 'com',
                  is360: false
                })
              } else {
                window.gie.widgets.load()
              }
            }
          }, 500)
          return
        }

        // Prefer config with sig if available, but also work with just id and items
        if (widgetConfig && widgetConfig.id && widgetConfig.items) {
          console.log(`GettyWidgetEmbed: Loading widget with config (id: ${widgetConfig.id}, sig: ${widgetConfig.sig ? widgetConfig.sig.substring(0, 10) + '...' : 'MISSING'}, items: ${widgetConfig.items})`)
          window.gie.widgets.load({
            id: widgetConfig.id,
            sig: widgetConfig.sig || '',
            items: widgetConfig.items,
            w: widgetConfig.w || '594px',
            h: widgetConfig.h || '396px',
            caption: false,
            tld: 'com',
            is360: false
          })
        } else {
          // Fallback: scan DOM for all gie-single anchors
          console.log(`GettyWidgetEmbed: Loading widget via DOM scan (no config or missing fields)`)
          console.log(`GettyWidgetEmbed: widgetConfig =`, widgetConfig)
          window.gie.widgets.load()
        }
      })
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
