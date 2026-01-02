import { Article } from '@/types'

// WordPress API configuration
// For server-side: use full URL (rewrite in next.config.js helps with client-side CORS)
// For client-side: can use /wp-json/wp/v2 (proxied via rewrite)
const WORDPRESS_URL = process.env.WORDPRESS_URL || 'https://rapnews.com'
const WORDPRESS_API_URL = `${WORDPRESS_URL}/wp-json/wp/v2`

interface WordPressPost {
  id: number
  title: {
    rendered: string
  }
  content: {
    rendered: string
  }
  excerpt: {
    rendered: string
  }
  date: string
  modified: string
  slug: string
  featured_media: number
  categories?: number[]
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string
    }>
    'wp:term'?: Array<Array<{
      id: number
      name: string
      slug: string
    }>>
  }
}

// Helper to fix image URLs (replace donaldbriggs.com with Bluehost URL)
function fixImageUrl(url: string): string {
  if (!url) return url
  // Replace donaldbriggs.com with the actual WordPress backend URL
  const WORDPRESS_BACKEND_URL = process.env.WORDPRESS_URL || 'https://tsf.dvj.mybluehost.me'
  return url.replace(/https?:\/\/donaldbriggs\.com/, WORDPRESS_BACKEND_URL)
}

// Fetch featured image URL
async function getFeaturedImageUrl(mediaId: number): Promise<string> {
  try {
    const response = await fetch(`${WORDPRESS_API_URL}/media/${mediaId}`)
    if (!response.ok) return getDefaultImage()
    const media = await response.json()
    const imageUrl = media.source_url || getDefaultImage()
    // Fix the URL to point to Bluehost instead of donaldbriggs.com
    return fixImageUrl(imageUrl)
  } catch {
    return getDefaultImage()
  }
}

function getDefaultImage(): string {
  return 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=450&fit=crop'
}

// Get category name from ID
function getCategoryName(categoryId: number, terms: any[]): string {
  const category = terms.find(term => term.id === categoryId)
  return category?.name || 'NEWS'
}

// Convert WordPress post to Article
export async function convertWordPressPost(post: WordPressPost): Promise<Article> {
  // Get featured image
  let imageUrl = getDefaultImage()
  if (post.featured_media) {
    imageUrl = await getFeaturedImageUrl(post.featured_media)
  } else if (post._embedded?.['wp:featuredmedia']?.[0]?.source_url) {
    imageUrl = fixImageUrl(post._embedded['wp:featuredmedia'][0].source_url)
  }

  // Get category
  const categoryId = post.categories?.[0]
  const terms = post._embedded?.['wp:term']?.[0] || []
  const category = categoryId ? getCategoryName(categoryId, terms) : 'NEWS'

  // Format date
  const date = new Date(post.date)
  const now = new Date()
  const diffMs = Math.abs(now.getTime() - date.getTime()) // Use absolute value
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  let formattedDate: string
  if (diffMins < 60) {
    formattedDate = `${diffMins} minutes ago`
  } else if (diffHours < 24) {
    formattedDate = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  } else if (diffDays < 7) {
    formattedDate = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  } else {
    formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Strip HTML from title
  const title = post.title.rendered.replace(/<[^>]*>/g, '')
  
  // Remove images from content (they're already shown at the top)
  let content = post.content.rendered
  // Remove img tags and figure tags containing images
  content = content.replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '')
  content = content.replace(/<img[^>]*>/gi, '')
  content = content.replace(/<picture[^>]*>[\s\S]*?<\/picture>/gi, '')
  
  // Remove "RapNews" or "rap news" text (case insensitive)
  content = content.replace(/RapNews/gi, '')
  content = content.replace(/rap news/gi, '')
  content = content.replace(/Rap News/gi, '')
  
  // Clean up WordPress-specific classes and improve formatting
  content = content.replace(/class="[^"]*"/gi, '') // Remove all classes
  content = content.replace(/style="[^"]*"/gi, '') // Remove inline styles
  content = content.replace(/<p><\/p>/gi, '') // Remove empty paragraphs
  content = content.replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
  
  // Ensure proper paragraph spacing
  content = content.replace(/<\/p>\s*<p>/gi, '</p>\n\n<p>')

  return {
    id: post.slug,
    slug: post.slug,
    title: title,
    image: imageUrl,
    category: category.toUpperCase(),
    author: 'Rap News',
    date: formattedDate,
    comments: 0, // WordPress REST API doesn't include comment count by default
    content: content,
  }
}

// Fetch a single post by slug
export async function fetchWordPressPostBySlug(slug: string): Promise<Article | null> {
  try {
    const response = await fetch(
      `${WORDPRESS_API_URL}/posts?slug=${slug}&_embed`,
      {
        next: { revalidate: 60 } // Cache for 60 seconds
      }
    )

    if (!response.ok) {
      throw new Error(`WordPress API error: ${response.status}`)
    }

    const posts: WordPressPost[] = await response.json()
    
    if (posts.length === 0) {
      return null
    }

    return await convertWordPressPost(posts[0])
  } catch (error) {
    console.error('Error fetching WordPress post:', error)
    return null
  }
}

// Fetch posts from WordPress
export async function fetchWordPressPosts(page: number = 1, perPage: number = 10): Promise<Article[]> {
  try {
    const response = await fetch(
      `${WORDPRESS_API_URL}/posts?_embed&per_page=${perPage}&page=${page}&orderby=date&order=desc`,
      {
        next: { revalidate: 60 } // Cache for 60 seconds
      }
    )

    if (!response.ok) {
      throw new Error(`WordPress API error: ${response.status}`)
    }

    const posts: WordPressPost[] = await response.json()
    
    // Convert all posts to Article format
    const articles = await Promise.all(
      posts.map(post => convertWordPressPost(post))
    )

    return articles
  } catch (error) {
    console.error('Error fetching WordPress posts:', error)
    return []
  }
}

