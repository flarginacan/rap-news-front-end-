import { NextResponse } from 'next/server'
import { fetchTagBySlug, fetchPostsByTagId } from '@/lib/wordpress'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug') || 'future'

  try {
    console.log(`[debug-entity] Testing slug: ${slug}`)
    
    // Fetch tag
    const tag = await fetchTagBySlug(slug)
    const tagFound = !!tag
    const tagId = tag?.id || null
    const count = tag?.count || 0
    
    // Fetch posts if tag exists
    let postsCount = 0
    let firstPostTitle = null
    
    if (tag && tag.id) {
      try {
        const result = await fetchPostsByTagId(tag.id, 20)
        postsCount = result.posts?.length || 0
        firstPostTitle = result.posts?.[0]?.title?.rendered?.replace(/<[^>]*>/g, '') || null
      } catch (error) {
        console.error('[debug-entity] Error fetching posts:', error)
      }
    }

    return NextResponse.json({
      slug,
      tagFound,
      tagId,
      tagName: tag?.name || null,
      count,
      postsCount,
      firstPostTitle,
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
