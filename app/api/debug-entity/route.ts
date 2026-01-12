import { NextResponse } from 'next/server'
import { fetchTagBySlug, fetchPostsByTagId } from '@/lib/wordpress'
import { getCanonicalSlugs } from '@/lib/entityCanonical'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug') || 'future'
  const expectedPostSlug = searchParams.get('expectedPostSlug')

  try {
    console.log(`[debug-entity] Testing slug: ${slug}${expectedPostSlug ? `, expectedPostSlug: ${expectedPostSlug}` : ''}`)
    
    // Get canonical slugs for this entity
    const resolvedCanonicalSlugs = getCanonicalSlugs(slug)
    console.log(`[debug-entity] Canonical slugs:`, resolvedCanonicalSlugs)
    
    // Fetch all tags for canonical slugs
    const tagPromises = resolvedCanonicalSlugs.map(s => fetchTagBySlug(s))
    const allTags = await Promise.all(tagPromises)
    const validTags = allTags.filter(t => t !== null)
    const resolvedTagIds = validTags.map(t => t!.id)
    
    console.log(`[debug-entity] Resolved tag IDs:`, resolvedTagIds)
    
    // Build WordPress request URL with all params
    const WORDPRESS_BACKEND_URL = process.env.WORDPRESS_URL || 'https://tsf.dvj.mybluehost.me'
    const tagIdsParam = resolvedTagIds.join(',')
    const wpPostsUrlUsed = resolvedTagIds.length > 0
      ? `${WORDPRESS_BACKEND_URL}/wp-json/wp/v2/posts?tags=${tagIdsParam}&per_page=20&page=1&orderby=date&order=desc&_fields=id,slug,date,title,tags`
      : null
    
    // Fetch expected post if provided
    let expectedPost: any = null
    if (expectedPostSlug) {
      try {
        const expectedPostUrl = `${WORDPRESS_BACKEND_URL}/wp-json/wp/v2/posts?slug=${encodeURIComponent(expectedPostSlug)}&_fields=id,slug,date,title,tags`
        const expectedRes = await fetch(expectedPostUrl, {
          headers: { Accept: 'application/json', 'User-Agent': 'rapnews-server-fetch/1.0' },
          cache: 'no-store',
        })
        if (expectedRes.ok) {
          const expectedPosts = await expectedRes.json()
          const expectedPostData = Array.isArray(expectedPosts) ? expectedPosts[0] : expectedPosts
          if (expectedPostData) {
            expectedPost = {
              expectedPostSlug: expectedPostData.slug,
              expectedPostId: expectedPostData.id,
              expectedPostTags: Array.isArray(expectedPostData.tags) ? expectedPostData.tags : [],
              isInEntityTagIds: Array.isArray(expectedPostData.tags) 
                ? expectedPostData.tags.some((tagId: number) => resolvedTagIds.includes(tagId))
                : false,
            }
          }
        }
      } catch (error) {
        console.error('[debug-entity] Error fetching expected post:', error)
      }
    }
    
    // Fetch posts if tag exists
    let first20PostSlugs: Array<{ id: number; slug: string; date: string; tags: number[] }> = []
    
    if (resolvedTagIds.length > 0 && wpPostsUrlUsed) {
      try {
        // Try multi-tag fetch first
        const result = await fetchPostsByTagId(resolvedTagIds.length > 1 ? resolvedTagIds : resolvedTagIds[0], 20, 1)
        let posts = result.posts || []
        
        // If multi-tag returned 0, try individual fetches
        if (posts.length === 0 && resolvedTagIds.length > 1) {
          console.log('[debug-entity] Multi-tag returned 0, trying individual fetches...')
          const individualResults = await Promise.all(
            resolvedTagIds.map(tid => fetchPostsByTagId(tid, 20, 1))
          )
          const postMap = new Map<number, any>()
          for (const result of individualResults) {
            for (const post of result.posts || []) {
              if (!postMap.has(post.id)) {
                postMap.set(post.id, post)
              }
            }
          }
          posts = Array.from(postMap.values())
          posts.sort((a, b) => {
            const dateA = new Date(a.date).getTime()
            const dateB = new Date(b.date).getTime()
            return dateB - dateA
          })
        }
        
        // Fetch full post data with tags field for each post
        const postsWithTags = await Promise.all(
          posts.slice(0, 20).map(async (post: any) => {
            // Fetch individual post to get tags field
            const postUrl = `${WORDPRESS_BACKEND_URL}/wp-json/wp/v2/posts/${post.id}?_fields=id,slug,date,title,tags`
            try {
              const postRes = await fetch(postUrl, {
                headers: { Accept: 'application/json', 'User-Agent': 'rapnews-server-fetch/1.0' },
                cache: 'no-store',
              })
              if (postRes.ok) {
                const postData = await postRes.json()
                return {
                  id: postData.id,
                  slug: postData.slug,
                  date: postData.date,
                  tags: Array.isArray(postData.tags) ? postData.tags : [],
                }
              }
            } catch (error) {
              console.error(`[debug-entity] Error fetching post ${post.id}:`, error)
            }
            // Fallback
            return {
              id: post.id,
              slug: post.slug,
              date: post.date,
              tags: Array.isArray(post.tags) ? post.tags : [],
            }
          })
        )
        
        first20PostSlugs = postsWithTags
        
        // Check if expected post is in results
        if (expectedPost) {
          expectedPost.isReturnedInFirst20 = first20PostSlugs.some(p => p.slug === expectedPost.expectedPostSlug)
        }
      } catch (error) {
        console.error('[debug-entity] Error fetching posts:', error)
      }
    }

    return NextResponse.json({
      entitySlugRequested: slug,
      resolvedCanonicalSlugs,
      resolvedTagIds,
      wpPostsUrlUsed,
      first20PostSlugs,
      expectedPost,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[debug-entity] Error:', error)
    return NextResponse.json(
      {
        entitySlugRequested: slug,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
