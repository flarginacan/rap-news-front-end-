/**
 * SAFE string-based transformer for Getty iframe src normalization
 * 
 * ONLY edits iframe src attributes - does NOT parse/rebuild HTML trees.
 * This prevents cheerio or other HTML parsers from stripping iframes.
 * 
 * Rules:
 * - If html is falsy -> return as-is
 * - Find all iframe tags with src containing embed.gettyimages.com/embed/
 * - For each matched src:
 *   a) Decode entities: &amp; -> &
 *   b) Normalize URL: ensure tld=com, caption=false
 *   c) Replace exact original src substring
 * - Return original html with only src edits
 */

export function normalizeGettyIframesInHtml(html: string | null | undefined, debug: boolean = false): string {
  // If html is falsy -> return as-is
  if (!html || typeof html !== 'string') {
    return html || '';
  }

  // CRITICAL: Only process if HTML contains Getty embed URLs
  if (!html.includes('embed.gettyimages.com/embed/')) {
    return html;
  }

  // Find all iframe src attributes with Getty embeds using simple string replacement
  // Pattern: src="...embed.gettyimages.com/embed/..."
  // Use replace with a function to handle each match
  const normalizedHtml = html.replace(
    /(\ssrc=["'])([^"']*embed\.gettyimages\.com\/embed\/[^"']*)(["'])/gi,
    (match, prefix, src, suffix) => {
      try {
        // a) Decode entities ONLY in the src string: replace all "&amp;" -> "&"
        let decodedSrc = src.replace(/&amp;/g, '&');
        decodedSrc = decodedSrc.replace(/&#038;/g, '&');
        decodedSrc = decodedSrc.replace(/&#x26;/g, '&');

        // b) Ensure caption=false and tld=com (safe transform, doesn't touch et/sig)
        // Use URLSearchParams but preserve order and don't re-serialize unnecessarily
        const qIndex = decodedSrc.indexOf('?');
        if (qIndex === -1) {
          // No query string, add one
          const normalizedSrc = `${decodedSrc}?tld=com&caption=false`;
          return `${prefix}${normalizedSrc}${suffix}`;
        }
        
        const baseUrl = decodedSrc.slice(0, qIndex);
        const query = decodedSrc.slice(qIndex + 1);
        const params = new URLSearchParams(query);
        
        // Only set caption and tld (don't touch et/sig)
        params.set('caption', 'false');
        params.set('tld', 'com');
        
        const normalizedSrc = `${baseUrl}?${params.toString()}`;

        if (debug) {
          console.log(`[normalizeGettyIframes] Normalized iframe src:`, normalizedSrc.substring(0, 100));
        }

        // Return the normalized src attribute
        return `${prefix}${normalizedSrc}${suffix}`;
      } catch (e) {
        // If URL parsing fails, return original match unchanged
        if (debug) {
          console.warn(`[normalizeGettyIframes] Failed to normalize iframe src: ${src.substring(0, 100)}`, e);
        }
        return match;
      }
    }
  );

  if (debug && html !== normalizedHtml) {
    console.log(`[normalizeGettyIframes] Processed Getty iframe(s)`);
  }

  return normalizedHtml;
}

/**
 * Add debug comment before first Getty iframe (for debug_getty=1)
 * Returns HTML with comment inserted DIRECTLY before first <iframe> tag
 */
export function addGettyDebugComment(html: string, debug: boolean = false): string {
  if (!debug || !html) {
    return html;
  }

  // Find first Getty iframe
  const iframePattern = /<iframe([^>]*)\s+src=["']([^"']*embed\.gettyimages\.com\/embed\/[^"']*)["']/i;
  const match = html.match(iframePattern);
  
  if (!match) {
    return html;
  }

  // Extract normalized src for comment
  let src = match[2];
  src = src.replace(/&amp;/g, '&').replace(/&#038;/g, '&').replace(/&#x26;/g, '&');
  
  try {
    const url = new URL(src);
    if (!url.searchParams.has('tld')) url.searchParams.set('tld', 'com');
    if (!url.searchParams.has('caption')) url.searchParams.set('caption', 'false');
    src = url.toString();
  } catch (e) {
    // Keep original if URL parsing fails
  }

  // Insert comment DIRECTLY before the iframe tag (not inside it)
  const comment = `<!-- getty_iframe_src: ${src} -->\n`;
  const iframeIndex = html.indexOf(match[0]);
  
  if (iframeIndex !== -1) {
    // Find the start of the iframe tag (might be on previous line)
    let insertIndex = iframeIndex;
    // Go back to find start of line or tag
    while (insertIndex > 0 && html[insertIndex - 1] !== '>' && html[insertIndex - 1] !== '\n') {
      insertIndex--;
    }
    
    return html.slice(0, insertIndex) + comment + html.slice(insertIndex);
  }

  return html;
}
