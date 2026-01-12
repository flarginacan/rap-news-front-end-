import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')

  if (!slug) {
    return NextResponse.json(
      { error: 'slug parameter required' },
      { status: 400 }
    )
  }

  try {
    console.log(`[debug-post] Fetching post with slug: ${slug}`)
    
    const WORDPRESS_BACKEND_URL = process.env.WORDPRESS_URL || 'https://tsf.dvj.mybluehost.me'
    const url = `${WORDPRESS_BACKEND_URL}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_fields=id,slug,date,title,tags`

    console.log(`[debug-post] URL: ${url}`)
    
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'rapnews-server-fetch/1.0',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return NextResponse.json(
        {
          postFound: false,
          error: `WP API error ${res.status}: ${body.slice(0, 300)}`,
          url,
        },
        { status: res.status }
      )
    }

    const posts = await res.json()
    const post = Array.isArray(posts) ? posts[0] : posts

    if (!post) {
      return NextResponse.json({
        postFound: false,
        slug,
        url,
      })
    }

    return NextResponse.json({
      postFound: true,
      post: {
        id: post.id,
        slug: post.slug,
        date: post.date,
        title: post.title?.rendered?.replace(/<[^>]*>/g, '') || post.title || '',
        tags: Array.isArray(post.tags) ? post.tags : [],
      },
      url,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[debug-post] Error:', error)
    return NextResponse.json(
      {
        postFound: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
