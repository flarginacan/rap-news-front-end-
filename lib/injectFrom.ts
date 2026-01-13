/**
 * Injects ?from= parameter into entity links in HTML content
 * This is a pass-through function for now - can be enhanced later if needed
 */
export function injectFromIntoEntityLinks(html: string, articleSlug: string): string {
  if (!html || !articleSlug) return html
  
  // Simple pass-through for now - can be enhanced later
  // This function was previously used to inject ?from= parameters into entity links
  // but that functionality may not be needed anymore
  return html
}
