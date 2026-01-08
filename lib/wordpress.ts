import { Article } from '@/types'

// WordPress API configuration
// Use direct Bluehost URL to bypass Vercel security checkpoint
// The rewrite in next.config.js is for admin access, but API calls should go directly to WordPress
const WORDPRESS_BACKEND_URL = process.env.WORDPRESS_URL || 'https://tsf.dvj.mybluehost.me'
const WORDPRESS_API_URL = `${WORDPRESS_BACKEND_URL}/wp-json/wp/v2`

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

// Helper to fix image URLs (replace donaldbriggs.com or rapnews.com with Bluehost URL)
function fixImageUrl(url: string): string {
  if (!url) return url
  // Replace donaldbriggs.com or rapnews.com with the actual WordPress backend URL
  const WORDPRESS_BACKEND_URL = process.env.WORDPRESS_URL || 'https://tsf.dvj.mybluehost.me'
  return url.replace(/https?:\/\/(donaldbriggs\.com|rapnews\.com)/, WORDPRESS_BACKEND_URL)
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

  // Strip HTML from title and decode HTML entities
  let title = post.title.rendered.replace(/<[^>]*>/g, '')
  // Decode HTML entities (&#8217; → ', &#8220; → ", etc.)
  title = title
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
  
  // Preserve Getty Images divs (they contain gettyimages.com URLs)
  // Remove other images from content (they're already shown at the top via featured image)
  let content = post.content.rendered
  
  // First, extract and preserve Getty Images embed divs completely (including script tags)
  const gettyImageDivs: string[] = []
  // Match the entire Getty Images div structure including script tags (may span multiple lines)
  // Pattern: <div> containing gettyimages.com OR gie-single class, including all script tags
  const gettyImagePattern = /<div[^>]*>[\s\S]*?(?:gettyimages\.com|gie-single)[\s\S]*?<\/div>/gi
  let match
  while ((match = gettyImagePattern.exec(content)) !== null) {
    // Also capture any script tags immediately after the div
    const divEnd = match.index + match[0].length
    const afterDiv = content.substring(divEnd, divEnd + 500)
    const scriptMatch = afterDiv.match(/<script[^>]*>[\s\S]*?<\/script>/gi)
    if (scriptMatch) {
      // Include the script tags in the preserved div
      gettyImageDivs.push(match[0] + scriptMatch.join(''))
    } else {
      gettyImageDivs.push(match[0])
    }
  }
  
  // Remove the Getty Images divs from content temporarily (we'll restore them)
  // Match divs with gettyimages.com or gie-single, plus following script tags
  content = content.replace(/<div[^>]*>[\s\S]*?(?:gettyimages\.com|gie-single)[\s\S]*?<\/div>\s*(?:<script[^>]*>[\s\S]*?<\/script>\s*)*/gi, '<!-- GETTY_IMAGE_PLACEHOLDER -->')
  
  // Remove img tags and figure tags containing images
  content = content.replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '')
  content = content.replace(/<img[^>]*>/gi, '')
  content = content.replace(/<picture[^>]*>[\s\S]*?<\/picture>/gi, '')
  
  // Remove "RapNews" or "rap news" text (case insensitive)
  content = content.replace(/RapNews/gi, '')
  content = content.replace(/rap news/gi, '')
  content = content.replace(/Rap News/gi, '')
  
  // Clean up WordPress-specific classes and improve formatting
  // BUT preserve classes and styles inside Getty Images placeholders
  content = content.replace(/class="[^"]*"/gi, (match, offset, string) => {
    // If this is near a Getty placeholder, preserve it
    const context = string.substring(Math.max(0, offset - 200), Math.min(string.length, offset + 200))
    if (context.includes('GETTY_IMAGE_PLACEHOLDER') || context.includes('gie-single') || context.includes('gettyimages.com')) {
      return match
    }
    return ''
  })
  content = content.replace(/style="[^"]*"/gi, (match, offset, string) => {
    // If this is near a Getty placeholder, preserve it
    const context = string.substring(Math.max(0, offset - 200), Math.min(string.length, offset + 200))
    if (context.includes('GETTY_IMAGE_PLACEHOLDER') || context.includes('gie-single') || context.includes('gettyimages.com')) {
      return match
    }
    return ''
  })
  content = content.replace(/<p><\/p>/gi, '') // Remove empty paragraphs
  content = content.replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
  
  // Remove duplicate title paragraphs (they appear after the image)
  // Match paragraphs that are just the title
  const titleText = post.title?.rendered || post.title || ''
  if (titleText) {
    // Remove HTML tags from title for matching
    const cleanTitle = titleText.replace(/<[^>]*>/g, '').trim()
    // Create pattern to match title in various formats
    const titlePattern = new RegExp(`<p>\\s*${cleanTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</p>\\s*`, 'gi')
    content = content.replace(titlePattern, '')
  }
  
  // Restore Getty Images divs at the beginning (before any content)
  if (gettyImageDivs.length > 0) {
    // Replace placeholder with the actual Getty Images divs (preserving all classes, styles, and scripts)
    content = content.replace(/<!-- GETTY_IMAGE_PLACEHOLDER -->/g, gettyImageDivs[0])
    // Remove any remaining placeholders
    content = content.replace(/<!-- GETTY_IMAGE_PLACEHOLDER -->/g, '')
    // Insert at the very beginning if not already there
    if (!content.trim().startsWith('<div')) {
      content = gettyImageDivs[0] + '\n' + content
    }
  }
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
    console.log(`[WordPress] Fetching posts from: ${WORDPRESS_API_URL}/posts?_embed&per_page=${perPage}&page=${page}`)
    
    const response = await fetch(
      `${WORDPRESS_API_URL}/posts?_embed&per_page=${perPage}&page=${page}&orderby=date&order=desc`,
      {
        // Remove 'next' option - not needed in API routes
        cache: 'no-store' // Always fetch fresh data
      }
    )

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error(`[WordPress] API error ${response.status}:`, errorText)
      throw new Error(`WordPress API error: ${response.status} - ${errorText}`)
    }

    const posts: WordPressPost[] = await response.json()
    console.log(`[WordPress] Fetched ${posts.length} posts`)
    
    if (posts.length === 0) {
      console.warn('[WordPress] No posts returned from API')
      return []
    }
    
    // Convert all posts to Article format
    const articles = await Promise.all(
      posts.map(post => convertWordPressPost(post))
    )

    console.log(`[WordPress] Converted ${articles.length} articles`)
    return articles
  } catch (error) {
    console.error('[WordPress] Error fetching WordPress posts:', error)
    if (error instanceof Error) {
      console.error('[WordPress] Error message:', error.message)
      console.error('[WordPress] Error stack:', error.stack)
    }
    return []
  }
}

