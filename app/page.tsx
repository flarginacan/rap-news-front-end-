import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ArticleFeed from '@/components/ArticleFeed'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Rap News | Latest Hip-Hop News & Breaking Stories',
  description: 'Breaking rap news and hip-hop stories as they happen! Get the latest artist updates, album releases, industry news, and exclusive stories. Stay up to date with your favorite rappers.',
  keywords: ['hip hop news', 'rap news', 'hip-hop news', 'breaking rap news', 'hip hop gossip', 'rap rumors', 'album sales', 'hip hop artists', 'rap music news'],
  openGraph: {
    title: 'Rap News | Latest Hip-Hop News & Breaking Stories',
    description: 'Breaking rap news and hip-hop stories as they happen! Get the latest artist updates, album releases, industry news, and exclusive stories. Stay up to date with your favorite rappers.',
    url: 'https://rapnews.com',
    siteName: 'RAP NEWS',
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
  alternates: {
    canonical: 'https://rapnews.com',
  },
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="pt-16 md:pt-20 bg-white">
        <div className="max-w-4xl mx-auto">
          <ArticleFeed />
        </div>
      </main>
      <Footer />
    </div>
  )
}


