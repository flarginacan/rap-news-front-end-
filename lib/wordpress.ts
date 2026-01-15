import { Article } from '@/types'

// WordPress API configuration
// Use direct Bluehost URL to bypass Vercel security checkpoint
// The rewrite in next.config.js is for admin access, but API calls should go directly to WordPress
const WORDPRESS_BACKEND_URL = process.env.WORDPRESS_URL || 'https://tsf.dvj.mybluehost.me'
const WORDPRESS_API_URL = `${WORDPRESS_BACKEND_URL}/wp-json/wp/v2`

// Shared headers for WordPress API requests (avoids ModSecurity blocking)
function wpHeaders() {
  return {
    Accept: 'application/json',
    'User-Agent': 'rapnews-server-fetch/1.0',
  };
}

async function readResTextSafe(res: Response) {
  try { return await res.text(); } catch { return ''; }
}

// Fetch with timeout and error handling
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 10000): Promise<Response> {
  const controller = new AbortController()
  // Use global setTimeout (available in Node.js and browser)
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    globalThis.clearTimeout(timeoutId)
    return response
  } catch (error) {
    globalThis.clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Fetch timeout after ${timeoutMs}ms: ${url}`)
    }
    throw error
  }
}

// Safe JSON parse with error handling
function parseJSONSafe(text: string, url: string): any {
  try {
    return JSON.parse(text)
  } catch (e) {
    throw new Error(`Bad JSON from WP (${url}): ${text.slice(0, 200)}`)
  }
}

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
      taxonomy?: string
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

// Helper function to slugify person names
function slugifyPerson(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
}

const STOPWORDS_EXACT = new Set([
  // days
  "monday","tuesday","wednesday","thursday","friday","saturday","sunday",
  // months
  "january","february","march","april","may","june","july","august","september","october","november","december",
  // generic words that should never be "people"
  "rapper","album","music","song","songs","track","tracks","single","video","tour","concert","festival",
  "exclusive","news","hip-hop","hiphop","rap","release","released","prison","federal","case","recap",
  // common locations that were getting linked (expand anytime)
  "minnesota","philadelphia","new york","brooklyn","connecticut","california","puerto rico","atlanta","chicago",
]);

function normalizeWord(s: string) {
  return s.trim().toLowerCase();
}

// Heuristic filter: keep only tags that look like human names / stage names
export function isLikelyPersonTag(name: string, slug?: string) {
  const n = (name || "").trim();
  if (!n) return false;

  const lower = normalizeWord(n);
  if (STOPWORDS_EXACT.has(lower)) return false;

  // reject super short generic tags
  if (lower.length < 4) return false;

  // reject if it contains digits only or looks like a date
  if (/^\d+$/.test(lower)) return false;

  // reject if it's obviously a place/state/time-word pattern
  if (/(city|state|county|avenue|street|road|st\.|ave\.|blvd)/i.test(n)) return false;

  // accept if it's multi-word Proper Name (e.g. "Fetty Wap", "Willie Junior Maxwell II")
  const words = n.split(/\s+/).filter(Boolean);
  const isMultiWord = words.length >= 2;

  // accept if it has typical stage-name capitalization (at least one capital letter)
  const hasCapital = /[A-Z]/.test(n);

  // accept if slug exists and looks like a person slug (contains a dash and letters)
  const slugOk = slug ? /^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(slug) : false;

  // stricter: if single word, require capital AND slugOk AND not a stopword
  if (!isMultiWord) {
    return hasCapital && slugOk && !STOPWORDS_EXACT.has(lower);
  }

  // multi-word: require capital letters somewhere
  return hasCapital;
}

// Convert WordPress post to Article
export async function convertWordPressPost(post: WordPressPost): Promise<Article> {
  // Check if content has Getty embed - if so, NEVER use featured image
  const rawContent = post.content.rendered || ''
  const hasGettyEmbed = rawContent.includes('getty-embed-wrap') || 
                        rawContent.includes('embed.gettyimages.com') ||
                        rawContent.includes('gie-single') ||
                        rawContent.includes('gettyimages.com')
  
  // Get featured image ONLY if there's no Getty embed
  let imageUrl = ''
  if (!hasGettyEmbed) {
    // Only use default image if no featured media and no Getty embed
    imageUrl = getDefaultImage()
    if (post.featured_media) {
      imageUrl = await getFeaturedImageUrl(post.featured_media)
    } else if (post._embedded?.['wp:featuredmedia']?.[0]?.source_url) {
      imageUrl = fixImageUrl(post._embedded['wp:featuredmedia'][0].source_url)
    }
  }
  // If hasGettyEmbed is true, imageUrl remains empty string (no featured image)

  // Get category
  const categoryId = post.categories?.[0]
  const terms = post._embedded?.['wp:term']?.[0] || []
  const category = categoryId ? getCategoryName(categoryId, terms) : 'NEWS'
  
  // Extract people mentioned from tags (tags are in _embedded['wp:term'] typically)
  // WordPress returns terms as: [0] = categories, [1] = tags (if _embed is used)
  const allTerms = post._embedded?.['wp:term'] || []
  
  // Flatten all terms and filter for post_tag taxonomy
  const flatTerms = allTerms.flat()
  const tagTerms = flatTerms.filter((term: any) => term?.taxonomy === 'post_tag')
  
  // Log for debugging
  console.log(`[convertWordPressPost] Post ID: ${post.id}`)
  console.log(`[convertWordPressPost] _embedded exists?`, !!post._embedded)
  console.log(`[convertWordPressPost] All terms arrays: ${allTerms.length}`)
  console.log(`[convertWordPressPost] Flat terms count: ${flatTerms.length}`)
  console.log(`[convertWordPressPost] Tag terms found: ${tagTerms.length}`)
  if (tagTerms.length > 0) {
    console.log(`[convertWordPressPost] Tag names: ${tagTerms.map((t: any) => `${t.name} (${t.taxonomy})`).join(', ')}`)
  } else {
    console.log(`[convertWordPressPost] ⚠️  NO TAG TERMS FOUND - checking raw _embedded:`)
    console.log(`[convertWordPressPost] Raw _embedded['wp:term']:`, JSON.stringify(post._embedded?.['wp:term'], null, 2))
  }
  
  // Get people from tags - treat ALL post_tag as people tags for now
  // Get people from tags - filter to only real person names
  const people = tagTerms
    .map((t: any) => ({
      name: t?.name?.trim(),
      slug: t?.slug?.trim(),
    }))
    .filter((p: any) => p.name && p.slug)
  
  console.log(`[convertWordPressPost] 🔍 Before isLikelyPersonTag filter: ${people.length} tags`)
  people.forEach(p => {
    const isPerson = isLikelyPersonTag(p.name, p.slug)
    console.log(`[convertWordPressPost]   - "${p.name}" (${p.slug}): ${isPerson ? '✅ PERSON' : '❌ NOT PERSON'}`)
  })
  
  const peopleMentioned = people.filter((p: any) => isLikelyPersonTag(p.name, p.slug))
  
  console.log(`[convertWordPressPost] People mentioned: ${peopleMentioned.length}`)
  if (peopleMentioned.length > 0) {
    console.log(`[convertWordPressPost] People: ${peopleMentioned.map((p: any) => p.name).join(', ')}`)
  } else {
    console.log(`[convertWordPressPost] ⚠️  NO PEOPLE MENTIONED - person linking will be SKIPPED`)
  }

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
  // CRITICAL: Decode any HTML entities that WordPress might have encoded
  let content = rawContent
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
  
  // Extract anchor element AND widget config from Getty embed
  let gettyAnchorHtml: string | undefined = undefined
  let gettyWidgetConfig: { id: string; sig: string; items: string; w?: string; h?: string } | undefined = undefined
  
  // Look for gie-single anchor - extract anchor and try to extract config from any nearby script
  // Match anchor + optional script tags (may have <br /> tags between them)
  // Updated regex to handle <br /> tags and match scripts that come after the anchor
  const gieSingleMatch = content.match(/<a[^>]*id=["']([^"']+)["'][^>]*class=["'][^"']*gie-single[^"']*["'][^>]*>[\s\S]*?<\/a>([\s\S]{0,2000}?)(?:<\/p>|$)/i)
  if (gieSingleMatch) {
    // Extract just the anchor (remove any scripts and <br /> tags)
    gettyAnchorHtml = gieSingleMatch[0].match(/<a[^>]*id=["']([^"']+)["'][^>]*class=["'][^"']*gie-single[^"']*["'][^>]*>[\s\S]*?<\/a>/i)?.[0] || ''
    gettyAnchorHtml = gettyAnchorHtml.trim()
    const widgetId = gieSingleMatch[1]
    
    // Try to find widget config in script tags - search in the full match (includes content after anchor)
    // Look for gie.widgets.load({...}) pattern
    const fullMatchContent = gieSingleMatch[0]
    const scriptInMatch = fullMatchContent.match(/<script[^>]*>[\s\S]*?gie\.widgets\.load\s*\(\s*\{([^}]+)\}[\s\S]*?<\/script>/i)
    // Also search in the broader content context (within 500 chars of the anchor)
    const scriptMatch = scriptInMatch || content.match(/<script[^>]*>[\s\S]*?gie\.widgets\.load\s*\(\s*\{([^}]+)\}[\s\S]*?<\/script>/i)
    if (scriptMatch) {
      try {
        // Extract the config object content (between { and })
        const configContent = scriptMatch[1]
        // Parse key-value pairs, handling both single and double quotes
        const config: any = {}
        
        // Match key:value pairs (handling quotes and numbers)
        const pairs = configContent.match(/(\w+)\s*:\s*([^,}]+)/g)
        if (pairs) {
          pairs.forEach((pair: string) => {
            const match = pair.match(/(\w+)\s*:\s*(.+)/)
            if (match) {
              const key = match[1]
              let value = match[2].trim()
              // Remove quotes if present
              if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1)
              }
              // Handle boolean and numeric values
              if (value === 'true') config[key] = true
              else if (value === 'false') config[key] = false
              else if (/^\d+$/.test(value)) config[key] = parseInt(value, 10)
              else if (/^\d+px$/.test(value)) config[key] = value // Keep '594px' as string
              else config[key] = value
            }
          })
        }
        
        if (config.id && config.items) {
          // CRITICAL: Use anchor ID as source of truth, but prefer config.id if it matches
          // If they don't match, use anchor ID (it's what's actually in the DOM)
          const finalId = (config.id === widgetId) ? config.id : widgetId
          gettyWidgetConfig = {
            id: finalId,
            sig: config.sig || '',
            items: String(config.items),
            w: config.w || '594px',
            h: config.h || '396px'
          }
          if (config.id !== widgetId) {
            console.warn(`[convertWordPressPost] Config ID (${config.id}) != Anchor ID (${widgetId}), using anchor ID`)
          }
          console.log(`[convertWordPressPost] ✅ Extracted Getty widget config: id=${finalId}, sig=${gettyWidgetConfig.sig ? 'YES' : 'NO'}, items=${gettyWidgetConfig.items}`)
        } else {
          console.warn(`[convertWordPressPost] ⚠️  Config missing required fields: id=${config.id}, items=${config.items}`)
        }
      } catch (e) {
        console.error(`[convertWordPressPost] ❌ Could not parse widget config: ${e}`)
        console.error(`[convertWordPressPost] Script match: ${scriptMatch[0]?.substring(0, 200)}`)
      }
    } else {
      console.warn(`[convertWordPressPost] ⚠️  No widget config script found for anchor ID: ${widgetId}`)
    }
    
    if (gettyAnchorHtml) {
      console.log(`[convertWordPressPost] ✅ Extracted Getty anchor HTML (${gettyAnchorHtml.length} chars), ID: ${widgetId}`)
    } else {
      console.error(`[convertWordPressPost] ❌ Failed to extract anchor HTML`)
    }
  } else {
    console.warn(`[convertWordPressPost] ⚠️  No gie-single anchor found in content`)
  }

  // First, extract and preserve Getty Images embed divs completely (including script tags and credit divs)
  const gettyImageDivs: string[] = []
  // Match the entire Getty Images div structure including:
  // - New format: getty-embed-wrap div + credit div
  // - Old format: div with gettyimages.com or gie-single class + scripts
  // Pattern 1: New format - getty-embed-wrap div followed by credit div
  const newFormatPattern = /<div[^>]*class=["']getty-embed-wrap["'][^>]*>[\s\S]*?<\/div>\s*(?:<div[^>]*>[\s\S]*?(?:Getty Images|Photo by|Photo via)[\s\S]*?<\/div>)?/gi
  let match
  while ((match = newFormatPattern.exec(content)) !== null) {
    gettyImageDivs.push(match[0])
  }
  // Pattern 2: Old format - div with gettyimages.com or gie-single
  const oldFormatPattern = /<div[^>]*>[\s\S]*?(?:gettyimages\.com|gie-single)[\s\S]*?<\/div>/gi
  while ((match = oldFormatPattern.exec(content)) !== null) {
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
  // Match new format: getty-embed-wrap + credit div
  content = content.replace(/<div[^>]*class=["']getty-embed-wrap["'][^>]*>[\s\S]*?<\/div>\s*(?:<div[^>]*>[\s\S]*?(?:Getty Images|Photo by|Photo via)[\s\S]*?<\/div>)?/gi, '<!-- GETTY_IMAGE_PLACEHOLDER -->')
  // Match old format: divs with gettyimages.com or gie-single, plus following script tags
  // Remove all gie-single anchors from content (we handle them via React component)
  content = content.replace(/<a[^>]*class=["'][^"']*\bgie-single\b[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, '')
  content = content.replace(/<div[^>]*>[\s\S]*?(?:gettyimages\.com|gie-single)[\s\S]*?<\/div>\s*(?:<script[^>]*>[\s\S]*?<\/script>\s*)*/gi, '<!-- GETTY_IMAGE_PLACEHOLDER -->')
  
  // CRITICAL: Remove ALL inline scripts that contain window.gie or gie.widgets
  // These scripts conflict with our React component's management of window.gie
  // We extract the config and handle it in React, so we don't need these scripts
  // Match ANY script that mentions gie (case insensitive, multiple patterns)
  // Remove scripts with explicit gie patterns - do multiple passes to catch all variations
  const giePattern1 = /<script[^>]*>[\s\S]*?(?:window\s*\.\s*gie|gie\s*\.\s*widgets|gie\s*\(|gie\s*=\s*|\.\s*gie|gie\s*\.\s*q)/i
  content = content.replace(new RegExp(giePattern1.source + '[\s\S]*?<\/script>', 'gi'), '')
  // Second pass: catch any remaining scripts with gie
  content = content.replace(/<script[^>]*>[\s\S]*?gie[\s\S]*?<\/script>/gi, '')
  
  // Remove img tags and figure tags containing images
  content = content.replace(/<figure[^>]*>[\s\S]*?<\/figure>/gi, '')
  content = content.replace(/<img[^>]*>/gi, '')
  content = content.replace(/<picture[^>]*>[\s\S]*?<\/picture>/gi, '')
  
  // Remove "RapNews" or "rap news" text (case insensitive)
  content = content.replace(/RapNews/gi, '')
  content = content.replace(/rap news/gi, '')
  content = content.replace(/Rap News/gi, '')
  
  // Clean up WordPress-specific classes and improve formatting
  // BUT preserve classes and styles inside Getty Images placeholders AND person-link classes
  content = content.replace(/class="[^"]*"/gi, (match, offset, string) => {
    // If this is near a Getty placeholder, preserve it
    const context = string.substring(Math.max(0, offset - 200), Math.min(string.length, offset + 200))
    if (context.includes('GETTY_IMAGE_PLACEHOLDER') || context.includes('gie-single') || context.includes('gettyimages.com') || context.includes('person-link')) {
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
    const titleString = typeof titleText === 'string' ? titleText : titleText.rendered || ''
    const cleanTitle = titleString.replace(/<[^>]*>/g, '').trim()
    // Create pattern to match title in various formats
    const titlePattern = new RegExp(`<p>\\s*${cleanTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</p>\\s*`, 'gi')
    content = content.replace(titlePattern, '')
  }
  
  // Restore Getty Images divs at the beginning (before any content)
  // ArticleCard will extract it and show it at the top, then remove it from content
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

  // Apply defensive CTA fix as last step
  content = forceCanonicalCTA(content)
  
  // Link person names in content (if people are mentioned)
  console.log(`[convertWordPressPost] 🔗 Before person linking: peopleMentioned.length = ${peopleMentioned.length}`)
  console.log(`[convertWordPressPost] 🔗 Content preview before linking (first 300 chars):`, content.substring(0, 300))
  
  if (peopleMentioned.length > 0) {
    const { transformHtmlWithPersonLinks } = await import('./person-links')
    const beforeLength = content.length
    console.log(`[convertWordPressPost] 🔗 Calling transformHtmlWithPersonLinks with ${peopleMentioned.length} people`)
    const result = await transformHtmlWithPersonLinks(content, peopleMentioned)
    content = result.html
    const afterLength = content.length
    console.log(`[convertWordPressPost] ✅ After person linking: content length ${beforeLength} -> ${afterLength}, links added: ${result.linkCount}`)
    console.log(`[convertWordPressPost] ✅ Contains person-link: ${content.includes('person-link')}`)
    console.log(`[convertWordPressPost] ✅ Contains /person/: ${content.includes('/person/')}`)
    console.log(`[convertWordPressPost] ✅ Content preview after linking (first 500 chars):`, content.substring(0, 500))
    
    // Count person-link instances
    const personLinkMatches = content.match(/class="person-link"/g) || []
    console.log(`[convertWordPressPost] ✅ Person-link class count: ${personLinkMatches.length}`)
  } else {
    console.log(`[convertWordPressPost] ⚠️  No people mentioned, skipping person linking`)
    console.log(`[convertWordPressPost] ⚠️  This is why person-link classes are missing!`)
  }

  return {
    id: post.id.toString(),
    slug: post.slug,
    title: title,
    image: imageUrl,
    category: category.toUpperCase(),
    author: 'Rap News',
    date: formattedDate,
    rawDate: post.date, // Store original ISO date for sorting
    comments: 0, // WordPress REST API doesn't include comment count by default
    content: content,
    gettyAnchorHtml: gettyAnchorHtml,
    gettyWidgetConfig: gettyWidgetConfig,
  }
}

// Force canonical CTA - defensive fix to ensure CTA is always correct
function forceCanonicalCTA(html: string): string {
  if (!html || typeof html !== 'string') return html

  const canonicalCTA = '<p>Be sure to stay updated on the entire story — check in daily at <a href="https://rapnews.com" target="_blank" rel="noopener noreferrer">RapNews.com</a>.</p>'

  // Check if canonical CTA already exists and is correct
  if (html.includes('href="https://rapnews.com"') && 
      html.includes('target="_blank"') &&
      html.includes('>RapNews.com</a>')) {
    // Already has correct CTA, but ensure there's only one
    const ctaCount = (html.match(/Be sure to stay updated/gi) || []).length
    if (ctaCount === 1) {
      return html // Already perfect
    }
  }

  // Remove any existing CTA-like paragraphs/sentences near the end
  // Match paragraphs containing CTA keywords
  let cleaned = html
    .replace(/<p[^>]*>[^<]*(Be sure to stay updated|check in daily)[\s\S]*?<\/p>/gi, '')
    .replace(/(Be sure to stay updated|check in daily)[\s\S]*$/gi, '')
    .trim()

  // Remove trailing closing tags if any
  cleaned = cleaned.replace(/<\/p>\s*$/g, '')
  cleaned = cleaned.trim()

  // Remove trailing period if present
  if (cleaned.endsWith('.')) {
    cleaned = cleaned.slice(0, -1).trim()
  }

  // Ensure content ends cleanly (close any open tags if needed)
  if (cleaned.length > 0 && !cleaned.endsWith('</p>') && !cleaned.endsWith('>')) {
    // If last character is not a closing tag, ensure we have proper structure
    if (!cleaned.match(/<\/[^>]+>$/)) {
      cleaned = cleaned + '</p>'
    }
  }

  // Append canonical CTA
  return cleaned + '\n' + canonicalCTA
}

// Fetch a single post by slug
export async function fetchWordPressPostBySlug(slug: string): Promise<Article | null> {
  try {
    // Use direct Bluehost URL to bypass Vercel Security Checkpoint
    const url = `${WORDPRESS_API_URL}/posts?slug=${encodeURIComponent(slug)}&_embed=1`
    
    console.log(`[fetchWordPressPostBySlug] Fetching: ${url}`)
    
    const res = await fetch(url, {
      headers: wpHeaders(),
      next: { revalidate: 60 },
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[WP] fetchWordPressPostBySlug failed', { slug, status: res.status, body: body.slice(0, 300) })
      return null
    }

    const posts = (await res.json()) as WordPressPost[]
    
    if (!posts || posts.length === 0) {
      console.log(`[fetchWordPressPostBySlug] No post found for slug: ${slug}`)
      return null
    }

    console.log(`[fetchWordPressPostBySlug] Post found: ${posts[0].id} - ${posts[0].title?.rendered || posts[0].title}`)
    
    return await convertWordPressPost(posts[0])
  } catch (error) {
    console.error('[fetchWordPressPostBySlug] Error fetching WordPress post:', error)
    if (error instanceof Error) {
      console.error('[fetchWordPressPostBySlug] Error message:', error.message)
      console.error('[fetchWordPressPostBySlug] Error stack:', error.stack)
    }
    return null
  }
}

// Fetch tag by slug (for /person pages)
export async function fetchTagBySlug(tagSlug: string) {
  // Use direct Bluehost URL to bypass Vercel Security Checkpoint
  const WORDPRESS_BACKEND_URL = process.env.WORDPRESS_URL || 'https://tsf.dvj.mybluehost.me'
  // Request meta fields explicitly
  const url = `${WORDPRESS_BACKEND_URL}/wp-json/wp/v2/tags?slug=${encodeURIComponent(tagSlug)}&_fields=id,name,slug,meta,count`;

  console.log(`[fetchTagBySlug] Fetching: ${url}`)
  
  try {
    const res = await fetchWithTimeout(url, {
      headers: wpHeaders(),
      cache: 'no-store',
    }, 10000);

    if (!res.ok) {
      const body = await readResTextSafe(res);
      throw new Error(`WP fetch failed ${res.status} ${url}: ${body.slice(0, 300)}`);
    }

    const text = await res.text();
    const tags = parseJSONSafe(text, url) as any[];
    const tag = tags?.[0] ?? null;
    console.log(`[fetchTagBySlug] Tag result:`, tag ? { id: tag.id, name: tag.name, slug: tag.slug, count: tag.count, hasMeta: !!tag.meta, meta: tag.meta } : 'null')
    return tag;
  } catch (error) {
    console.error('[WP] fetchTagBySlug error:', error);
    if (error instanceof Error) {
      throw new Error(`fetchTagBySlug failed: ${error.message}`);
    }
    throw error;
  }
}

// Fetch tags by search query (name-based search)
export async function fetchTagsBySearch(query: string) {
  const WORDPRESS_BACKEND_URL = process.env.WORDPRESS_URL || 'https://tsf.dvj.mybluehost.me'
  const url = `${WORDPRESS_BACKEND_URL}/wp-json/wp/v2/tags?search=${encodeURIComponent(query)}&per_page=100&_fields=id,name,slug,count`;

  console.log(`[fetchTagsBySearch] Fetching: ${url}`)
  
  try {
    const res = await fetchWithTimeout(url, {
      headers: wpHeaders(),
      cache: 'no-store',
    }, 10000);

    if (!res.ok) {
      const body = await readResTextSafe(res);
      throw new Error(`WP fetch failed ${res.status} ${url}: ${body.slice(0, 300)}`);
    }

    const text = await res.text();
    const tags = parseJSONSafe(text, url) as any[];
    console.log(`[fetchTagsBySearch] Found ${tags.length} tags for query: "${query}"`)
    return tags;
  } catch (error) {
    console.error('[WP] fetchTagsBySearch error:', error);
    if (error instanceof Error) {
      throw new Error(`fetchTagsBySearch failed: ${error.message}`);
    }
    throw error;
  }
}

// Fetch posts by tag ID(s) - supports single ID or comma-separated list
export async function fetchPostsByTagId(tagId: number | number[], perPage = 50, page = 1) {
  // Use direct Bluehost URL to bypass Vercel Security Checkpoint
  const WORDPRESS_BACKEND_URL = process.env.WORDPRESS_URL || 'https://tsf.dvj.mybluehost.me'
  
  // WordPress supports comma-separated tag IDs in the tags parameter
  const tagIdsParam = Array.isArray(tagId) ? tagId.join(',') : tagId.toString()
  
  const url =
    `${WORDPRESS_BACKEND_URL}/wp-json/wp/v2/posts` +
    `?tags=${tagIdsParam}` +
    `&per_page=${perPage}` +
    `&page=${page}` +
    `&_embed=1` +
    `&orderby=date` +
    `&order=desc` +
    `&_fields=id,slug,date,title,excerpt,content,tags,featured_media`;

  const debug: {
    url: string;
    tagId: number | number[];
    status?: number;
    wpTotal?: string | null;
    wpTotalPages?: string | null;
  } = {
    url,
    tagId,
  };

  try {
    const res = await fetchWithTimeout(url, {
      headers: wpHeaders(),
      cache: 'no-store',
    }, 10000);

    debug.status = res.status;
    debug.wpTotal = res.headers.get('x-wp-total');
    debug.wpTotalPages = res.headers.get('x-wp-totalpages');

    if (!res.ok) {
      const body = await readResTextSafe(res);
      throw new Error(`WP fetch failed ${res.status} ${url}: ${body.slice(0, 300)}`);
    }

    const text = await res.text();
    const posts = parseJSONSafe(text, url) as any[];
    console.log(`[fetchPostsByTagId] Fetched ${posts.length} posts for tag ${tagId}`);
    return { posts, debug };
  } catch (error) {
    console.error('[WP] fetchPostsByTagId error:', error);
    if (error instanceof Error) {
      console.error('[WP] fetchPostsByTagId failed', { ...debug, error: error.message });
    }
    // Return empty array on error so page can still render
    return { posts: [], debug };
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

