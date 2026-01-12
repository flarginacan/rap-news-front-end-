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

    if (USE_WORDPRESS) {
      // Fetch from WordPress
      console.log('[API] USE_WORDPRESS is true, fetching from WordPress...')
      const page = cursor ? parseInt(cursor) : 1
      
      let articles
      if (tagId) {
        // Fetch posts by tag with proper WordPress pagination
        const { fetchPostsByTagId, convertWordPressPost } = await import('@/lib/wordpress')
        // Support comma-separated tag IDs (for canonical tag merging)
        const tagIds = tagId.includes(',') 
          ? tagId.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
          : [parseInt(tagId)]
        
        console.log(`[API] Fetching posts for tag IDs: ${tagIds.join(',')}, page: ${page}`)
        
        // ROBUST MULTI-TAG FETCHING:
        // WordPress may or may not support tags=1,2,3 in a single query
        // Try single request first, then fallback to individual fetches if needed
        let allPosts: any[] = []
        
        if (tagIds.length === 1) {
          // Single tag - straightforward
          const { posts } = await fetchPostsByTagId(tagIds[0], ITEMS_PER_PAGE, page)
          allPosts = posts || []
        } else {
          // Multiple tags - try comma-separated first
          try {
            const { posts } = await fetchPostsByTagId(tagIds, ITEMS_PER_PAGE, page)
            allPosts = posts || []
            console.log(`[API] Multi-tag query returned ${allPosts.length} posts`)
            
            // If we got 0 posts but we know tags have posts, fallback to individual fetches
            if (allPosts.length === 0) {
              console.log(`[API] Multi-tag query returned 0 posts, trying individual tag fetches...`)
              const individualResults = await Promise.all(
                tagIds.map(tid => fetchPostsByTagId(tid, ITEMS_PER_PAGE * 2, 1)) // Fetch more to ensure we get enough
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
              
              allPosts = Array.from(postMap.values())
              // Sort by date descending
              allPosts.sort((a, b) => {
                const dateA = new Date(a.date).getTime()
                const dateB = new Date(b.date).getTime()
                return dateB - dateA
              })
              
              // Paginate manually
              const startIndex = (page - 1) * ITEMS_PER_PAGE
              allPosts = allPosts.slice(startIndex, startIndex + ITEMS_PER_PAGE)
              
              console.log(`[API] Individual fetches returned ${allPosts.length} unique posts after pagination`)
            }
          } catch (error) {
            console.error(`[API] Multi-tag query failed, using individual fetches:`, error)
            // Fallback to individual fetches
            const individualResults = await Promise.all(
              tagIds.map(tid => fetchPostsByTagId(tid, ITEMS_PER_PAGE * 2, 1))
            )
            
            const postMap = new Map<number, any>()
            for (const result of individualResults) {
              for (const post of result.posts || []) {
                if (!postMap.has(post.id)) {
                  postMap.set(post.id, post)
                }
              }
            }
            
            allPosts = Array.from(postMap.values())
            allPosts.sort((a, b) => {
              const dateA = new Date(a.date).getTime()
              const dateB = new Date(b.date).getTime()
              return dateB - dateA
            })
            
            const startIndex = (page - 1) * ITEMS_PER_PAGE
            allPosts = allPosts.slice(startIndex, startIndex + ITEMS_PER_PAGE)
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
        // WordPress should already return sorted, but this ensures correctness
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
      
      console.log(`[API] Fetched ${articles.length} articles${tagId ? ` for tag ${tagId}` : ''}${tagId && articles.length > 0 ? ` (newest: ${articles[0].slug}, date: ${articles[0].date})` : ''}`)
      
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
