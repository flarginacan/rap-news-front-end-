import { notFound, redirect } from 'next/navigation'
import { fetchTagBySlug, fetchPostsByTagId } from '@/lib/wordpress'
import { fetchWordPressPostBySlug } from '@/lib/wordpress'
import { entityAllowlist } from '@/lib/entityAllowlist'
import Link from 'next/link'
import Header from '@/components/Header'

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
        
        // Fetch posts for this tag (with error handling)
        let posts: any[] = []
        try {
          const result = await fetchPostsByTagId(tag.id, 20)
          posts = result.posts || []
          console.log('[SlugPage POSTS]', posts?.length)
        } catch (error) {
          console.error('[SlugPage] Error fetching posts:', error)
          // Continue with empty posts array - page will still render
          posts = []
        }

        // Render entity page - ALWAYS render something even if posts fail
        content = (
          <div className="min-h-screen bg-white">
            <Header />
            <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', paddingTop: '6rem' }}>
              <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontWeight: 800, color: '#000' }}>
                {tag.name}
              </h1>
              <p style={{ color: '#666', marginBottom: '2rem' }}>
                {posts.length} {posts.length === 1 ? 'article' : 'articles'}
              </p>
              
              {posts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
                  <p>No articles found for this tag yet.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '2rem' }}>
                  {posts.map((post: any) => (
                    <article 
                      key={post.id} 
                      style={{ borderBottom: '1px solid #eee', paddingBottom: '2rem' }}
                    >
                      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#000' }}>
                        <Link 
                          href={`/article/${post.slug}`}
                          style={{ color: '#dc2626', textDecoration: 'none' }}
                        >
                          {post.title?.rendered?.replace(/<[^>]*>/g, '') || post.slug}
                        </Link>
                      </h2>
                      
                      {post.excerpt && (
                        <div 
                          dangerouslySetInnerHTML={{ __html: post.excerpt.rendered }}
                          style={{ color: '#666', marginTop: '0.5rem' }}
                        />
                      )}
                      
                      <p style={{ color: '#999', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                        {new Date(post.date).toLocaleDateString()}
                      </p>
                    </article>
                  ))}
                </div>
              )}
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
    // ERROR-PROOF DEBUG BANNER - ALWAYS RENDERS
    return (
      <main style={{ padding: 24, backgroundColor: '#fff', minHeight: '100vh' }}>
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
        {content}
      </main>
    )
  }

  // Not found
  console.log('[SlugPage] No entity or article found, calling notFound()')
  notFound()
}
