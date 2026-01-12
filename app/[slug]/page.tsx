import { notFound, redirect } from 'next/navigation'
import { fetchTagBySlug } from '@/lib/wordpress'
import { fetchWordPressPostBySlug } from '@/lib/wordpress'
import { entityAllowlist } from '@/lib/entityAllowlist'
import Header from '@/components/Header'
import ArticleFeed from '@/components/ArticleFeed'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SlugPage({ params }: { params: { slug: string } }) {
  const slug = params.slug

  // TEMP DEBUG: Prove route is being hit
  console.log('[SlugPage HIT]', slug)

  // A) Reserved paths check
  const reservedPaths = [
    'wp-json', 'wp-admin', 'wp-content', 'wp-includes',
    'feed', 'comments', 'search', 'author', 'category',
    'tag', 'page', 'attachment', 'trackback', 'robots.txt',
    'api', '_next', 'favicon.ico', 'sitemap.xml', 'article'
  ]
  
  if (reservedPaths.includes(slug)) {
    console.log('[SlugPage] Reserved path, calling notFound()')
    notFound()
  }

  // Content to render (will be set below)
  let content: JSX.Element | null = null

  // B) ENTITY FIRST (tag feed)
  try {
    console.log('[SlugPage] Checking for entity page (tag)...')
    const tag = await fetchTagBySlug(slug)
    console.log('[SlugPage TAG]', tag?.id, tag?.slug, tag?.count)

    if (tag && tag.count > 0) {
      // Safety check: only treat as entity if in allowlist
      const isInAllowlist = entityAllowlist.includes(slug)
      
      if (isInAllowlist) {
        console.log('[SlugPage] Tag is in allowlist, rendering entity page')
        console.log('[SlugPage POSTS] Tag ID:', tag.id)

        // Render entity page using the same ArticleFeed component as homepage
        content = (
          <div className="min-h-screen bg-white">
            <Header />
            <main className="pt-16 md:pt-20 bg-white">
              <div className="max-w-4xl mx-auto">
                <h1 className="text-black font-bold text-3xl md:text-4xl lg:text-5xl mb-6 md:mb-8 mt-4 md:mt-6 leading-tight px-4 md:px-6 lg:px-8">
                  {tag.name}
                </h1>
                <ArticleFeed tagId={tag.id} />
              </div>
            </main>
          </div>
        )
      } else {
        console.log('[SlugPage] Tag exists but not in allowlist, continuing to article check...')
      }
    }
  } catch (error) {
    console.error('[SlugPage] Error checking tag:', error)
    if (error instanceof Error) {
      console.error('[SlugPage] Error message:', error.message)
      console.error('[SlugPage] Error stack:', error.stack)
    }
    // Continue to article check even if tag fetch fails
  }

  // C) ARTICLE SECOND
  if (!content) {
    try {
      console.log('[SlugPage] Checking for article...')
      const article = await fetchWordPressPostBySlug(slug)
      console.log('[SlugPage ARTICLE]', !!article)
      
      if (article) {
        console.log('[SlugPage] Article found, redirecting to /article/' + slug)
        redirect(`/article/${slug}`)
      }
    } catch (error) {
      console.error('[SlugPage] Error checking article:', error)
      if (error instanceof Error) {
        console.error('[SlugPage] Error message:', error.message)
        console.error('[SlugPage] Error stack:', error.stack)
      }
    }
  }

  // D) Render or Not Found
  if (content) {
    // Debug banner only in development
    const showDebugBanner = process.env.NODE_ENV !== 'production'
    
    return (
      <main style={{ padding: showDebugBanner ? 24 : 0, backgroundColor: '#fff', minHeight: '100vh' }}>
        {showDebugBanner && (
          <div style={{ 
            border: '2px solid red', 
            padding: 12, 
            marginBottom: 16, 
            fontWeight: 700,
            backgroundColor: '#fff',
            color: '#000'
          }}>
            SlugPage Rendered: {slug}
          </div>
        )}
        {content}
      </main>
    )
  }

  // Not found
  console.log('[SlugPage] No entity or article found, calling notFound()')
  notFound()
}
