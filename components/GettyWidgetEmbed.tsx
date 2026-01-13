'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    gie?: any
  }
}

interface GettyWidgetEmbedProps {
  anchorHtml: string
}

export default function GettyWidgetEmbed({ anchorHtml }: { anchorHtml: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load widgets.js once globally
    if (!document.getElementById('getty-widgets-script')) {
      const s = document.createElement('script')
      s.id = 'getty-widgets-script'
      s.src = 'https://embed-cdn.gettyimages.com/widgets.js'
      s.async = true
      s.onload = () => {
        console.log('GettyWidgetEmbed: widgets.js script loaded')
        // Trigger load after script loads
        triggerWidgetLoad()
      }
      document.body.appendChild(s)
      console.log('GettyWidgetEmbed: Loading widgets.js script')
    } else {
      // Script already exists, trigger load
      triggerWidgetLoad()
    }

    // Function to trigger widget load - waits for anchor to be in DOM
    function triggerWidgetLoad() {
      const container = containerRef.current
      if (!container) {
        console.log('GettyWidgetEmbed: Container not ready yet')
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

      console.log(`GettyWidgetEmbed: Found anchor with ID: ${widgetId}`)

      // Wait for widgets.js to be ready
      if (!window.gie) {
        // Initialize gie queue
        window.gie = window.gie || function(c: any) { (window.gie.q = window.gie.q || []).push(c); }
      }

      // Wait for widgets.load to be available
      const tryLoad = () => {
        if (window.gie?.widgets?.load) {
          console.log(`GettyWidgetEmbed: Calling widgets.load() to scan for anchor ${widgetId}`)
          try {
            // Call without arguments - widgets.js will scan DOM for all gie-single anchors
            window.gie.widgets.load()
            console.log('GettyWidgetEmbed: widgets.load() called successfully')
          } catch (error: any) {
            console.error('GettyWidgetEmbed: Error calling widgets.load():', error.message)
          }
        } else {
          console.log('GettyWidgetEmbed: window.gie.widgets.load not ready yet, retrying...')
          setTimeout(tryLoad, 100)
        }
      }

      // Try immediately and with delays
      tryLoad()
      setTimeout(tryLoad, 300)
      setTimeout(tryLoad, 1000)
    }

    // Trigger after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      triggerWidgetLoad()
    }, 100)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [anchorHtml])

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
