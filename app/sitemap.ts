import { MetadataRoute } from 'next'
import { entityAllowlist } from '@/lib/entityAllowlist'

const WORDPRESS_API_URL = process.env.WORDPRESS_URL 
  ? `${process.env.WORDPRESS_URL}/wp-json/wp/v2`
  : 'https://tsf.dvj.mybluehost.me/wp-json/wp/v2'

// Fetch all posts with pagination
async function fetchAllPosts(): Promise<Array<{ slug: string; modified: string }>> {
  const allPosts: Array<{ slug: string; modified: string }> = []
  let page = 1
  const perPage = 100
  let hasMore = true

  while (hasMore) {
    try {
      const response = await fetch(
        `${WORDPRESS_API_URL}/posts?per_page=${perPage}&page=${page}&orderby=date&order=desc&status=publish&_fields=slug,modified`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'rapnews-sitemap-generator/1.0',
          },
          next: { revalidate: 3600 } // Revalidate every hour
        }
      )

      if (!response.ok) {
        console.error(`[Sitemap] Failed to fetch posts page ${page}:`, response.status)
        break
      }

      const posts = await response.json()
      
      if (posts.length === 0) {
        hasMore = false
      } else {
        allPosts.push(...posts.filter((p: any) => p.slug))
        // If we got fewer than perPage, we're done
        if (posts.length < perPage) {
          hasMore = false
        } else {
          page++
        }
      }
    } catch (error) {
      console.error(`[Sitemap] Error fetching posts page ${page}:`, error)
      hasMore = false
    }
  }

  return allPosts
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
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

    // Fetch all published posts (with pagination)
    const posts = await fetchAllPosts()

    // Add article pages
    for (const post of posts) {
      routes.push({
        url: `${baseUrl}/article/${post.slug}`,
        lastModified: post.modified ? new Date(post.modified) : new Date(),
        changeFrequency: 'daily',
        priority: 0.8,
      })
    }

    // Add entity pages (artist pages like /drake, /kendrick-lamar-2)
    for (const entitySlug of entityAllowlist) {
      routes.push({
        url: `${baseUrl}/${entitySlug}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.7,
      })
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
