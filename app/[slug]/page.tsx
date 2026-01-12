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
    const tag = await fetchTagBySlug(slug)
    
    if (tag) {
      // Check if it has rn_is_person meta
      const isPerson = tag.meta?.rn_is_person === true || 
                      tag.meta?.rn_is_person === '1' ||
                      tag.meta?.rn_is_person === 1
      
      if (isPerson) {
        // This is an entity page - fetch posts
        const { posts } = await fetchPostsByTagId(tag.id, 20)
        
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
