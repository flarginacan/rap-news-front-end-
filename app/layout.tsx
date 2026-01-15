import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import GettyResponsiveFix from './components/GettyResponsiveFix'

export const metadata: Metadata = {
  title: 'RAP NEWS',
  description: 'Latest rap and hip-hop news',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
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
        {/* Getty widgets.js is now loaded client-side via lib/getty.ts ensureGettyReady() */}
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className="bg-white">
        {children}
        <GettyResponsiveFix />
        <Analytics />
      </body>
    </html>
  )
}


