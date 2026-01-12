import he from 'he'

/**
 * Decode HTML entities to their actual characters
 * Examples: &#8220; → ", &#8217; → ', &amp; → &
 */
export function decodeHtmlEntities(str: string): string {
  if (!str) return ''
  return he.decode(str, { strict: false })
}

/**
 * Strip HTML tags from a string, returning plain text
 * Server-safe implementation using regex (works in Next.js server components)
 */
export function stripHtml(str: string): string {
  if (!str) return ''
  return str.replace(/<[^>]*>/g, '')
}

/**
 * Clean and normalize text for display in list views
 * - Strips HTML
 * - Decodes entities
 * - Removes markdown artifacts
 * - Normalizes whitespace
 * - Truncates to max length
 */
export function cleanTextForDisplay(
  text: string,
  maxLength: number = 160
): string {
  if (!text) return ''
  
  // Step 1: Strip HTML
  let cleaned = stripHtml(text)
  
  // Step 2: Decode HTML entities
  cleaned = decodeHtmlEntities(cleaned)
  
  // Step 3: Remove markdown artifacts
  cleaned = cleaned
    .replace(/\*\*+/g, '') // Remove ** and **** (bold markdown)
    .replace(/\\+"/g, '"')  // Unescape quotes: \" → "
    .replace(/\\+'/g, "'")  // Unescape apostrophes: \' → '
    .replace(/\\+/g, '')    // Remove other backslashes
  
  // Step 4: Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim()
  
  // Step 5: Truncate if needed
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength).trim() + '...'
  }
  
  return cleaned
}
