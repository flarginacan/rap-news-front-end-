import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import GettyResponsiveFix from './components/GettyResponsiveFix'
import GlobalGettyLoader from './components/GlobalGettyLoader'
import GlobalGettyGuard from './components/GlobalGettyGuard'

export const metadata: Metadata = {
  title: 'RAP NEWS',
  description: 'Latest rap and hip-hop news',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* FRONTEND_DEPLOY_MARKER: PERSON_LINKS_V1 */}
        {/* CRITICAL: Inline script runs IMMEDIATELY before any other scripts */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  // CRITICAL: Protect window.gie IMMEDIATELY before any scripts execute
  if (typeof window !== 'undefined') {
    // Clean window.gie if it's not a function
    if (window.gie && typeof window.gie !== 'function') {
      console.warn('[GettyGuard] window.gie is not a function, cleaning it');
      try { delete window.gie; } catch(e) { window.gie = undefined; }
    }
    
    // Clean window.gie.q if it contains non-functions
    if (window.gie && typeof window.gie === 'function' && window.gie.q && Array.isArray(window.gie.q)) {
      const originalLength = window.gie.q.length;
      window.gie.q = window.gie.q.filter(function(item) { return typeof item === 'function'; });
      if (window.gie.q.length !== originalLength) {
        console.warn('[GettyGuard] Removed ' + (originalLength - window.gie.q.length) + ' non-functions from window.gie.q');
      }
    }
    
    // Install protected queue function
    if (!window.gie || typeof window.gie !== 'function') {
      window.gie = function(c) {
        if (typeof c === 'function') {
          (window.gie.q = window.gie.q || []).push(c);
        } else {
          console.error('[GettyGuard] Blocked attempt to push non-function into window.gie.q:', typeof c, c);
        }
      };
      console.log('[GettyGuard] Installed protected window.gie queue');
    }
  }
})();
            `.trim(),
          }}
        />
        <GlobalGettyGuard />
        <GlobalGettyLoader />
      </head>
      <body className="bg-white">
        {children}
        <GettyResponsiveFix />
        <Analytics />
      </body>
    </html>
  )
}


