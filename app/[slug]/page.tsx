import { notFound, redirect } from 'next/navigation'
import { fetchTagBySlug } from '@/lib/wordpress'
import { fetchWordPressPostBySlug } from '@/lib/wordpress'
import { entityAllowlist } from '@/lib/entityAllowlist'
import { getCanonicalSlugs, getCanonicalSlug } from '@/lib/entityCanonical'
import Header from '@/components/Header'
import ArticleFeed from '@/components/ArticleFeed'
import ErrorBoundary from '@/components/ErrorBoundary'

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
      // Get canonical slug - if this is an alias, redirect to canonical
      const canonicalSlug = getCanonicalSlug(slug)
      if (canonicalSlug !== slug) {
        console.log(`[SlugPage] Redirecting alias ${slug} to canonical ${canonicalSlug}`)
        redirect(`/${canonicalSlug}`)
      }
      
      // Safety check: only treat as entity if in allowlist (check canonical slug)
      const isInAllowlist = entityAllowlist.includes(canonicalSlug) || entityAllowlist.includes(slug)
      
      if (isInAllowlist) {
        console.log('[SlugPage] Tag is in allowlist, rendering entity page')
        console.log('[SlugPage POSTS] Tag ID:', tag.id, 'Tag Name:', tag.name, 'Tag Slug:', tag.slug)

        // Get canonical slugs for this entity (handles duplicate tags)
        const canonicalSlugs = getCanonicalSlugs(canonicalSlug)
        console.log('[SlugPage] Canonical slugs:', canonicalSlugs)
        
        // Fetch all tags for canonical slugs to get their IDs
        const tagPromises = canonicalSlugs.map(s => fetchTagBySlug(s))
        const allTags = await Promise.all(tagPromises)
        const validTags = allTags.filter(t => t !== null)
        const tagIds = validTags.map(t => t!.id)
        
        console.log('[SlugPage] All tag IDs for entity:', tagIds)
        
        // Use comma-separated tag IDs string for API (WordPress supports comma-separated in tags param)
        // ArticleFeed will pass this to API, which will parse it
        const tagIdForFeed = tagIds.length > 1 ? tagIds.join(',') : (tagIds[0] || tag.id)

        // Render entity page using the same ArticleFeed component as homepage
        // NO rapper name header - just the feed
        // Wrap in error boundary to prevent white screens
        content = (
          <div className="min-h-screen bg-white">
            <Header />
            <main className="pt-16 md:pt-20 bg-white">
              <div className="max-w-4xl mx-auto">
                <ErrorBoundary
                  fallback={
                    <div className="px-4 py-8">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                        <h2 className="text-red-800 font-bold text-xl mb-2">Error loading feed</h2>
                        <p className="text-red-600">There was an error loading articles for {tag.name}.</p>
                        <p className="text-red-600 text-sm mt-2">Tag IDs: {tagIds.join(', ')}</p>
                        <p className="text-red-600 text-sm">Canonical slugs: {canonicalSlugs.join(', ')}</p>
                      </div>
                    </div>
                  }
                >
                  <ArticleFeed tagId={tagIdForFeed} />
                </ErrorBoundary>
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
