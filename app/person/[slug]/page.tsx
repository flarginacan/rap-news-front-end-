import { notFound } from 'next/navigation'
import Header from '@/components/Header'
import ArticleCard from '@/components/ArticleCard'
import { fetchWordPressPosts } from '@/lib/wordpress'

// Enable ISR - pages will revalidate every 60 seconds
export const revalidate = 60

interface Tag {
  id: number
  name: string
  slug: string
}

export default async function PersonPage({ params }: { params: { slug: string } }) {
  const slug = params.slug
  
  // Server-side logging
  console.log(`[PersonPage] Fetching person feed for slug: ${slug}`)
  
  try {
    // Fetch tag by slug from WordPress
    const wpUrl = 'https://www.rapnews.com'
    const tagResponse = await fetch(
      `${wpUrl}/wp-json/wp/v2/tags?slug=${slug}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'rapnews-server-fetch/1.0',
        },
        next: { revalidate: 60 }
      }
    )
    
    if (!tagResponse.ok) {
      console.log(`[PersonPage] Tag fetch failed: ${tagResponse.status}`)
      notFound()
    }
    
    const tags: Tag[] = await tagResponse.json()
    
    if (!tags || tags.length === 0) {
      console.log(`[PersonPage] Tag not found for slug: ${slug}`)
      notFound()
    }
    
    const tag = tags[0]
    console.log(`[PersonPage] Found tag: ${tag.name} (ID: ${tag.id})`)
    
    // Fetch posts with this tag
    const postsResponse = await fetch(
      `${wpUrl}/wp-json/wp/v2/posts?tags=${tag.id}&per_page=20&page=1&orderby=date&order=desc&_embed=1`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'rapnews-server-fetch/1.0',
        },
        next: { revalidate: 60 }
      }
    )
    
    if (!postsResponse.ok) {
      console.log(`[PersonPage] Posts fetch failed: ${postsResponse.status}`)
      notFound()
    }
    
    const posts = await postsResponse.json()
    console.log(`[PersonPage] Found ${posts.length} posts for ${tag.name}`)
    
    // Convert to Article format
    const { convertWordPressPost } = await import('@/lib/wordpress')
    const articles = await Promise.all(
      posts.map((post: any) => convertWordPressPost(post))
    )
    
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="pt-20 md:pt-24 bg-white">
          <div className="max-w-4xl mx-auto px-4 md:px-6">
            <h1 className="text-3xl md:text-4xl font-bold mb-8 mt-8">
              Articles about {tag.name}
            </h1>
            <div className="space-y-8">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} showLink={true} />
              ))}
            </div>
            {articles.length === 0 && (
              <p className="text-gray-500 text-center py-12">
                No articles found for {tag.name}.
              </p>
            )}
          </div>
        </main>
      </div>
    )
  } catch (error) {
    console.error(`[PersonPage] Error for slug ${slug}:`, error)
    notFound()
  }
}
