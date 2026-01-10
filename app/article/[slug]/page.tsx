import { notFound } from 'next/navigation'
import Header from '@/components/Header'
import ArticleCard from '@/components/ArticleCard'
import ArticleFeed from '@/components/ArticleFeed'
import { fetchWordPressPostBySlug } from '@/lib/wordpress'

// Enable ISR - pages will revalidate every 60 seconds
export const revalidate = 60

// Optional: Pre-generate some recent posts for faster initial load
// But allow dynamic rendering for new posts via fallback
export async function generateStaticParams() {
  try {
    // Optionally pre-generate the most recent 20 posts
    // This is optional - with revalidate, new posts will still work
    const wpUrl = process.env.WORDPRESS_URL || 'https://tsf.dvj.mybluehost.me'
    const response = await fetch(
      `${wpUrl}/wp-json/wp/v2/posts?per_page=20&orderby=date&order=desc&_fields=slug`,
      {
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
  
  // Fetch from WordPress by slug
  const article = await fetchWordPressPostBySlug(slug)
  
  // Server-side logging
  console.log(`[ArticlePage] Post found: ${article ? 'YES' : 'NO'}`)
  if (article) {
    console.log(`[ArticlePage] Post title: ${article.title}`)
    console.log(`[ArticlePage] Content length: ${article.content.length} chars`)
    console.log(`[ArticlePage] Has href="https://rapnews.com": ${article.content.includes('href="https://rapnews.com"')}`)
  }
  
  if (!article) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="pt-20 md:pt-24 bg-white">
        <div className="max-w-4xl mx-auto">
          <ArticleCard article={article} showLink={false} />
          <ArticleFeed excludeSlug={slug} />
        </div>
      </main>
    </div>
  )
}
