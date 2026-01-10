import * as cheerio from 'cheerio';

/**
 * Slugify person name for URL
 */
export function slugifyPerson(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
}

/**
 * Transform HTML to link person names
 * Uses cheerio to safely parse HTML and only modify text nodes
 */
export function transformHtmlWithPersonLinks(html: string, people: Array<{ name: string; slug: string }>): string {
  if (!html || !people || people.length === 0) {
    console.log('[transformHtmlWithPersonLinks] No people provided, returning HTML unchanged')
    return html
  }

  console.log(`[transformHtmlWithPersonLinks] Processing ${people.length} people: ${people.map(p => p.name).join(', ')}`)

  // Sort people by length DESC (so "Lil Baby" matches before "Lil")
  const sortedPeople = [...people].sort((a, b) => b.name.length - a.name.length)

  // Load HTML into cheerio
  const $ = cheerio.load(html, {
    decodeEntities: false, // Preserve HTML entities
  })

  let replacementsMade = 0

  // Process each person name
  for (const person of sortedPeople) {
    const escapedName = person.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const slug = person.slug
    // Use word boundary regex
    const pattern = new RegExp(`\\b${escapedName}\\b`, 'gi')

    // Process all text nodes directly
    $('body').find('*').contents().each((_, node) => {
      // Only process text nodes
      if (node.type !== 'text') {
        return
      }

      const $node = $(node)
      const $parent = $node.parent()
      const parentElement = $parent[0]
      
      // Check if parent is an element (not a text node)
      if (!parentElement || parentElement.type !== 'tag') {
        return
      }
      
      const parentTag = (parentElement as any).tagName?.toLowerCase()

      // Skip if parent is an excluded tag
      if (
        parentTag === 'a' ||
        parentTag === 'script' ||
        parentTag === 'style' ||
        parentTag === 'code' ||
        parentTag === 'pre' ||
        parentTag === 'h1' ||
        parentTag === 'h2' ||
        parentTag === 'h3' ||
        parentTag === 'h4' ||
        parentTag === 'h5' ||
        parentTag === 'h6'
      ) {
        return // Skip if inside excluded tag
      }

      // Get text content
      const text = $node.text()
      if (!text || !pattern.test(text)) {
        return // Person name not found
      }

      // Replace person name with link in text
      const newText = text.replace(pattern, (match) => {
        replacementsMade++
        // Replace with link
        return `<a href="/person/${slug}" class="person-link">${match}</a>`
      })

      // Replace text node with new HTML if changed
      if (newText !== text) {
        $node.replaceWith(newText)
      }
    })
  }

  console.log(`[transformHtmlWithPersonLinks] Made ${replacementsMade} replacements`)

  // Get the body content (cheerio wraps in <html><body>)
  const bodyHtml = $('body').html() || html
  return bodyHtml
}

// Legacy function for backwards compatibility
export function linkPersonNames(html: string, people: string[]): string {
  const peopleWithSlugs = people.map(name => ({
    name,
    slug: slugifyPerson(name)
  }))
  return transformHtmlWithPersonLinks(html, peopleWithSlugs)
}
