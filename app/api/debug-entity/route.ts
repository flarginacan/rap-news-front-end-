import { NextResponse } from 'next/server'
import { fetchPostsByTagId } from '@/lib/wordpress'
import { resolveEntityTagGroup } from '@/lib/entityResolve'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug') || 'future'
  const expectedPostSlug = searchParams.get('expectedPostSlug')

  try {
    console.log(`[debug-entity] Testing slug: ${slug}${expectedPostSlug ? `, expectedPostSlug: ${expectedPostSlug}` : ''}`)
    
    // Resolve entity tag group by name (finds all duplicate tags automatically)
    const tagGroup = await resolveEntityTagGroup(slug)
    
    if (!tagGroup) {
      return NextResponse.json({
        entitySlugRequested: slug,
        resolvedDisplayName: null,
        resolvedTagIds: [],
        resolvedSlugs: [],
        error: 'Could not resolve entity tag group',
        timestamp: new Date().toISOString(),
      })
    }
    
    const resolvedDisplayName = tagGroup.displayName
    const resolvedTagIds = tagGroup.tagIds
    const resolvedSlugs = tagGroup.slugs
    
    console.log(`[debug-entity] Resolved tag group:`, {
      displayName: resolvedDisplayName,
      tagIds: resolvedTagIds,
      slugs: resolvedSlugs,
    })
    
    const WORDPRESS_BACKEND_URL = process.env.WORDPRESS_URL || 'https://tsf.dvj.mybluehost.me'
    
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
            const expectedPostTags = Array.isArray(expectedPostData.tags) ? expectedPostData.tags : []
            const isExpectedTagsInGroup = expectedPostTags.some((tagId: number) => resolvedTagIds.includes(tagId))
            
            expectedPost = {
              expectedPostSlug: expectedPostData.slug,
              expectedPostId: expectedPostData.id,
              expectedPostTags,
              isExpectedTagsInGroup,
              isReturnedInFirst20: false, // Will be set below
            }
          }
        }
      } catch (error) {
        console.error('[debug-entity] Error fetching expected post:', error)
      }
    }
    
    // Fetch posts using individual tag fetches (same logic as API)
    let first20PostSlugs: Array<{ id: number; slug: string; date: string; tags: number[] }> = []
    
    if (resolvedTagIds.length > 0) {
      try {
        // Use individual fetches and merge (same as API)
        const perTagFetch = 60 // Fetch enough to ensure we get newest
        const individualResults = await Promise.all(
          resolvedTagIds.map(tid => fetchPostsByTagId(tid, perTagFetch, 1))
        )
        
        // Merge all posts, deduplicate by post.id
        const postMap = new Map<number, any>()
        for (const result of individualResults) {
          for (const post of result.posts || []) {
            if (!postMap.has(post.id)) {
              postMap.set(post.id, post)
            }
          }
        }
        
        let posts = Array.from(postMap.values())
        // Sort by date descending
        posts.sort((a, b) => {
          const dateA = new Date(a.date).getTime()
          const dateB = new Date(b.date).getTime()
          return dateB - dateA
        })
        
        // Get first 20 and fetch full post data with tags
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
      resolvedDisplayName: resolvedDisplayName,
      resolvedTagIds,
      resolvedSlugs,
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
