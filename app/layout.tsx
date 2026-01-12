import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import GettyResponsiveFix from './components/GettyResponsiveFix'
import GettyWidgetsLoader from './components/GettyWidgetsLoader'

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
      </head>
      <body className="bg-white">
        {children}
        <GettyResponsiveFix />
        <GettyWidgetsLoader />
        <Analytics />
      </body>
    </html>
  )
}


