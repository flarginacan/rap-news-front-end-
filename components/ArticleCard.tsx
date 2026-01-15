'use client'

import { Article } from '@/types'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { injectFromIntoEntityLinks } from '@/lib/injectFrom'
import GettyWidgetEmbed from './GettyWidgetEmbed'
import ShareButton from './ShareButton'

interface ArticleCardProps {
  article: Article
  showLink?: boolean
  id?: string // Optional id for scrolling to pinned articles
}

// Simple markdown to HTML converter for basic formatting
function markdownToHtml(markdown: string): string {
  let html = markdown
  
  // CRITICAL: Only bold quotes (text within quotation marks)
  // First, remove bolding from anything that's not a quote
  html = html.replace(/\*\*([^*"]+?)\*\*/g, (match, text) => {
    // If it's not a quote (doesn't start/end with quotes), remove the bolding
    const trimmed = text.trim();
    if (!trimmed.startsWith('"') && !trimmed.endsWith('"') && !trimmed.startsWith("'") && !trimmed.endsWith("'")) {
      return text; // Remove bolding from non-quotes
    }
    return match; // Keep bolding on quotes
  });
  
  // Now bold quotes that aren't already bolded
  html = html.replace(/"([^"]+)"/g, (match, quoteText) => {
    // Check if this quote is already bolded
    const beforeMatch = html.substring(Math.max(0, html.indexOf(match) - 20), html.indexOf(match));
    const afterMatch = html.substring(html.indexOf(match) + match.length, html.indexOf(match) + match.length + 20);
    const context = beforeMatch + match + afterMatch;
    
    // If already bolded, don't change it
    if (context.includes(`**"${quoteText}"**`) || context.includes(`<strong>"${quoteText}"</strong>`)) {
      return match;
    }
    
    // Bold the quote
    return `**"${quoteText}"**`;
  });
  
  // Convert bold markdown to HTML (only for quotes now)
  html = html.replace(/\*\*"([^"]+)"\*\*/g, '<strong class="font-bold">"$1"</strong>')
  html = html.replace(/\*\*'([^']+)'\*\*/g, "<strong class='font-bold'>'$1'</strong>")
  
  // Remove any remaining bold markdown that's not a quote
  html = html.replace(/\*\*([^*]+)\*\*/g, '$1')
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-red-600 underline hover:text-red-700" target="_blank" rel="noopener noreferrer">$1</a>')
  
  // Headers (process in reverse order to avoid conflicts)
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-8 mb-4 text-black">$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-8 mb-4 text-black">$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-8 mb-4 text-black">$1</h1>')
  
  // Lists and paragraphs
  const lines = html.split('\n')
  let inList = false
  let result: string[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Skip empty lines
    if (!line) {
      continue
    }
    
    // Check if line is already HTML (header, link, etc.)
    const isHtml = line.match(/^<[^>]+>/)
    
    if (line.startsWith('* ') || line.startsWith('- ')) {
      if (!inList) {
        result.push('<ul class="list-disc ml-6 mb-4 space-y-2">')
        inList = true
      }
      const listItem = line.replace(/^[\*\-]\s+/, '')
      result.push(`<li class="ml-2">${listItem}</li>`)
    } else {
      if (inList) {
        result.push('</ul>')
        inList = false
      }
      if (!isHtml && line) {
        result.push(`<p class="mb-4 leading-relaxed text-gray-800">${line}</p>`)
      } else if (line) {
        result.push(line)
      }
    }
  }
  
  if (inList) {
    result.push('</ul>')
  }
  
  html = result.join('\n')
  
  // Clean up empty paragraphs and fix double wrapping
  html = html.replace(/<p class="mb-4 leading-relaxed text-gray-800"><\/p>/g, '')
  html = html.replace(/<p class="mb-4 leading-relaxed text-gray-800">(<[^>]+>.*<\/[^>]+>)<\/p>/g, '$1')
  
  return html
}


// Clean WordPress HTML content
function extractGettyConfig(scriptContent: string): any | null {
  // Try to extract gie.widgets.load({ ... }) config
  const loadMatch = scriptContent.match(/gie\.widgets\.load\s*\(\s*\{([^}]+)\}\s*\)/);
  if (!loadMatch) return null;

  const configStr = `{${loadMatch[1]}}`;
  try {
    // Replace single quotes with double quotes for JSON
    const jsonStr = configStr
      .replace(/'/g, '"')
      .replace(/(\w+):/g, '"$1":') // Add quotes to keys
      .replace(/:\s*"([^"]+)"/g, (match, val) => {
        // Handle numeric values
        if (/^\d+$/.test(val)) return `:${val}`;
        if (val === 'true' || val === 'false') return `:${val}`;
        return match;
      });
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function transformGettyEmbed(html: string): string {
  let transformed = html;

  // CRITICAL: Force caption: false in all Getty embed code
  // Replace caption: true with caption: false in widget.load calls
  transformed = transformed.replace(/caption:\s*true/gi, 'caption: false');
  // Replace caption=true with caption=false in iframe URLs
  transformed = transformed.replace(/caption=true/gi, 'caption=false');
  // Replace caption:true (no space) with caption:false
  transformed = transformed.replace(/caption:true/gi, 'caption:false');

  // Pattern 1: New format - getty-embed-wrap with iframe (keep as-is, just ensure structure)
  transformed = transformed.replace(
    /<div[^>]*class=["'][^"']*getty-embed-wrap[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
    (match) => {
      // If it already has an iframe, keep it
      if (match.includes('<iframe')) {
        return match;
      }
      return match;
    }
  );

  // Pattern 2: Old format - gie-single anchor + scripts
  transformed = transformed.replace(
    /<a[^>]*class=["'][^"']*\bgie-single\b[^"']*["'][^>]*>[\s\S]*?<\/a>\s*(?:<script[^>]*>[\s\S]*?<\/script>\s*)*/gi,
    (match) => {
      // Extract the config from scripts
      const scriptMatch = match.match(/<script[^>]*>([\s\S]*?)<\/script>/);
      if (scriptMatch) {
        const config = extractGettyConfig(scriptMatch[1]);
        if (config) {
          // Extract image ID from the anchor href or config
          const imageId = config.items || match.match(/items:\s*['"](\d+)['"]/)?.[1] || '';
          if (imageId) {
            return `<div class="getty-embed-wrap"><div class="getty-gie" data-gie='${JSON.stringify(config)}'></div></div>`;
          }
        }
      }
      // If we can't parse, remove it
      return '';
    }
  );

  // Pattern 3: Scripts with gie.widgets.load - convert to placeholder
  transformed = transformed.replace(
    /<script[^>]*>[\s\S]*?\bgie\.widgets\.load\s*\([^)]+\)[\s\S]*?<\/script>/gi,
    (match) => {
      const config = extractGettyConfig(match);
      if (config) {
        return `<div class="getty-embed-wrap"><div class="getty-gie" data-gie='${JSON.stringify(config)}'></div></div>`;
      }
      return '';
    }
  );

  // Remove any remaining Getty scripts (widgets.js loader)
  transformed = transformed.replace(
    /<script[^>]*src=["'][^"']*embed-cdn\.gettyimages\.com\/widgets\.js[^"']*["'][^>]*>\s*<\/script>/gi,
    ''
  );

  return transformed;
}

function cleanWordPressContent(html: string): string {
  // Debug: Check if person-link exists before cleaning
  const beforeClean = html.includes('person-link')
  console.log('🔍 [cleanWordPressContent] Before clean: has person-link?', beforeClean)
  
  // CRITICAL: Decode HTML entities FIRST - WordPress may have encoded them
  // We need REAL HTML (<div>, <iframe>), not escaped text (&lt;div&gt;)
  let decoded = html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&nbsp;/g, ' ')
  
  // If content looks like HTML (has tags), clean it up
  if (decoded.includes('<') && decoded.includes('>')) {
    // STEP 1: Transform Getty embeds to safe placeholders BEFORE sanitizing
    let transformed = transformGettyEmbed(decoded);
    
    // STEP 2: Preserve getty-embed-wrap and getty-credit divs (they're already safe)
    const gettyBlocks: string[] = [];
    transformed = transformed.replace(
      /<div[^>]*class=["'][^"']*getty-embed-wrap[^"']*["'][^>]*>[\s\S]*?<\/div>\s*(?:<div[^>]*class=["'][^"']*getty-credit[^"']*["'][^>]*>[\s\S]*?<\/div>)?/gi,
      (match) => {
        const key = `__GETTY_SAFE_${gettyBlocks.length}__`;
        gettyBlocks.push(match);
        return key;
      }
    );
    
    // STEP 3: Run sanitization on content
    let cleaned = transformed;
    
    // Remove WordPress-specific classes and inline styles
    // BUT preserve getty-embed-wrap, getty-credit, AND person-link classes
    cleaned = cleaned.replace(/class="[^"]*"/gi, (match, offset, string) => {
      const context = string.substring(Math.max(0, offset - 100), Math.min(string.length, offset + 100));
      // Preserve Getty classes AND person-link classes
      if (context.includes('getty-embed-wrap') || context.includes('getty-credit') || context.includes('getty-gie') || context.includes('person-link')) {
        return match; // Preserve these classes
      }
      return '';
    });
    cleaned = cleaned.replace(/style="[^"]*"/gi, (match, offset, string) => {
      const context = string.substring(Math.max(0, offset - 100), Math.min(string.length, offset + 100));
      if (context.includes('getty-embed-wrap') || context.includes('getty-credit') || context.includes('getty-gie')) {
        return match; // Preserve Getty styles
      }
      return '';
    });
    cleaned = cleaned.replace(/<p><\/p>/gi, '')
    cleaned = cleaned.replace(/<p>\s*<\/p>/gi, '')
    // Remove empty paragraphs
    cleaned = cleaned.replace(/<p>\s*<\/p>/gi, '')
    // Clean up excessive whitespace
    cleaned = cleaned.replace(/\s+/g, ' ')
    // Ensure proper spacing between elements
    cleaned = cleaned.replace(/<\/p>\s*<p>/gi, '</p>\n\n<p>')
    cleaned = cleaned.replace(/<\/h([1-6])>\s*<p>/gi, '</h$1>\n\n<p>')
    cleaned = cleaned.replace(/<\/div>\s*<p>/gi, '</div>\n\n<p>')
    // Remove WordPress block wrappers if present
    cleaned = cleaned.replace(/<!--\s*wp:[^>]*-->/gi, '')
    
    // Remove duplicate title paragraphs (they appear after the image)
    // This is a simple check - if we have a title-like paragraph right after the embed, remove it
    const titlePattern = /<p>\s*Exclusive:[\s\S]*?<\/p>\s*/gi
    cleaned = cleaned.replace(titlePattern, (match, offset, string) => {
      // Only remove if it appears early in the content (likely duplicate)
      if (offset < 500) {
        return ''
      }
      return match
    })
    
    // STEP 4: Restore Getty blocks
    gettyBlocks.forEach((block, i) => {
      cleaned = cleaned.replace(`__GETTY_SAFE_${i}__`, block);
    });
    
    // Debug: Check if person-link exists after cleaning
    const afterClean = cleaned.includes('person-link')
    console.log('🔍 [cleanWordPressContent] After clean: has person-link?', afterClean)
    if (beforeClean && !afterClean) {
      console.error('❌ [cleanWordPressContent] WARNING: person-link was removed during cleaning!')
    }
    
    return cleaned.trim()
  }
  // Otherwise, treat as markdown (but still decode entities first)
  const markdownResult = markdownToHtml(decoded)
  const afterMarkdown = markdownResult.includes('person-link')
  console.log('🔍 [cleanWordPressContent] After markdown: has person-link?', afterMarkdown)
  return markdownResult
}

export default function ArticleCard({ article, showLink = true, id }: ArticleCardProps) {
  const contentHtml = cleanWordPressContent(article.content)
  const contentRef = useRef<HTMLDivElement>(null)
  
  // Hard DOM debug + inline enforcement for person-link elements
  useEffect(() => {
    const root = contentRef.current
    if (!root) {
      console.log('❌ [person-link debug] contentRef is null')
      return
    }

    const htmlHasClass = typeof contentHtml === 'string' && contentHtml.includes('person-link')
    console.log('🔎 [person-link debug] contentHtml includes "person-link"?', htmlHasClass)

    const links = root.querySelectorAll('a.person-link, .person-link')
    console.log('✅ [person-link debug] DOM nodes found:', links.length)

    links.forEach((node) => {
      const el = node as HTMLElement
      // Force reliable underline (border) inline and remove bold
      el.style.textDecoration = 'none'
      el.style.borderBottom = '2px solid #dc2626'
      el.style.paddingBottom = '1px'
      el.style.color = '#dc2626'
      el.style.fontWeight = 'normal'
      
      // Also handle if person-link is inside a strong tag
      const parentStrong = el.closest('strong')
      if (parentStrong) {
        const strongEl = parentStrong as HTMLElement
        strongEl.style.fontWeight = 'normal'
      }
      
      // Also handle if strong is inside person-link
      const childStrong = el.querySelector('strong')
      if (childStrong) {
        const strongEl = childStrong as HTMLElement
        strongEl.style.fontWeight = 'normal'
      }
    })
  }, [contentHtml])
  
  // Check if content has a Getty Images embed (new format: getty-embed-wrap or old format: gie-single)
  const hasGettyImageInContent = contentHtml.includes('getty-embed-wrap') || 
                                  contentHtml.includes('embed.gettyimages.com') ||
                                  contentHtml.includes('gie-single') ||
                                  contentHtml.includes('gettyimages.com');
  
  // Extract Getty Images embed from content if present (including credit div)
  let gettyImageHtml = '';
  let contentWithoutGetty = contentHtml;
  const gettyImageRef = useRef<HTMLDivElement>(null);
  
  // Handle clicks on Getty images - copy article link instead of navigating
  // Also hide caption bar on mobile
  useEffect(() => {
    if (!gettyImageRef.current) return;
    
    const articleUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/article/${article.slug}`
      : `/article/${article.slug}`;
    
    // Add click handler to the container itself
    const handleClick = async (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Copy article URL to clipboard
      try {
        await navigator.clipboard.writeText(articleUrl);
        // Optional: Show a brief feedback (you could add a toast here)
        console.log('Article link copied to clipboard');
      } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = articleUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          console.log('Article link copied to clipboard (fallback)');
        } catch (fallbackErr) {
          console.error('Failed to copy link:', fallbackErr);
        }
        document.body.removeChild(textArea);
      }
      
      return false;
    };
    
    const container = gettyImageRef.current;
    container.addEventListener('click', handleClick);
    container.style.cursor = 'pointer';
    
    // Hide caption bar on mobile - look for elements containing "NEW YORK" or similar caption text
    const hideCaptionBar = () => {
      if (window.innerWidth > 640) return; // Only on mobile
      
      // Try to find and hide caption elements
      const allDivs = container.querySelectorAll('div');
      allDivs.forEach((div) => {
        const text = div.textContent || '';
        // Hide divs that contain location/date captions like "NEW YORK" or "MARCH"
        if (text.match(/NEW YORK|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER/i) && 
            text.length < 200) { // Caption text is usually short
          (div as HTMLElement).style.display = 'none';
        }
      });
      
      // Also hide any divs with "see more" links (part of caption bar)
      const allLinks = container.querySelectorAll('a');
      allLinks.forEach((link) => {
        const linkText = link.textContent?.toLowerCase() || '';
        const href = link.getAttribute('href') || '';
        // Check if link contains "see more" text or has "see" in href
        if (linkText.includes('see more') || href.includes('see')) {
          const parent = link.parentElement;
          if (parent && parent.textContent?.toLowerCase().includes('see more')) {
            parent.style.display = 'none';
          }
        }
      });
    };
    
    // Run immediately and after a delay (in case iframe loads content later)
    hideCaptionBar();
    setTimeout(hideCaptionBar, 1000);
    setTimeout(hideCaptionBar, 3000);
    
    // Detect and clip black padding by measuring visual content
    const detectAndClipBlackBars = () => {
      const iframe = container.querySelector('iframe[src*="embed.gettyimages.com"]') as HTMLIFrameElement;
      if (!iframe) return;
      
      // Use dimensions from config if available to set correct aspect ratio
      if (article.gettyWidgetConfig?.w && article.gettyWidgetConfig?.h) {
        const w = parseInt(article.gettyWidgetConfig.w.replace('px', '')) || 594;
        const h = parseInt(article.gettyWidgetConfig.h.replace('px', '')) || 396;
        if (w > 0 && h > 0) {
          const aspectRatio = w / h;
          
          // Calculate max height based on container width and aspect ratio
          const containerWidth = container.getBoundingClientRect().width || container.offsetWidth;
          const calculatedHeight = containerWidth / aspectRatio;
          const maxHeight = Math.min(calculatedHeight, 500); // Cap at 500px
          
          // Set container to match image aspect ratio to eliminate black bars
          container.style.aspectRatio = `${w} / ${h}`;
          container.style.maxHeight = `${maxHeight}px`;
          iframe.style.aspectRatio = `${w} / ${h}`;
          iframe.style.maxHeight = `${maxHeight}px`;
          console.log(`[Getty] Using config dimensions: ${w}x${h}, aspect ratio: ${aspectRatio.toFixed(2)}, max height: ${maxHeight}px`);
        }
      }
      
      // After iframe loads, try to clip black bars by measuring
      const measureAndClip = () => {
        const rect = iframe.getBoundingClientRect();
        // If iframe is very tall (likely has black bars), clip it
        // Typical image aspect ratios are 1.3-2.0, so if height is way more than expected, clip
        const expectedMaxHeight = rect.width / 1.3; // Minimum expected aspect ratio
        if (rect.height > expectedMaxHeight * 1.2) {
          // Likely has black bars, clip to expected height
          container.style.maxHeight = `${expectedMaxHeight}px`;
          container.style.overflow = 'hidden';
          iframe.style.maxHeight = `${expectedMaxHeight}px`;
          console.log(`[Getty] Clipped black bars: height was ${rect.height}px, clipped to ${expectedMaxHeight}px`);
        }
      };
      
      iframe.addEventListener('load', () => {
        setTimeout(measureAndClip, 500);
        setTimeout(measureAndClip, 1500);
      }, { once: true });
      
      // If already loaded
      if (iframe.complete || iframe.readyState === 'complete') {
        setTimeout(measureAndClip, 100);
      }
    };
    
    // Run detection after delays to allow iframe to load
    setTimeout(detectAndClipBlackBars, 1000);
    setTimeout(detectAndClipBlackBars, 2000);
    setTimeout(detectAndClipBlackBars, 3000);
    
    // Disable all links and images inside Getty container (prevent default navigation)
    const links = container.querySelectorAll('a, img, iframe');
    links.forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.pointerEvents = 'none'; // Let clicks bubble to container
      htmlEl.style.cursor = 'pointer';
      
      // Remove href or prevent navigation
      if (el.tagName === 'A') {
        const anchor = el as HTMLAnchorElement;
        anchor.href = '#';
        anchor.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          return false;
        };
        anchor.onmousedown = (e) => {
          e.preventDefault();
          e.stopPropagation();
          return false;
        };
      }
    });
    
    return () => {
      container.removeEventListener('click', handleClick);
    };
  }, [gettyImageHtml, article.slug]);
  
  if (hasGettyImageInContent) {
    // Match the new format: getty-embed-wrap div + credit div, OR old format: gie-single div + scripts
    // Pattern 1: New format - getty-embed-wrap div (match with iframe inside)
    const newFormatMatch = contentHtml.match(/<div[^>]*getty-embed-wrap[^>]*>[\s\S]*?<\/div>\s*(?:<div[^>]*getty-credit[^>]*>[\s\S]*?<\/div>)?/i);
    
    // Pattern 2: Also try matching with class attribute
    const classMatch = contentHtml.match(/<div[^>]*class\s*=\s*["']?[^"']*getty-embed-wrap[^"']*["']?[^>]*>[\s\S]*?<\/div>\s*(?:<div[^>]*class\s*=\s*["']?[^"']*getty-credit[^"']*["']?[^>]*>[\s\S]*?<\/div>)?/i);
    
    // Pattern 3: Old format - gie-single div with scripts
    const oldFormatMatch = contentHtml.match(/<div[^>]*>[\s\S]*?(?:gie-single|gettyimages\.com)[\s\S]*?<\/div>\s*(?:<script[^>]*>[\s\S]*?<\/script>\s*)*/i);
    
    if (newFormatMatch) {
      // New format: getty-embed-wrap + credit div
      gettyImageHtml = newFormatMatch[0];
      // Remove it from content (including credit div) - escape special chars and remove all instances
      const escapedMatch = newFormatMatch[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      contentWithoutGetty = contentHtml.replace(new RegExp(escapedMatch, 'gi'), '').trim();
    } else if (classMatch) {
      // Class-based match: getty-embed-wrap (any format)
      gettyImageHtml = classMatch[0];
      const escapedMatch = classMatch[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      contentWithoutGetty = contentHtml.replace(new RegExp(escapedMatch, 'gi'), '').trim();
    } else if (oldFormatMatch) {
      // Old format: gie-single with scripts
      const divEnd = oldFormatMatch.index! + oldFormatMatch[0].length;
      const afterDiv = contentHtml.substring(divEnd, divEnd + 1000);
      const scriptMatch = afterDiv.match(/<script[^>]*>[\s\S]*?<\/script>/gi);
      if (scriptMatch) {
        // CRITICAL: Remove inline scripts that contain window.gie - they conflict with React component
        const cleanScripts = scriptMatch.filter(script => !script.match(/(?:window\.gie|gie\.widgets|gie\(function)/i))
        gettyImageHtml = oldFormatMatch[0] + cleanScripts.join('');
      } else {
        gettyImageHtml = oldFormatMatch[0];
      }
      // Remove it from content (including scripts)
      contentWithoutGetty = contentHtml.replace(gettyImageHtml, '').trim();
    }
  }
  
  // NOTE: Script execution removed - GlobalGettyLoader handles widgets.js loading
  // All inline scripts with window.gie are removed in wordpress.ts before rendering
  // No need to execute scripts here as they would conflict with React component management

  const articleContent = (
    <>
      {/* Show Getty Images above title if present */}
      {/* CRITICAL: Credit must always be visible - never cropped or hidden */}
      {/* Fix mobile white space: remove bottom margin on mobile for article page (first element) */}
      {/* Use React component for Getty widget (preferred) */}
      {article.gettyWidgetConfig?.items ? (
        <div 
          className={`${!showLink ? 'mt-0 mb-0 md:mb-8' : 'mt-0 mb-6 md:mb-8'}`} 
          style={{ 
            marginTop: 0, 
            maxHeight: '500px', 
            overflow: 'hidden', 
            cursor: 'pointer',
            // Use actual dimensions from config if available to avoid black bars
            ...(article.gettyWidgetConfig.w && article.gettyWidgetConfig.h && {
              aspectRatio: `${parseInt(article.gettyWidgetConfig.w)} / ${parseInt(article.gettyWidgetConfig.h)}`
            })
          }}
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const articleUrl = typeof window !== 'undefined' 
              ? `${window.location.origin}/article/${article.slug}`
              : `/article/${article.slug}`;
            try {
              await navigator.clipboard.writeText(articleUrl);
              console.log('Article link copied to clipboard');
            } catch (err) {
              const textArea = document.createElement('textarea');
              textArea.value = articleUrl;
              textArea.style.position = 'fixed';
              textArea.style.opacity = '0';
              document.body.appendChild(textArea);
              textArea.select();
              try {
                document.execCommand('copy');
              } catch (fallbackErr) {
                console.error('Failed to copy link:', fallbackErr);
              }
              document.body.removeChild(textArea);
            }
            return false;
          }}
        >
          <GettyWidgetEmbed 
            items={article.gettyWidgetConfig.items}
          />
        </div>
      ) : gettyImageHtml ? (
        <div className={`${!showLink ? 'mb-0 md:mb-8' : 'mb-6 md:mb-8'}`}>
          <div 
            ref={gettyImageRef}
            dangerouslySetInnerHTML={{ 
              __html: gettyImageHtml.replace(/<script[^>]*>[\s\S]*?gie[\s\S]*?<\/script>/gi, (match) => {
                // Remove any script containing gie-related code
                if (match.match(/(?:window\s*\.\s*gie|gie\s*\.\s*widgets|gie\s*\(|gie\s*=\s*|\.\s*gie|gie\s*\.\s*q)/i)) {
                  return '';
                }
                return match;
              })
            }}
          />
        </div>
      ) : null}
      
      {/* Only show featured image if no Getty Images embed is present AND image URL exists (never show both) */}
      {/* Fix mobile white space: mt-0 on mobile to prevent double spacing */}
      {!article.gettyWidgetConfig?.items && !gettyImageHtml && !hasGettyImageInContent && article.image && article.image.trim() !== '' && (
        <div className={showLink ? 'px-4 md:px-0' : 'px-0 md:px-4'}>
          <div className={`relative w-full aspect-video mb-6 md:mb-10 ${!showLink ? 'mt-0 md:mt-6' : 'mt-4 md:mt-6'} overflow-hidden bg-gray-200 ${showLink ? 'rounded-lg md:rounded-xl' : 'md:rounded-lg md:rounded-xl'} shadow-lg`}>
            <img
              src={article.image}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}
      
      <div className="px-4 md:px-6 lg:px-8">
        <h1 className={`text-black font-bold text-3xl md:text-4xl lg:text-5xl mb-6 md:mb-8 ${!showLink && article.gettyWidgetConfig?.items ? 'mt-0' : !showLink ? 'mt-0' : 'mt-4'} md:mt-6 leading-tight text-balance`}>
          {article.title}
        </h1>
        
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm md:text-base text-gray-500 mb-3 md:mb-4 pb-3 md:pb-4 border-b border-gray-100">
          <span className="font-semibold text-gray-700">{article.author}</span>
          <span className="text-gray-400 hidden sm:inline">•</span>
          <span className="whitespace-nowrap">{article.date}</span>
          <span className="text-gray-400 hidden sm:inline">•</span>
          <Link 
            href={`/article/${article.slug}/comments`}
            className="text-black hover:text-gray-800 hover:underline cursor-pointer font-medium whitespace-nowrap"
          >
            {article.comments} comments
          </Link>
          <span className="text-gray-400 hidden sm:inline">•</span>
          <ShareButton articleSlug={article.slug} articleTitle={article.title} />
        </div>
        
        {showLink ? (
          <div 
            ref={contentRef}
            className="article-content max-w-none"
            style={{ 
              lineHeight: '1.75',
              fontSize: '18px'
            }}
            dangerouslySetInnerHTML={{ __html: contentWithoutGetty }}
          />
        ) : (
          <div 
            ref={contentRef}
            className="article-content max-w-none"
            style={{ 
              lineHeight: '1.75',
              fontSize: '18px'
            }}
            dangerouslySetInnerHTML={{ __html: injectFromIntoEntityLinks(contentWithoutGetty, article.slug) }}
          />
        )}
      </div>
    </>
  )

  if (showLink) {
    // Use div with onClick instead of wrapping Link to avoid nested <a> tags
    // Person links inside content are <a> tags, and nested anchors break navigation
    return (
      <article 
        id={id}
        className="bg-white pb-8 md:pb-12 mb-8 md:mb-16 transition-all group-hover:shadow-lg rounded-lg md:rounded-xl overflow-hidden cursor-pointer"
        onClick={() => {
          if (typeof window !== 'undefined') {
            window.location.href = `/article/${article.slug}`
          }
        }}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (typeof window !== 'undefined') {
              window.location.href = `/article/${article.slug}`
            }
          }
        }}
      >
        {articleContent}
      </article>
    )
  }

  return (
    <article id={id} className="bg-white pb-8 md:pb-12 mb-8 md:mb-16">
      {articleContent}
    </article>
  )
}


