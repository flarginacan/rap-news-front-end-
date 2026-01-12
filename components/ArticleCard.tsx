'use client'

import { Article } from '@/types'
import Link from 'next/link'
import { useEffect, useRef } from 'react'

interface ArticleCardProps {
  article: Article
  showLink?: boolean
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

interface ArticleCardProps {
  article: Article
  showLink?: boolean
}

// Clean WordPress HTML content
function extractGettyBlocks(html: string) {
  const blocks: string[] = [];
  let out = html;

  const patterns: RegExp[] = [
    // New wrapper format (if we transform to this)
    /<div[^>]*class=["'][^"']*getty-embed-wrap[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
    /<div[^>]*class=["'][^"']*getty-credit[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,

    // Old official Getty embed bundle: gie-single anchor
    /<a[^>]*class=["'][^"']*\bgie-single\b[^"']*["'][^>]*>[\s\S]*?<\/a>/gi,

    // Inline script that queues window.gie / loads widgets
    /<script[^>]*>[\s\S]*?\b(window\.gie\b|gie\.widgets\.load\b|gie\()\b[\s\S]*?<\/script>/gi,

    // External widgets loader script
    /<script[^>]*src=["'][^"']*embed-cdn\.gettyimages\.com\/widgets\.js[^"']*["'][^>]*>\s*<\/script>/gi,
  ];

  // Replace matches with placeholders
  patterns.forEach((re) => {
    out = out.replace(re, (match) => {
      const key = `__GETTY_BLOCK_${blocks.length}__`;
      blocks.push(match);
      return key;
    });
  });

  return { html: out, blocks };
}

function restoreGettyBlocks(html: string, blocks: string[]) {
  let out = html;
  blocks.forEach((block, i) => {
    out = out.replace(`__GETTY_BLOCK_${i}__`, block);
  });
  return out;
}

function cleanWordPressContent(html: string): string {
  // If content looks like HTML (has tags), clean it up
  if (html.includes('<') && html.includes('>')) {
    // STEP 1: Extract Getty blocks BEFORE sanitizing
    const { html: withPlaceholders, blocks } = extractGettyBlocks(html);
    
    // STEP 2: Run sanitization on content with placeholders
    let cleaned = withPlaceholders;
    
    // Remove WordPress-specific classes and inline styles
    // (Getty blocks are already replaced with placeholders, so they won't be affected)
    cleaned = cleaned.replace(/class="[^"]*"/gi, '')
    cleaned = cleaned.replace(/style="[^"]*"/gi, '')
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
    
    // STEP 3: Restore Getty blocks (they're preserved exactly as they were)
    const restored = restoreGettyBlocks(cleaned, blocks);
    
    return restored.trim()
  }
  // Otherwise, treat as markdown
  return markdownToHtml(html)
}

export default function ArticleCard({ article, showLink = true }: ArticleCardProps) {
  const contentHtml = cleanWordPressContent(article.content)
  const contentRef = useRef<HTMLDivElement>(null)
  
  // Check if content has a Getty Images embed (new format: getty-embed-wrap or old format: gie-single)
  const hasGettyImageInContent = contentHtml.includes('getty-embed-wrap') || 
                                  contentHtml.includes('embed.gettyimages.com') ||
                                  contentHtml.includes('gie-single') ||
                                  contentHtml.includes('gettyimages.com');
  
  // Extract Getty Images embed from content if present (including credit div)
  let gettyImageHtml = '';
  let contentWithoutGetty = contentHtml;
  const gettyImageRef = useRef<HTMLDivElement>(null);
  
  if (hasGettyImageInContent) {
    // Match the new format: getty-embed-wrap div + credit div, OR old format: gie-single div + scripts
    // Pattern 1: New format - getty-embed-wrap div (more flexible matching)
    const newFormatMatch = contentHtml.match(/<div[^>]*class\s*=\s*["']?[^"']*getty-embed-wrap[^"']*["']?[^>]*>[\s\S]*?<\/div>\s*(?:<div[^>]*class\s*=\s*["']?[^"']*getty-credit[^"']*["']?[^>]*>[\s\S]*?<\/div>)?/i);
    
    // Pattern 2: Also try matching just getty-embed-wrap without strict class matching
    const flexibleMatch = contentHtml.match(/<div[^>]*getty-embed-wrap[^>]*>[\s\S]*?<\/div>\s*(?:<div[^>]*getty-credit[^>]*>[\s\S]*?<\/div>)?/i);
    
    // Pattern 3: Old format - gie-single div with scripts
    const oldFormatMatch = contentHtml.match(/<div[^>]*>[\s\S]*?(?:gie-single|gettyimages\.com)[\s\S]*?<\/div>\s*(?:<script[^>]*>[\s\S]*?<\/script>\s*)*/i);
    
    if (newFormatMatch) {
      // New format: getty-embed-wrap + credit div
      gettyImageHtml = newFormatMatch[0];
      // Remove it from content (including credit div) - escape special chars and remove all instances
      const escapedMatch = newFormatMatch[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      contentWithoutGetty = contentHtml.replace(new RegExp(escapedMatch, 'gi'), '').trim();
    } else if (flexibleMatch) {
      // Flexible match: getty-embed-wrap (any format)
      gettyImageHtml = flexibleMatch[0];
      const escapedMatch = flexibleMatch[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      contentWithoutGetty = contentHtml.replace(new RegExp(escapedMatch, 'gi'), '').trim();
    } else if (oldFormatMatch) {
      // Old format: gie-single with scripts
      const divEnd = oldFormatMatch.index! + oldFormatMatch[0].length;
      const afterDiv = contentHtml.substring(divEnd, divEnd + 1000);
      const scriptMatch = afterDiv.match(/<script[^>]*>[\s\S]*?<\/script>/gi);
      if (scriptMatch) {
        gettyImageHtml = oldFormatMatch[0] + scriptMatch.join('');
      } else {
        gettyImageHtml = oldFormatMatch[0];
      }
      // Remove it from content (including scripts)
      contentWithoutGetty = contentHtml.replace(gettyImageHtml, '').trim();
    }
  }
  
  // Execute scripts after content is rendered (for old Getty Images embed widget format only)
  useEffect(() => {
    if (contentRef.current && contentHtml.includes('gie-single')) {
      // Find and execute any script tags in the content
      const scripts = contentRef.current.querySelectorAll('script')
      scripts.forEach((script) => {
        // Create a new script element to execute
        const newScript = document.createElement('script')
        if (script.src) {
          newScript.src = script.src
          newScript.async = script.async
          newScript.charset = script.charset || 'utf-8'
        } else {
          newScript.textContent = script.textContent
        }
        // Remove old script and add new one to execute it
        script.parentNode?.removeChild(script)
        document.body.appendChild(newScript)
      })
      
      // Also check if Getty Images widget loader needs to be loaded
      if (typeof window !== 'undefined' && !(window as any).gie) {
        const widgetScript = document.createElement('script')
        widgetScript.src = '//embed-cdn.gettyimages.com/widgets.js'
        widgetScript.charset = 'utf-8'
        widgetScript.async = true
        document.body.appendChild(widgetScript)
      }
    }
  }, [contentHtml])
  
  // Execute scripts for Getty Images embed widget (both in extracted div and in content)
  useEffect(() => {
    // Check extracted Getty Images div above title
    if (gettyImageRef.current) {
      const scripts = gettyImageRef.current.querySelectorAll('script');
      scripts.forEach((script) => {
        const newScript = document.createElement('script');
        if (script.src) {
          newScript.src = script.src;
          newScript.async = script.async;
          newScript.charset = script.charset || 'utf-8';
        } else {
          newScript.textContent = script.textContent;
        }
        script.parentNode?.removeChild(script);
        document.body.appendChild(newScript);
      });
    }
    
    // Also check content for scripts (fallback)
    if (contentRef.current && contentHtml.includes('gie-single')) {
      const scripts = contentRef.current.querySelectorAll('script');
      scripts.forEach((script) => {
        const newScript = document.createElement('script');
        if (script.src) {
          newScript.src = script.src;
          newScript.async = script.async;
          newScript.charset = script.charset || 'utf-8';
        } else {
          newScript.textContent = script.textContent;
        }
        script.parentNode?.removeChild(script);
        document.body.appendChild(newScript);
      });
    }
    
    // Load Getty Images widget loader if needed (only for old gie-single format, not for new iframe embeds)
    if (typeof window !== 'undefined' && !(window as any).gie && 
        (gettyImageHtml.includes('gie-single') || contentHtml.includes('gie-single'))) {
      const widgetScript = document.createElement('script');
      widgetScript.src = '//embed-cdn.gettyimages.com/widgets.js';
      widgetScript.charset = 'utf-8';
      widgetScript.async = true;
      document.body.appendChild(widgetScript);
    }
  }, [contentHtml, gettyImageHtml]);

  const articleContent = (
    <>
      {/* Show Getty Images above title if present */}
      {/* CRITICAL: Credit must always be visible - never cropped or hidden */}
      {gettyImageHtml && (
        <div className="mb-6 md:mb-8">
          <div 
            ref={gettyImageRef}
            dangerouslySetInnerHTML={{ __html: gettyImageHtml }}
          />
        </div>
      )}
      
      {/* Only show featured image if no Getty Images embed is present AND image URL exists (never show both) */}
      {!gettyImageHtml && !hasGettyImageInContent && article.image && article.image.trim() !== '' && (
        <div className="px-4 md:px-0">
          <div className="relative w-full aspect-video mb-6 md:mb-10 mt-4 md:mt-6 overflow-hidden bg-gray-200 rounded-lg md:rounded-xl shadow-lg">
            <img
              src={article.image}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}
      
      <div className="px-4 md:px-6 lg:px-8">
        <h1 className="text-black font-bold text-3xl md:text-4xl lg:text-5xl mb-6 md:mb-8 mt-4 md:mt-6 leading-tight text-balance">
          {article.title}
        </h1>
        
        <div className="flex items-center text-sm md:text-base text-gray-500 space-x-3 mb-3 md:mb-4 pb-3 md:pb-4 border-b border-gray-100">
          <span className="font-semibold text-gray-700">{article.author}</span>
          <span className="text-gray-400">•</span>
          <span>{article.date}</span>
          <span className="text-gray-400">•</span>
          <Link 
            href={`/article/${article.slug}/comments`}
            className="text-red-600 hover:text-red-700 hover:underline cursor-pointer font-medium"
          >
            {article.comments} comments
          </Link>
        </div>
        
        <div 
          ref={contentRef}
          className="article-content max-w-none"
          style={{ 
            lineHeight: '1.75',
            fontSize: '18px'
          }}
          dangerouslySetInnerHTML={{ __html: contentWithoutGetty }}
        />
      </div>
    </>
  )

  if (showLink) {
    return (
      <Link href={`/article/${article.slug}`} className="block group">
        <article className="bg-white pb-8 md:pb-12 mb-8 md:mb-16 transition-all group-hover:shadow-lg rounded-lg md:rounded-xl overflow-hidden">
          {articleContent}
        </article>
      </Link>
    )
  }

  return (
    <article className="bg-white pb-8 md:pb-12 mb-8 md:mb-16">
      {articleContent}
    </article>
  )
}


