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

  // KILL SWITCH: If DISABLE_GETTY_NORMALIZE is set, return original HTML unchanged
  if (process.env.DISABLE_GETTY_NORMALIZE === '1') {
    return html;
  }

  // SAFER APPROACH: Only do string replacement on iframe src attributes (no cheerio parsing)
  // This avoids breaking HTML structure
  if (!html.includes('embed.gettyimages.com/embed/')) {
    return html;
  }

  let foundFirstIframe = false;
  let debugComment = '';

  // Extract and normalize each iframe src using regex (safer than parsing entire HTML)
  const iframeSrcRegex = /(<iframe\b[^>]*\bsrc=["'])(https?:\/\/embed\.gettyimages\.com\/embed\/[^"']+)(["'][^>]*>)/gi;
  
  const normalizedHtml = html.replace(iframeSrcRegex, (match, prefix, src, suffix) => {
    try {
      // Step 1: Decode HTML entities in src (only &amp; -> & for now)
      let fixedSrc = src.replace(/&amp;/g, '&');
      
      // Step 2: Normalize URL using URL API
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
      
      // Add debug comment for first iframe (only if we successfully normalized)
      if (debugMode && !foundFirstIframe) {
        debugComment = `<!-- getty_iframe_src: ${fixedSrc} -->\n`;
        console.log('[fixIframeEntities] Normalized Getty iframe src:', fixedSrc);
        foundFirstIframe = true;
      }
      
      // Return the normalized iframe tag
      return prefix + fixedSrc + suffix;
    } catch (error) {
      // If URL parsing fails, return original match unchanged
      console.error('[fixIframeEntities] Failed to normalize URL:', error);
      return match;
    }
  });

  // Prepend debug comment before first iframe if found
  if (debugMode && debugComment && normalizedHtml.includes('<iframe')) {
    const firstIframeIndex = normalizedHtml.indexOf('<iframe');
    return normalizedHtml.slice(0, firstIframeIndex) + debugComment + normalizedHtml.slice(firstIframeIndex);
  }

  return normalizedHtml;
}
