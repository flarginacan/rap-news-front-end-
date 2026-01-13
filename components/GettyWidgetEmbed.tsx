'use client'

import { useEffect, useRef } from 'react'
import Script from 'next/script'

interface GettyWidgetEmbedProps {
  widgetId: string
  sig: string
  assetId: string
  w: number
  h: number
}

// Track which widgets have been initialized to avoid double-loads
const initializedWidgets = new Set<string>()

export default function GettyWidgetEmbed({ 
  widgetId, 
  sig, 
  assetId, 
  w, 
  h 
}: GettyWidgetEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)
  const containerId = `getty-embed-${widgetId}`

  useEffect(() => {
    // Debug logging
    console.log('GettyWidgetEmbed mount', { widgetId, assetId, containerId })
    console.log('window.gie exists?', !!(typeof window !== 'undefined' && (window as any).gie))
    console.log('window.gie.widgets?', !!(typeof window !== 'undefined' && (window as any).gie?.widgets))

    // Prevent double initialization
    if (initializedRef.current || initializedWidgets.has(widgetId)) {
      console.log(`GettyWidgetEmbed: Widget ${widgetId} already initialized, skipping`)
      return
    }

    // Wait for widgets.js to load
    const checkAndLoad = () => {
      if (typeof window === 'undefined') return

      const gie = (window as any).gie
      if (!gie) {
        console.log('GettyWidgetEmbed: window.gie not ready yet, retrying...')
        setTimeout(checkAndLoad, 100)
        return
      }

      if (!gie.widgets) {
        console.log('GettyWidgetEmbed: window.gie.widgets not ready yet, retrying...')
        setTimeout(checkAndLoad, 100)
        return
      }

      // Initialize gie queue if needed
      if (!gie.q) {
        gie.q = []
      }

      // Load the widget
      console.log(`GettyWidgetEmbed: Loading widget ${widgetId}...`)
      gie(function() {
        gie.widgets.load({
          id: widgetId,
          sig: sig,
          w: `${w}px`,
          h: `${h}px`,
          items: assetId,
          caption: false,
          tld: 'com',
          is360: false
        })
        console.log(`GettyWidgetEmbed: Widget ${widgetId} load called`)
        
        // Immediately verify iframe is in container
        setTimeout(() => {
          const container = document.getElementById(containerId)
          const iframe = container?.querySelector('iframe[src*="embed.gettyimages.com"]')
          
          console.log(`GettyWidgetEmbed: Container ${containerId} exists?`, !!container)
          console.log(`GettyWidgetEmbed: Iframe in container?`, !!iframe)
          
          if (container && !iframe) {
            // Iframe might be injected elsewhere - find it and move it
            console.log(`GettyWidgetEmbed: Iframe not in container, searching for it...`)
            const allIframes = Array.from(document.querySelectorAll('iframe[src*="embed.gettyimages.com"]')) as HTMLIFrameElement[]
            const matchingIframe = allIframes.find((iframe) => 
              iframe.src.includes(assetId) || iframe.src.includes(`items=${assetId}`)
            )
            
            if (matchingIframe) {
              console.log(`GettyWidgetEmbed: Found iframe outside container, moving it...`)
              const placeholder = container.querySelector(`a#${widgetId}`)
              if (placeholder) {
                // Clone iframe and insert it
                const clonedIframe = matchingIframe.cloneNode(true) as HTMLIFrameElement
                container.insertBefore(clonedIframe, placeholder)
                // Remove original iframe if it's not in our container
                if (!container.contains(matchingIframe)) {
                  matchingIframe.remove()
                }
                console.log(`✅ GettyWidgetEmbed: Iframe moved into container`)
              }
            }
          } else if (container && iframe) {
            console.log(`✅ GettyWidgetEmbed: Iframe correctly in container`)
          }
        }, 500)
      })

      initializedRef.current = true
      initializedWidgets.add(widgetId)
    }

    // Start checking after a short delay to allow script to load
    const timeoutId = setTimeout(checkAndLoad, 200)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [widgetId, sig, assetId, w, h, containerId])

  // Verify anchor exists in DOM after render
  useEffect(() => {
    const container = document.getElementById(containerId)
    if (container) {
      const anchor = container.querySelector(`a#${widgetId}`)
      if (anchor) {
        console.log(`✅ GettyWidgetEmbed: Anchor <a id="${widgetId}"> found in container ${containerId}`)
      } else {
        console.log(`❌ GettyWidgetEmbed: Anchor <a id="${widgetId}"> NOT found in container ${containerId}`)
      }
    } else {
      console.log(`❌ GettyWidgetEmbed: Container ${containerId} not found`)
    }
  }, [widgetId, containerId])

  // Check for iframe after widget loads and ensure it's in the container
  useEffect(() => {
    const checkIframe = () => {
      const container = document.getElementById(containerId)
      if (!container) {
        console.log(`GettyWidgetEmbed: Container ${containerId} not found`)
        return false
      }

      const iframe = container.querySelector('iframe[src*="embed.gettyimages.com"]')
      if (iframe) {
        console.log(`✅ GettyWidgetEmbed: Iframe found in container ${containerId}`)
        const rect = container.getBoundingClientRect()
        console.log(`GettyWidgetEmbed: Container position - y: ${rect.y}, height: ${rect.height}`)
        return true
      }

      // Check if iframe exists elsewhere
      const allIframes = Array.from(document.querySelectorAll('iframe[src*="embed.gettyimages.com"]')) as HTMLIFrameElement[]
      const matchingIframe = allIframes.find((iframe) => 
        iframe.src.includes(assetId) || iframe.src.includes(`items=${assetId}`)
      )

      if (matchingIframe && !container.contains(matchingIframe)) {
        console.log(`⚠️ GettyWidgetEmbed: Iframe found outside container, moving it...`)
        const placeholder = container.querySelector(`a#${widgetId}`)
        if (placeholder) {
          const clonedIframe = matchingIframe.cloneNode(true) as HTMLIFrameElement
          container.insertBefore(clonedIframe, placeholder)
          matchingIframe.remove()
          console.log(`✅ GettyWidgetEmbed: Iframe moved into container`)
          return true
        }
      }

      return false
    }

    // Check immediately
    if (checkIframe()) return

    // Check periodically (widgets.js loads asynchronously)
    const intervalId = setInterval(() => {
      if (checkIframe()) {
        clearInterval(intervalId)
      }
    }, 500)

    // Stop checking after 10 seconds
    setTimeout(() => clearInterval(intervalId), 10000)
  }, [widgetId, containerId, assetId])

  return (
    <div 
      id={containerId}
      className="getty-embed-wrap" 
      style={{ 
        position: 'relative', 
        width: '100%', 
        maxWidth: '100%', 
        margin: '0 0 16px 0',
        outline: '4px solid red',
        background: 'rgba(255,0,0,0.05)'
      }} 
      ref={containerRef}
    >
      <Script 
        id="getty-widgets" 
        src="https://embed-cdn.gettyimages.com/widgets.js" 
        strategy="afterInteractive"
        onLoad={() => {
          console.log('GettyWidgetEmbed: widgets.js script loaded')
        }}
      />
      <a 
        id={widgetId} 
        className="gie-single" 
        href={`https://www.gettyimages.com/detail/${assetId}`} 
        target="_blank" 
        rel="noreferrer"
        style={{
          color: '#a7a7a7',
          textDecoration: 'none',
          fontWeight: 'normal',
          border: 'none',
          display: 'inline-block'
        }}
      >
        Embed from Getty Images
      </a>
    </div>
  )
}
