import { NextRequest, NextResponse } from 'next/server'
import { ArticlesResponse } from '@/types'
import { parseArticles } from '@/lib/articles'
import { fetchWordPressPosts } from '@/lib/wordpress'

const ITEMS_PER_PAGE = 10
const USE_WORDPRESS = process.env.USE_WORDPRESS === 'true'

// Log environment variable status
if (typeof process !== 'undefined') {
  console.log('[API] USE_WORDPRESS:', process.env.USE_WORDPRESS)
  console.log('[API] WORDPRESS_URL:', process.env.WORDPRESS_URL)
}

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const cursor = searchParams.get('cursor')
    const tagId = searchParams.get('tagId')
    const tagIdsParam = searchParams.get('tagIds') // NEW: Array of tag IDs
    const pinSlug = searchParams.get('pinSlug') // Article slug to pin at top

    if (USE_WORDPRESS) {
      // Fetch from WordPress
      console.log('[API] USE_WORDPRESS is true, fetching from WordPress...')
      const page = cursor ? parseInt(cursor) : 1
      
      let articles
      let tagIds: number[] = [] // Declare outside if block for logging
      
      if (tagIdsParam || tagId) {
        // Fetch posts by tag with proper WordPress pagination
        const { fetchPostsByTagId, convertWordPressPost } = await import('@/lib/wordpress')
        
        // Parse tag IDs - prefer tagIds array, fallback to tagId
        if (tagIdsParam) {
          tagIds = tagIdsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
        } else if (tagId) {
          tagIds = tagId.includes(',') 
            ? tagId.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
            : [parseInt(tagId)]
        }
        
        console.log(`[API] Fetching posts for tag IDs: [${tagIds.join(', ')}], page: ${page}`)
        
        let allPosts: any[] = []
        
        if (tagIds.length === 1) {
          // Single tag - straightforward
          const { posts } = await fetchPostsByTagId(tagIds[0], ITEMS_PER_PAGE, page)
          allPosts = posts || []
        } else {
          // Multiple tags - ALWAYS use individual fetches and merge
          // Fetch enough per tag to not miss newest posts
          const perTagFetch = ITEMS_PER_PAGE * 3 // Fetch 3x per tag to ensure we get newest
          console.log(`[API] Using individual tag fetches for ${tagIds.length} tags (${perTagFetch} per tag)`)
          
          try {
            // Fetch from each tag individually
            const individualResults = await Promise.all(
              tagIds.map(tid => fetchPostsByTagId(tid, perTagFetch, 1)) // Always fetch page 1, we'll paginate after merge
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
            
            const mergedPosts = Array.from(postMap.values())
            console.log(`[API] Individual fetches returned ${mergedPosts.length} unique posts total`)
            
            // Sort by date descending (newest first)
            mergedPosts.sort((a, b) => {
              const dateA = new Date(a.date).getTime()
              const dateB = new Date(b.date).getTime()
              return dateB - dateA
            })
            
            // Paginate manually
            const startIndex = (page - 1) * ITEMS_PER_PAGE
            allPosts = mergedPosts.slice(startIndex, startIndex + ITEMS_PER_PAGE)
            
            console.log(`[API] Showing ${allPosts.length} posts on page ${page} (from ${mergedPosts.length} total)`)
            if (allPosts.length > 0) {
              console.log(`[API] First post: ${allPosts[0].slug}, date: ${allPosts[0].date}`)
            }
          } catch (error) {
            console.error(`[API] Individual tag fetches failed:`, error)
            allPosts = []
          }
        }
        
        // Convert WordPress posts to Article format
        const allArticles = await Promise.all(allPosts.map(post => convertWordPressPost(post)))
        
        // Deduplicate articles by ID (in case WordPress returns duplicates)
        const seenIds = new Set<string>()
        const uniqueArticles = allArticles.filter(article => {
          if (seenIds.has(article.id)) {
            return false
          }
          seenIds.add(article.id)
          return true
        })
        
        // DEFENSIVE: Sort by date descending (newest first) as final safety check
        // Use rawDate (ISO string) for accurate sorting, fallback to date if rawDate not available
        articles = uniqueArticles.sort((a, b) => {
          // Use rawDate if available (ISO format), otherwise try to parse date string
          const dateAStr = a.rawDate || a.date
          const dateBStr = b.rawDate || b.date
          
          const dateA = new Date(dateAStr).getTime()
          const dateB = new Date(dateBStr).getTime()
          
          // If dates are invalid, put them at the end
          if (isNaN(dateA) || isNaN(dateB)) {
            if (isNaN(dateA) && isNaN(dateB)) return 0
            if (isNaN(dateA)) return 1 // a goes to end
            if (isNaN(dateB)) return -1 // b goes to end
          }
          
          return dateB - dateA // Descending (newest first)
        })
        
        // Log the first article to verify sorting
        if (articles.length > 0) {
          console.log(`[API] Sorted articles - newest: ${articles[0].slug}, date: ${articles[0].date}, rawDate: ${articles[0].rawDate}`)
        }
      } else {
        articles = await fetchWordPressPosts(page, ITEMS_PER_PAGE)
      }
      
      // Handle pinSlug: fetch pinned post and ensure it appears first
      if (pinSlug && USE_WORDPRESS) {
        try {
          const { fetchWordPressPostBySlug } = await import('@/lib/wordpress')
          const WORDPRESS_API_URL = process.env.WORDPRESS_URL 
            ? `${process.env.WORDPRESS_URL}/wp-json/wp/v2`
            : 'https://tsf.dvj.mybluehost.me/wp-json/wp/v2'
          
          console.log(`[API] Pinning post with slug: ${pinSlug}`)
          
          // Fetch the pinned post directly by slug (as Article)
          const pinnedPost = await fetchWordPressPostBySlug(pinSlug)
          
          if (pinnedPost) {
            console.log(`[API] Pinned post found: ${pinnedPost.id}, slug: ${pinnedPost.slug}`)
            
            // Also fetch raw WordPress post to get tags for debugging
            try {
              const wpRes = await fetch(
                `${WORDPRESS_API_URL}/posts?slug=${encodeURIComponent(pinSlug)}&_fields=id,slug,tags`,
                { headers: { Accept: 'application/json', 'User-Agent': 'rapnews-server-fetch/1.0' }, cache: 'no-store' }
              )
              if (wpRes.ok) {
                const wpPosts = await wpRes.json()
                if (wpPosts.length > 0) {
                  const pinnedPostTags = wpPosts[0].tags || []
                  const intersection = pinnedPostTags.filter((tid: number) => tagIds.includes(tid))
                  console.log(`[API] Pinned post tags: [${pinnedPostTags.join(', ')}]`)
                  console.log(`[API] Resolved entity tagIds: [${tagIds.join(', ')}]`)
                  console.log(`[API] Tag intersection: [${intersection.join(', ')}] (${intersection.length} matches)`)
                  if (intersection.length === 0) {
                    console.warn(`[API] WARNING: Pinned post has ZERO tag overlap with entity tags - tagging pipeline may be failing!`)
                  }
                }
              }
            } catch (tagFetchError) {
              console.error(`[API] Could not fetch tags for pinned post:`, tagFetchError)
            }
            
            // Check if pinned post is already in results
            const existingIndex = articles.findIndex(a => a.id === pinnedPost.id)
            
            if (existingIndex === -1) {
              // Not in results - add to front
              console.log(`[API] Pinned post not in results, adding to front`)
              articles.unshift(pinnedPost)
            } else if (existingIndex > 0) {
              // In results but not first - move to front
              console.log(`[API] Pinned post found at index ${existingIndex}, moving to front`)
              articles.splice(existingIndex, 1)
              articles.unshift(pinnedPost)
            } else {
              console.log(`[API] Pinned post already at position 0`)
            }
          } else {
            console.log(`[API] Pinned post not found for slug: ${pinSlug}`)
          }
        } catch (pinError) {
          console.error(`[API] Error fetching pinned post:`, pinError)
          // Don't fail the whole request if pinning fails
        }
      }
      
      // Logging
      if (tagIdsParam || tagId) {
        const tagIdsForLog = tagIdsParam ? tagIds : (tagId ? [parseInt(tagId)] : [])
        console.log(`[API] Fetched ${articles.length} articles for tagIds: [${tagIdsForLog.join(', ')}]${articles.length > 0 ? ` (newest: ${articles[0].slug}, date: ${articles[0].date})` : ''}`)
      }
      
      const nextCursor = articles.length === ITEMS_PER_PAGE ? (page + 1).toString() : null

      const response: ArticlesResponse = {
        items: articles,
        nextCursor,
      }

      // Force no caching for tag requests
      const headers = new Headers()
      headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      headers.set('Pragma', 'no-cache')
      headers.set('Expires', '0')

      return NextResponse.json(response, { headers })
    } else {
      // Use mock data (current setup)
      const allArticles = parseArticles()

      let startIndex = 0
      if (cursor) {
        const cursorIndex = allArticles.findIndex(article => article.id === cursor)
        startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0
      }

      const endIndex = startIndex + ITEMS_PER_PAGE
      const items = allArticles.slice(startIndex, endIndex)
      const nextCursor = endIndex < allArticles.length ? items[items.length - 1].id : null

      const response: ArticlesResponse = {
        items,
        nextCursor,
      }

      return NextResponse.json(response)
    }
  } catch (error) {
    console.error('Error in articles API:', error)
    return NextResponse.json(
      { 
        error: 'Failed to load articles',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
