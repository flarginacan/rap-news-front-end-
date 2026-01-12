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
        // Fetch posts by tag (WordPress REST API doesn't support pagination for tags easily)
        // For now, fetch all and paginate client-side, or fetch a larger batch
        const { fetchPostsByTagId, convertWordPressPost } = await import('@/lib/wordpress')
        // Fetch more than needed to support pagination
        const fetchCount = page * ITEMS_PER_PAGE
        const { posts } = await fetchPostsByTagId(parseInt(tagId), fetchCount)
        // Convert WordPress posts to Article format
        const allArticles = await Promise.all(posts.map(post => convertWordPressPost(post)))
        // Paginate manually
        const startIndex = (page - 1) * ITEMS_PER_PAGE
        articles = allArticles.slice(startIndex, startIndex + ITEMS_PER_PAGE)
      } else {
        articles = await fetchWordPressPosts(page, ITEMS_PER_PAGE)
      }
      
      console.log(`[API] Fetched ${articles.length} articles${tagId ? ` for tag ${tagId}` : ''}`)
      
      const nextCursor = articles.length === ITEMS_PER_PAGE ? (page + 1).toString() : null

      const response: ArticlesResponse = {
        items: articles,
        nextCursor,
      }

      return NextResponse.json(response)
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
