/**
 * Fix HTML entity encoding and normalize Getty iframe URLs
 * 
 * WordPress/Next.js may encode & as &amp; in iframe src attributes,
 * which breaks Getty's signature validation and causes 400 errors.
 * 
 * This function:
 * 1. Uses cheerio to parse HTML (server-side safe, deterministic)
 * 2. Finds all iframe[src*="embed.gettyimages.com/embed/"] elements
 * 3. Decodes HTML entities ONLY in their src attributes
 * 4. Normalizes URL to ensure tld=com and caption=false are present
 * 5. Returns the fixed HTML with optional debug comments
 */

import * as cheerio from 'cheerio';

export function fixIframeEntities(html: string, debugMode: boolean = false): string {
  if (!html || typeof html !== 'string') {
    return html;
  }

  // Use cheerio for reliable HTML parsing (server-side safe)
  const $ = cheerio.load(html, { decodeEntities: false });
  let foundFirstIframe = false;
  
  // Find and fix all Getty iframe src attributes
  $('iframe[src*="embed.gettyimages.com/embed/"]').each((_, element) => {
    const $iframe = $(element);
    let src = $iframe.attr('src');
    
    if (src) {
      // Step 1: Decode HTML entities in src (at minimum: &amp; -> &)
      let fixedSrc = src
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
      
      // Step 2: Normalize URL using URL API
      try {
        const url = new URL(fixedSrc);
        
        // Ensure tld=com is present
        if (!url.searchParams.has('tld')) {
          url.searchParams.set('tld', 'com');
        }
        
        // Ensure caption=false is present
        if (!url.searchParams.has('caption')) {
          url.searchParams.set('caption', 'false');
        }
        
        // DO NOT touch et or sig values - they must remain unchanged
        
        fixedSrc = url.toString();
      } catch (error) {
        // If URL parsing fails, log but keep the decoded src
        console.error('[fixIframeEntities] Failed to normalize URL:', error);
      }
      
      $iframe.attr('src', fixedSrc);
      
      // Add debug comment above iframe if debug mode is enabled
      if (debugMode && !foundFirstIframe) {
        const debugComment = `<!-- getty_iframe_src: ${fixedSrc} -->`;
        $iframe.before(debugComment);
        foundFirstIframe = true;
      }
      
      // Log in production if debug mode (for server console)
      if (debugMode && !foundFirstIframe) {
        console.log('[fixIframeEntities] Normalized Getty iframe src:', fixedSrc);
        foundFirstIframe = true;
      }
    }
  });
  
  return $.html();
}
