import { notFound, redirect } from 'next/navigation'
import { fetchWordPressPostBySlug } from '@/lib/wordpress'
import { entityAllowlist } from '@/lib/entityAllowlist'
import { getCanonicalSlug } from '@/lib/entityCanonical'
import { resolveEntityTagGroup } from '@/lib/entityResolve'
import Header from '@/components/Header'
import ArticleFeed from '@/components/ArticleFeed'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SlugPage({ 
  params, 
  searchParams 
}: { 
  params: { slug: string }
  searchParams?: { debug?: string }
}) {
  const slug = params.slug
  const debug = searchParams?.debug === '1'

  // Server-side logging at the TOP
  console.log('[SlugPage] slug=', slug)
  console.log('[SlugPage] NODE_ENV=', process.env.NODE_ENV)
  console.log('[SlugPage] starting entity resolution')

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
  // Safety check: only treat as entity if in allowlist
  const isInAllowlist = entityAllowlist.includes(slug)
  
  if (isInAllowlist) {
    try {
      console.log('[SlugPage] Slug is in allowlist, resolving entity tag group...')
      
      // Get canonical slug - if this is an alias, redirect to canonical
      const canonicalSlug = getCanonicalSlug(slug)
      if (canonicalSlug !== slug) {
        console.log(`[SlugPage] Redirecting alias ${slug} to canonical ${canonicalSlug}`)
        const redirectUrl = `/${canonicalSlug}${debug ? '?debug=1' : ''}`
        redirect(redirectUrl)
      }
      
      // Resolve entity tag group by name (finds all duplicate tags automatically)
      const tagGroup = await resolveEntityTagGroup(canonicalSlug)
      
      if (tagGroup && tagGroup.tagIds.length > 0) {
        console.log('[SlugPage] Entity tag group resolved:', {
          displayName: tagGroup.displayName,
          tagIds: tagGroup.tagIds,
          slugs: tagGroup.slugs,
        })

        // Build API URL for debug display
        const apiUrl = `/api/articles?tagIds=${tagGroup.tagIds.join(',')}${debug ? '&debug=1' : ''}`

        // Render entity page using the same ArticleFeed component as homepage
        // NO rapper name header - just the feed
        // Pass tagIds array directly (no pinSlug - sorting by date handles it)
        content = (
          <div className="min-h-screen bg-white">
            <Header />
            <main className="pt-16 md:pt-20 bg-white">
              <div className="max-w-4xl mx-auto">
                {debug && (
                  <div style={{
                    border: '2px solid #f59e0b',
                    backgroundColor: '#fef3c7',
                    padding: '12px',
                    marginBottom: '16px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    borderRadius: '4px'
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>🔍 DEBUG MODE</div>
                    <div><strong>entitySlug:</strong> {canonicalSlug}</div>
                    <div><strong>resolvedTagIds:</strong> [{tagGroup.tagIds.join(', ')}] (length: {tagGroup.tagIds.length})</div>
                    <div><strong>API URL:</strong> {apiUrl}</div>
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #d97706' }}>
                      <div><strong>Note:</strong> Articles are sorted by rawDate DESC (newest first)</div>
                      <div><strong>Check API response:</strong> first3 array shows first 3 article slugs after sort</div>
                    </div>
                  </div>
                )}
                <ArticleFeed tagIds={tagGroup.tagIds} />
              </div>
            </main>
          </div>
        )
      } else {
        console.log('[SlugPage] Could not resolve entity tag group, continuing to article check...')
      }
    } catch (error) {
      console.error('[SlugPage] Error resolving entity:', error)
      if (error instanceof Error) {
        console.error('[SlugPage] Error message:', error.message)
        console.error('[SlugPage] Error stack:', error.stack)
      }
      // DO NOT call notFound() - return fallback feed instead
      // This prevents white screen if entity resolution fails
      try {
        // Fallback: try to get at least one tag and show feed
        const { fetchTagBySlug } = await import('@/lib/wordpress')
        const fallbackTag = await fetchTagBySlug(slug)
        if (fallbackTag && fallbackTag.count > 0) {
          console.log('[SlugPage] Using fallback tag:', fallbackTag.id)
          content = (
            <div className="min-h-screen bg-white">
              <Header />
              <main className="pt-16 md:pt-20 bg-white">
                <div className="max-w-4xl mx-auto">
                  <ArticleFeed tagIds={[fallbackTag.id]} />
                </div>
              </main>
            </div>
          )
        }
      } catch (fallbackError) {
        console.error('[SlugPage] Fallback also failed:', fallbackError)
        // Continue to article check
      }
    }
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
