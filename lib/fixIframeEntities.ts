/**
 * Fix HTML entity encoding in iframe src attributes
 * 
 * WordPress/Next.js may encode & as &amp; in iframe src attributes,
 * which breaks Getty's signature validation and causes 400 errors.
 * 
 * This function:
 * 1. Finds all iframe[src*="embed.gettyimages.com"] elements
 * 2. Decodes HTML entities in their src attributes
 * 3. Returns the fixed HTML
 */

export function fixIframeEntities(html: string): string {
  if (!html || typeof html !== 'string') {
    return html;
  }

  // Use regex to find and fix iframe src attributes
  // Pattern: <iframe ... src="..." ...>
  const iframePattern = /<iframe([^>]*src=["']([^"']*embed\.gettyimages\.com[^"']*)["'][^>]*)>/gi;
  
  return html.replace(iframePattern, (match, attributes, srcValue) => {
    // Decode HTML entities in the src value
    let fixedSrc = srcValue
      .replace(/&amp;/g, '&')           // &amp; -> &
      .replace(/&lt;/g, '<')            // &lt; -> <
      .replace(/&gt;/g, '>')            // &gt; -> >
      .replace(/&quot;/g, '"')          // &quot; -> "
      .replace(/&#39;/g, "'")           // &#39; -> '
      .replace(/&#x27;/g, "'")          // &#x27; -> '
      .replace(/&#x2F;/g, '/')          // &#x2F; -> /
      .replace(/&#x3D;/g, '=')          // &#x3D; -> =
      .replace(/&#x3F;/g, '?')          // &#x3F; -> ?
      .replace(/&#x26;/g, '&');         // &#x26; -> &
    
    // Replace the src value in the attributes
    const fixedAttributes = attributes.replace(
      /src=["']([^"']*embed\.gettyimages\.com[^"']*)["']/i,
      (srcMatch, originalSrc) => {
        return srcMatch.replace(originalSrc, fixedSrc);
      }
    );
    
    return `<iframe${fixedAttributes}>`;
  });
}
