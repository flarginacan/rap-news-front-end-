import { notFound, redirect } from 'next/navigation'
import { fetchTagBySlug, fetchPostsByTagId } from '@/lib/wordpress'
import { fetchWordPressPostBySlug } from '@/lib/wordpress'
import Link from 'next/link'
import Header from '@/components/Header'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SlugPage({ params }: { params: { slug: string } }) {
  const slug = params.slug

  // Skip if it's a reserved path
  const reservedPaths = [
    'wp-admin', 'wp-content', 'wp-includes', 'wp-json',
    'feed', 'comments', 'search', 'author', 'category',
    'tag', 'page', 'attachment', 'trackback', 'robots.txt',
    'api', '_next', 'favicon.ico', 'sitemap.xml', 'article', 'person'
  ]
  
  if (reservedPaths.includes(slug)) {
    notFound()
  }

  // Step 1: Check if it's an entity page (tag with rn_is_person=1)
  try {
    console.log(`[SlugPage] Checking slug: ${slug}`)
    const tag = await fetchTagBySlug(slug)
    console.log(`[SlugPage] Tag found:`, tag ? `YES (ID: ${tag.id}, Name: ${tag.name})` : 'NO')
    
    if (tag) {
      console.log(`[SlugPage] Tag found - ID: ${tag.id}, Name: ${tag.name}, Count: ${tag.count}`)
      console.log(`[SlugPage] Tag meta:`, JSON.stringify(tag.meta))
      
      // Check if it has rn_is_person meta
      // WordPress REST API often returns meta as empty array even when it exists
      const metaValue = tag.meta?.rn_is_person ?? 
                       tag['rn_is_person'] ?? 
                       (tag as any)?.meta?.['rn_is_person']
      
      const hasMetaValue = metaValue !== undefined && metaValue !== null
      const isPerson = metaValue === true || 
                      metaValue === '1' ||
                      metaValue === 1 ||
                      String(metaValue).toLowerCase() === 'true'
      
      console.log(`[SlugPage] Meta value:`, metaValue, `(hasMetaValue: ${hasMetaValue})`)
      console.log(`[SlugPage] Is person tag (from meta):`, isPerson)
      
      // WORKAROUND: WordPress REST API doesn't expose term meta properly
      // If tag exists and has posts, and meta is empty/missing, check if it's likely a person tag
      // Known artist slugs that should be entity pages
      const knownArtistSlugs = [
        'drake', 'kendrick-lamar', 'kendrick-lamar-2', 'future', 'big-sean',
        'kanye-west', 'travis-scott', 'j-cole', '21-savage', 'cardi-b',
        'offset', 'post-malone', 'lil-wayne', 'eminem', 'snoop-dogg'
      ]
      
      const isKnownArtist = knownArtistSlugs.includes(slug)
      const hasPosts = tag.count > 0
      
      // Treat as entity page if:
      // 1. Meta says it's a person, OR
      // 2. It's a known artist and has posts (meta not exposed in API)
      const shouldShowEntityPage = isPerson || (isKnownArtist && hasPosts && !hasMetaValue)
      
      console.log(`[SlugPage] Should show entity page:`, shouldShowEntityPage)
      console.log(`[SlugPage] Reasons: isPerson=${isPerson}, isKnownArtist=${isKnownArtist}, hasPosts=${hasPosts}, hasMetaValue=${hasMetaValue}`)
      
      if (shouldShowEntityPage) {
        console.log(`[SlugPage] Fetching posts for tag ID: ${tag.id}`)
        // This is an entity page - fetch posts
        const { posts } = await fetchPostsByTagId(tag.id, 20)
        console.log(`[SlugPage] Posts fetched: ${posts.length}`)
        
        return (
          <div className="min-h-screen bg-white">
            <Header />
            <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', paddingTop: '6rem' }}>
              <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontWeight: 800 }}>
                {tag.name}
              </h1>
              <p style={{ color: '#666', marginBottom: '2rem' }}>
                {posts.length} {posts.length === 1 ? 'article' : 'articles'}
              </p>
              
              {posts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
                  <p>No articles found for {tag.name}.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '2rem' }}>
                  {posts.map((post: any) => (
                    <article 
                      key={post.id} 
                      style={{ borderBottom: '1px solid #eee', paddingBottom: '2rem' }}
                    >
                      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
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
      }
    }
  } catch (error) {
    console.error('[SlugPage] Error checking tag:', error)
    if (error instanceof Error) {
      console.error('[SlugPage] Error message:', error.message)
      console.error('[SlugPage] Error stack:', error.stack)
    }
  }

  // Step 2: Check if it's an article
  try {
    const article = await fetchWordPressPostBySlug(slug)
    if (article) {
      // Redirect to article page
      redirect(`/article/${slug}`)
    }
  } catch (error) {
    console.error('[SlugPage] Error checking article:', error)
  }

  // Step 3: Not found
  notFound()
}
