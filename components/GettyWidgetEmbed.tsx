'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    gie?: any
  }
}

interface GettyWidgetEmbedProps {
  anchorHtml: string
}

export default function GettyWidgetEmbed({ anchorHtml }: { anchorHtml: string }) {
  useEffect(() => {
    // Load widgets.js once globally
    if (!document.getElementById('getty-widgets-script')) {
      const s = document.createElement('script')
      s.id = 'getty-widgets-script'
      s.src = 'https://embed-cdn.gettyimages.com/widgets.js'
      s.async = true
      document.body.appendChild(s)
      console.log('GettyWidgetEmbed: Loaded widgets.js script')
    }

    // Re-trigger Getty scan AFTER hydration
    const tryLoad = () => {
      if (window.gie?.widgets?.load) {
        console.log('GettyWidgetEmbed: Calling window.gie.widgets.load()')
        window.gie.widgets.load()
      } else {
        console.log('GettyWidgetEmbed: window.gie.widgets.load not ready yet')
      }
    }

    // Run immediately and again shortly after (to handle React hydration timing)
    tryLoad()
    setTimeout(tryLoad, 300)
    setTimeout(tryLoad, 1000)
    setTimeout(tryLoad, 2000)
  }, [])

  return (
    <div
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
