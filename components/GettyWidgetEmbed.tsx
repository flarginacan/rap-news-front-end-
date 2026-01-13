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
    // NOTE: GlobalGettyLoader handles loading widgets.js globally, we just ensure the queue exists
    // CRITICAL: Guard against non-functions being pushed
    if (typeof window.gie !== 'function') {
      window.gie = function(c: any) {
        // CRITICAL: Only push functions, never objects or other values
        if (typeof c === 'function') {
          (window.gie.q = window.gie.q || []).push(c)
        } else {
          console.error('GettyWidgetEmbed: Blocked attempt to push non-function into window.gie.q:', typeof c, c)
        }
      }
      console.log('GettyWidgetEmbed: Installed protected queue shim (widgets.js loaded by GlobalGettyLoader)')
    } else {
      // Even if window.gie exists, ensure it has the guard
      const originalGie = window.gie
      window.gie = function(c: any) {
        if (typeof c === 'function') {
          (originalGie.q = originalGie.q || []).push(c)
          originalGie(c) // Call original if it's a function
        } else {
          console.error('GettyWidgetEmbed: Blocked attempt to push non-function into window.gie.q:', typeof c, c)
        }
      }
      // Preserve q if it exists
      if (originalGie.q) {
        window.gie.q = originalGie.q.filter((item: any) => typeof item === 'function')
      }
    }

    // STEP 2: Verify widgets.js is loaded (it should be loaded by GlobalGettyLoader)
    // We don't load it here - GlobalGettyLoader is responsible for that
    if (!document.getElementById('getty-widgets-script-global')) {
      console.warn('GettyWidgetEmbed: GlobalGettyLoader script not found, widgets.js may not be loading')
    } else {
      console.log('GettyWidgetEmbed: widgets.js loaded by GlobalGettyLoader')
      if (window.gie?.widgets?.load) {
        console.log('GettyWidgetEmbed: widgets.js is ready')
      }
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
        console.log(`GettyWidgetEmbed: Queue callback executing for anchor ID: ${anchorId}`)
        console.log(`GettyWidgetEmbed: window.gie type:`, typeof window.gie)
        console.log(`GettyWidgetEmbed: window.gie.widgets:`, window.gie?.widgets)
        
        // Inside the queued function, widgets.js has initialized window.gie.widgets
        if (!window.gie?.widgets?.load) {
          console.error('GettyWidgetEmbed: window.gie.widgets.load not available in queue callback')
          console.error('GettyWidgetEmbed: window.gie =', window.gie)
          console.error('GettyWidgetEmbed: window.gie.q length:', window.gie?.q?.length)
          
          // Retry after a short delay
          setTimeout(() => {
            if (window.gie?.widgets?.load) {
              console.log('GettyWidgetEmbed: Retrying widget load after delay')
              const anchorStillExists = document.getElementById(anchorId)
              console.log(`GettyWidgetEmbed: Anchor still exists:`, !!anchorStillExists)
              
              if (widgetConfig && widgetConfig.id && widgetConfig.items) {
                console.log(`GettyWidgetEmbed: Calling widgets.load with config`)
                try {
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
                  console.log('GettyWidgetEmbed: widgets.load() called successfully')
                } catch (e) {
                  console.error('GettyWidgetEmbed: Error calling widgets.load():', e)
                }
              } else {
                console.log('GettyWidgetEmbed: Calling widgets.load() without config (DOM scan)')
                try {
                  window.gie.widgets.load()
                  console.log('GettyWidgetEmbed: widgets.load() called successfully (DOM scan)')
                } catch (e) {
                  console.error('GettyWidgetEmbed: Error calling widgets.load():', e)
                }
              }
            } else {
              console.error('GettyWidgetEmbed: widgets.load still not available after retry')
            }
          }, 500)
          return
        }

        // Verify anchor still exists before loading
        const anchorStillExists = document.getElementById(anchorId)
        if (!anchorStillExists) {
          console.error(`GettyWidgetEmbed: Anchor ${anchorId} no longer exists in DOM!`)
          return
        }
        console.log(`GettyWidgetEmbed: Anchor ${anchorId} confirmed in DOM`)

        // Prefer config with sig if available, but also work with just id and items
        if (widgetConfig && widgetConfig.id && widgetConfig.items) {
          console.log(`GettyWidgetEmbed: Loading widget with config (id: ${widgetConfig.id}, sig: ${widgetConfig.sig ? widgetConfig.sig.substring(0, 10) + '...' : 'MISSING'}, items: ${widgetConfig.items})`)
          try {
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
            console.log('GettyWidgetEmbed: widgets.load() called with config')
            
            // Check if iframe was created after a delay
            setTimeout(() => {
              const iframe = container.querySelector('iframe[src*="embed.gettyimages.com"]')
              if (iframe) {
                console.log('GettyWidgetEmbed: ✅ Iframe created successfully!')
              } else {
                console.warn('GettyWidgetEmbed: ⚠️ No iframe found after widgets.load() call')
                console.warn('GettyWidgetEmbed: Anchor still exists:', !!document.getElementById(anchorId))
              }
            }, 1000)
          } catch (e) {
            console.error('GettyWidgetEmbed: Error calling widgets.load():', e)
          }
        } else {
          // Fallback: scan DOM for all gie-single anchors
          console.log(`GettyWidgetEmbed: Loading widget via DOM scan (no config or missing fields)`)
          console.log(`GettyWidgetEmbed: widgetConfig =`, widgetConfig)
          try {
            window.gie.widgets.load()
            console.log('GettyWidgetEmbed: widgets.load() called (DOM scan)')
          } catch (e) {
            console.error('GettyWidgetEmbed: Error calling widgets.load():', e)
          }
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
