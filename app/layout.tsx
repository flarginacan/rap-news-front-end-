import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import GettyResponsiveFix from './components/GettyResponsiveFix'
import GlobalGettyLoader from './components/GlobalGettyLoader'

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


