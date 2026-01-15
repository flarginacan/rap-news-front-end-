import { MetadataRoute } from 'next'

const WORDPRESS_API_URL = process.env.WORDPRESS_URL 
  ? `${process.env.WORDPRESS_URL}/wp-json/wp/v2`
  : 'https://tsf.dvj.mybluehost.me/wp-json/wp/v2'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    // Fetch all published posts
    const postsResponse = await fetch(
      `${WORDPRESS_API_URL}/posts?per_page=100&orderby=date&order=desc&status=publish&_fields=slug,modified`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'rapnews-sitemap-generator/1.0',
        },
        next: { revalidate: 3600 } // Revalidate every hour
      }
    )

    if (!postsResponse.ok) {
      console.error('[Sitemap] Failed to fetch posts:', postsResponse.status)
      return []
    }

    const posts = await postsResponse.json()

    // Base URL
    const baseUrl = 'https://rapnews.com'

    // Homepage
    const routes: MetadataRoute.Sitemap = [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'hourly',
        priority: 1,
      },
    ]

    // Add article pages
    for (const post of posts) {
      if (post.slug) {
        routes.push({
          url: `${baseUrl}/article/${post.slug}`,
          lastModified: post.modified ? new Date(post.modified) : new Date(),
          changeFrequency: 'daily',
          priority: 0.8,
        })
      }
    }

    return routes
  } catch (error) {
    console.error('[Sitemap] Error generating sitemap:', error)
    // Return at least homepage
    return [
      {
        url: 'https://rapnews.com',
        lastModified: new Date(),
        changeFrequency: 'hourly',
        priority: 1,
      },
    ]
  }
}
