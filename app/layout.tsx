import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import GettyResponsiveFix from './components/GettyResponsiveFix'
import GlobalGettyLoader from './components/GlobalGettyLoader'

export const metadata: Metadata = {
  title: {
    default: 'Rap News | Latest Hip-Hop News & Breaking Stories',
    template: '%s | RAP NEWS',
  },
  description: 'Breaking rap news and hip-hop stories as they happen! Get the latest artist updates, album releases, industry news, and exclusive stories. Stay up to date with your favorite rappers.',
  keywords: ['hip hop news', 'rap news', 'hip-hop news', 'breaking rap news', 'hip hop gossip', 'rap rumors', 'album sales', 'hip hop artists', 'rap music news'],
  authors: [{ name: 'RAP NEWS' }],
  creator: 'RAP NEWS',
  publisher: 'RAP NEWS',
  metadataBase: new URL('https://rapnews.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://rapnews.com',
    siteName: 'RAP NEWS',
    title: 'Rap News | Latest Hip-Hop News & Breaking Stories',
    description: 'Breaking rap news and hip-hop stories as they happen! Get the latest artist updates, album releases, industry news, and exclusive stories. Stay up to date with your favorite rappers.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'RAP NEWS - Latest Hip-Hop News',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rap News | Latest Hip-Hop News & Breaking Stories',
    description: 'Breaking rap news and hip-hop stories as they happen! Get the latest artist updates, album releases, industry news, and exclusive stories.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
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
        {/* Performance: Preconnect to external domains */}
        <link rel="preconnect" href="https://embed-cdn.gettyimages.com" />
        <link rel="preconnect" href="https://embed.gettyimages.com" />
        <link rel="dns-prefetch" href="https://embed-cdn.gettyimages.com" />
        <link rel="dns-prefetch" href="https://embed.gettyimages.com" />
        <link rel="dns-prefetch" href="https://tsf.dvj.mybluehost.me" />
      </head>
      <body className="bg-white">
        {children}
        <GlobalGettyLoader />
        <GettyResponsiveFix />
        <Analytics />
      </body>
    </html>
  )
}


