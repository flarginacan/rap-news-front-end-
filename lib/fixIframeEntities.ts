/**
 * Fix HTML entity encoding in iframe src attributes
 * 
 * WordPress/Next.js may encode & as &amp; in iframe src attributes,
 * which breaks Getty's signature validation and causes 400 errors.
 * 
 * This function:
 * 1. Uses cheerio to parse HTML (server-side safe, deterministic)
 * 2. Finds all iframe[src*="embed.gettyimages.com"] elements
 * 3. Decodes HTML entities ONLY in their src attributes
 * 4. Returns the fixed HTML
 */

import * as cheerio from 'cheerio';

export function fixIframeEntities(html: string): string {
  if (!html || typeof html !== 'string') {
    return html;
  }

  // Use cheerio for reliable HTML parsing (server-side safe)
  const $ = cheerio.load(html, { decodeEntities: false });
  let foundFirstIframe = false;
  
  // Find and fix all Getty iframe src attributes
  $('iframe[src*="embed.gettyimages.com"]').each((_, element) => {
    const $iframe = $(element);
    let src = $iframe.attr('src');
    
    if (src) {
      // Decode HTML entities in src (at minimum: &amp; -> &)
      const fixedSrc = src
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
      
      $iframe.attr('src', fixedSrc);
      
      // TEMP dev-only log: print first iframe src after fix
      if (!foundFirstIframe && process.env.NODE_ENV !== 'production') {
        console.log('[fixIframeEntities] First Getty iframe src after fix:', fixedSrc);
        foundFirstIframe = true;
      }
    }
  });
  
  return $.html();
}
