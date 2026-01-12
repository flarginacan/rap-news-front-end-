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
        // Use WordPress pagination (page parameter) - supports multiple tag IDs
        const { posts } = await fetchPostsByTagId(tagIds.length > 1 ? tagIds : tagIds[0], ITEMS_PER_PAGE, page)
        // Convert WordPress posts to Article format
        const allArticles = await Promise.all(posts.map(post => convertWordPressPost(post)))
        
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
        articles = uniqueArticles.sort((a, b) => {
          const dateA = new Date(a.date).getTime()
          const dateB = new Date(b.date).getTime()
          return dateB - dateA // Descending (newest first)
        })
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
