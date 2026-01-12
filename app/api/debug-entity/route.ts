import { NextResponse } from 'next/server'
import { fetchTagBySlug, fetchPostsByTagId } from '@/lib/wordpress'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug') || 'future'
  const expectedSlug = searchParams.get('expectedSlug')

  try {
    console.log(`[debug-entity] Testing slug: ${slug}${expectedSlug ? `, expectedSlug: ${expectedSlug}` : ''}`)
    
    // Fetch tag
    const tag = await fetchTagBySlug(slug)
    const tagFound = !!tag
    const tagId = tag?.id || null
    const count = tag?.count || 0
    
    // Build WordPress request URL with all params
    const WORDPRESS_BACKEND_URL = process.env.WORDPRESS_URL || 'https://tsf.dvj.mybluehost.me'
    const wpRequestUrl = tagId
      ? `${WORDPRESS_BACKEND_URL}/wp-json/wp/v2/posts?tags=${tagId}&per_page=10&page=1&orderby=date&order=desc&_fields=id,slug,date,title,tags`
      : null
    
    // Fetch posts if tag exists - use direct fetch to get tags field
    let postsCount = 0
    let firstPostTitle = null
    let newestPostSlug = null
    let newestPostDate = null
    let first10: Array<{ id: number; slug: string; date: string; title: string; tagIdsUsedOnPost: number[] }> = []
    let includesExpectedSlug = false
    
    if (tag && tag.id && wpRequestUrl) {
      try {
        // Use fetchPostsByTagId which already handles the WordPress API call correctly
        const { fetchPostsByTagId } = await import('@/lib/wordpress')
        const result = await fetchPostsByTagId(tag.id, 10, 1)
        const posts = result.posts || []
        postsCount = posts.length
        
        if (posts.length > 0) {
          // Get newest post (should be first due to orderby=date&order=desc)
          const newestPost = posts[0]
          newestPostSlug = newestPost.slug || null
          newestPostDate = newestPost.date || null
          firstPostTitle = newestPost.title?.rendered?.replace(/<[^>]*>/g, '') || null
          
          // Get first 10 posts with their tag IDs
          // Note: fetchPostsByTagId returns posts with _embedded, but tags might be in _embedded['wp:term']
          // For now, we'll fetch tags separately or note that tags field may not be directly available
          first10 = posts.slice(0, 10).map(post => {
            // Try to get tags from post.tags or from _embedded
            let tagIds: number[] = []
            if (Array.isArray(post.tags)) {
              tagIds = post.tags
            } else if (post._embedded?.['wp:term']) {
              // Tags are typically in _embedded['wp:term'][1] (index 0 is categories)
              const allTerms = post._embedded['wp:term'] || []
              const tagTerms = allTerms.flat().filter((t: any) => t?.taxonomy === 'post_tag')
              tagIds = tagTerms.map((t: any) => t.id)
            }
            
            return {
              id: post.id,
              slug: post.slug || '',
              date: post.date || '',
              title: post.title?.rendered?.replace(/<[^>]*>/g, '') || '',
              tagIdsUsedOnPost: tagIds
            }
          })
          
          // Check if expected slug is included
          if (expectedSlug) {
            includesExpectedSlug = first10.some(p => p.slug === expectedSlug)
          }
        }
      } catch (error) {
        console.error('[debug-entity] Error fetching posts:', error)
      }
    }

    return NextResponse.json({
      resolvedSlug: slug,
      tag: tag ? {
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        count: tag.count
      } : null,
      wpRequestUrlUsedForPosts: wpRequestUrl,
      first10,
      newestInWpByTagId: newestPostSlug ? {
        slug: newestPostSlug,
        date: newestPostDate
      } : null,
      includesExpectedSlug: expectedSlug ? includesExpectedSlug : null,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[debug-entity] Error:', error)
    return NextResponse.json(
      {
        slug,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
