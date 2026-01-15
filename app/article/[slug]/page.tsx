import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ArticleCard from '@/components/ArticleCard'
import ArticleFeed from '@/components/ArticleFeed'
import { fetchWordPressPostBySlug } from '@/lib/wordpress'

// Enable ISR - pages will revalidate every 60 seconds
export const revalidate = 60

// Generate dynamic SEO metadata for each article
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const article = await fetchWordPressPostBySlug(params.slug)
  
  if (!article) {
    return {
      title: 'Article Not Found',
    }
  }

  // Strip HTML from title
  const cleanTitle = article.title.replace(/<[^>]*>/g, '').trim()
  
  // Create SEO-optimized title (max 60 chars for best results)
  const seoTitle = cleanTitle.length > 60 
    ? `${cleanTitle.substring(0, 57)}... | RAP NEWS`
    : `${cleanTitle} | RAP NEWS`

  // Generate meta description from article content or excerpt
  // Strip HTML and get first 155 characters
  const plainText = article.content
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 155)
  
  const metaDescription = plainText.endsWith('.') 
    ? plainText 
    : `${plainText}...`

  // Get article image
  const imageUrl = article.image || 'https://rapnews.com/og-image.jpg'
  
  // Extract keywords from title and category
  const keywords = [
    'hip hop news',
    'rap news',
    cleanTitle.toLowerCase(),
    article.category.toLowerCase(),
  ].filter(Boolean)

  return {
    title: seoTitle,
    description: metaDescription,
    keywords,
    authors: [{ name: 'RAP NEWS' }],
    openGraph: {
      type: 'article',
      title: cleanTitle,
      description: metaDescription,
      url: `https://rapnews.com/article/${params.slug}`,
      siteName: 'RAP NEWS',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: cleanTitle,
        },
      ],
      publishedTime: article.rawDate || new Date().toISOString(),
    },
    twitter: {
      card: 'summary_large_image',
      title: cleanTitle,
      description: metaDescription,
      images: [imageUrl],
    },
    alternates: {
      canonical: `https://rapnews.com/article/${params.slug}`,
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
  }
}

// Optional: Pre-generate some recent posts for faster initial load
// But allow dynamic rendering for new posts via fallback
export async function generateStaticParams() {
  try {
    // Optionally pre-generate the most recent 20 posts
    // This is optional - with revalidate, new posts will still work
    // Use direct Bluehost URL to bypass Vercel Security Checkpoint
    const WORDPRESS_API_URL = process.env.WORDPRESS_URL 
      ? `${process.env.WORDPRESS_URL}/wp-json/wp/v2`
      : 'https://tsf.dvj.mybluehost.me/wp-json/wp/v2'
    
    const response = await fetch(
      `${WORDPRESS_API_URL}/posts?per_page=20&orderby=date&order=desc&_fields=slug`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'rapnews-server-fetch/1.0',
        },
        next: { revalidate: 60 }
      }
    )
    
    if (!response.ok) {
      console.log('[ArticlePage] Could not fetch posts for static params, will use dynamic rendering')
      return []
    }
    
    const posts = await response.json()
    return posts.map((post: { slug: string }) => ({
      slug: post.slug,
    }))
  } catch (error) {
    console.error('[ArticlePage] Error generating static params:', error)
    // Return empty array to allow dynamic rendering
    return []
  }
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const slug = params.slug
  
    // Server-side logging
    console.log(`[ArticlePage] Fetching article with slug: ${slug}`)
    
    try {
      // Fetch from WordPress by slug with error handling
      const article = await fetchWordPressPostBySlug(slug)
      
      // Server-side logging
      console.log(`[ArticlePage] Post found: ${article ? 'YES' : 'NO'}`)
      if (article) {
        console.log(`[ArticlePage] Post title: ${article.title}`)
        console.log(`[ArticlePage] Content length: ${article.content.length} chars`)
        console.log(`[ArticlePage] Has href="https://rapnews.com": ${article.content.includes('href="https://rapnews.com"')}`)
        console.log(`[ArticlePage] Has canonical CTA: ${article.content.includes('Be sure to stay updated') && article.content.includes('href="https://rapnews.com"')}`)
        console.log(`[ArticlePage] Has person-link: ${article.content.includes('person-link')}`)
        console.log(`[ArticlePage] Has /person/ links: ${article.content.includes('/person/')}`)
        console.log(`[ArticlePage] 🔍 DEBUG: Content preview (first 500 chars):`, article.content.substring(0, 500))
        console.log(`[ArticlePage] 🔍 DEBUG: Person-link count in content:`, (article.content.match(/person-link/g) || []).length)
      }
    
    // If no article found, show 404 page (not white screen)
    if (!article) {
      console.log(`[ArticlePage] Article not found for slug: ${slug}, showing 404`)
      notFound()
    }

    // Extract people from content for debug UI
    const peopleMatches = article.content.match(/class="person-link"[^>]*>([^<]+)<\/a>/g) || []
    const peopleNames = peopleMatches.map(m => {
      const match = m.match(/>([^<]+)</)
      return match ? match[1] : ''
    }).filter(Boolean)
    
    // Extract tag info from content (we'll get this from the article object if available)
    const hasPersonLinks = article.content.includes('person-link')
    const personLinkCount = (article.content.match(/class="person-link"/g) || []).length

    // Generate structured data (JSON-LD) for SEO
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: article.title.replace(/<[^>]*>/g, ''),
      description: article.content.replace(/<[^>]*>/g, ' ').substring(0, 200),
      image: article.image || 'https://rapnews.com/og-image.jpg',
      datePublished: article.rawDate || new Date().toISOString(),
      dateModified: article.rawDate || new Date().toISOString(),
      author: {
        '@type': 'Organization',
        name: 'RAP NEWS',
      },
      publisher: {
        '@type': 'Organization',
        name: 'RAP NEWS',
        logo: {
          '@type': 'ImageObject',
          url: 'https://rapnews.com/favicon-96x96.png',
        },
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `https://rapnews.com/article/${article.slug}`,
      },
    }

    return (
      <div className="bg-white min-h-screen flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <Header />
        <main className="pt-16 md:pt-24 bg-white flex-grow">
          <div className="max-w-4xl mx-auto">
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 mb-4 rounded text-sm">
                <div className="font-bold mb-2">🔍 DEBUG INFO (Development only):</div>
                <div><strong>Slug:</strong> {slug}</div>
                <div><strong>People found in content:</strong> {peopleNames.length > 0 ? peopleNames.join(', ') : 'None'}</div>
                <div><strong>Person links in HTML:</strong> {personLinkCount}</div>
                <div><strong>Transform applied:</strong> {hasPersonLinks ? 'YES ✅' : 'NO ❌'}</div>
                <div><strong>Content preview (first 200 chars):</strong></div>
                <pre className="bg-white p-2 mt-1 text-xs overflow-auto max-h-32 border">
                  {article.content.substring(0, 200).replace(/</g, '&lt;').replace(/>/g, '&gt;')}
                </pre>
                <div className="mt-2"><strong>Debug checks:</strong></div>
                <div>Has &lt;iframe: {article.content.includes('<iframe') ? 'YES ✅' : 'NO ❌'}</div>
                <div>Has &lt;div class="getty-embed-wrap": {article.content.includes('<div class="getty-embed-wrap') || article.content.includes("<div class='getty-embed-wrap") ? 'YES ✅' : 'NO ❌'}</div>
                <div>Has &amp;lt;iframe (escaped): {article.content.includes('&lt;iframe') ? 'YES ❌ (BAD - HTML is escaped!)' : 'NO ✅'}</div>
                <div>Has &amp;lt;div (escaped): {article.content.includes('&lt;div') ? 'YES ❌ (BAD - HTML is escaped!)' : 'NO ✅'}</div>
              </div>
            )}
            <ArticleCard article={article} showLink={false} />
            <ArticleFeed excludeSlug={slug} />
          </div>
        </main>
        <Footer />
      </div>
    )
  } catch (err) {
    console.error('[ArticlePage] fatal error', { slug, err })
    notFound()
  }
}
