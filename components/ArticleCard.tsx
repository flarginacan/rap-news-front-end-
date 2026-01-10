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
function cleanWordPressContent(html: string): string {
  // If content looks like HTML (has tags), clean it up
  if (html.includes('<') && html.includes('>')) {
    // Extract and preserve Getty Images embed divs completely (including script tags, classes, styles)
    const gettyImageDivs: string[] = []
    // Match divs containing gettyimages.com OR gie-single class, including script tags
    const gettyImagePattern = /<div[^>]*>[\s\S]*?(?:gettyimages\.com|gie-single)[\s\S]*?<\/div>/gi
    let match
    while ((match = gettyImagePattern.exec(html)) !== null) {
      // Also capture any script tags immediately after the div
      const divEnd = match.index + match[0].length
      const afterDiv = html.substring(divEnd, divEnd + 500)
      const scriptMatch = afterDiv.match(/<script[^>]*>[\s\S]*?<\/script>/gi)
      if (scriptMatch) {
        // Include the script tags in the preserved div
        gettyImageDivs.push(match[0] + scriptMatch.join(''))
      } else {
        gettyImageDivs.push(match[0])
      }
    }
    
    // Temporarily replace Getty Images divs with placeholder (including scripts)
    html = html.replace(/<div[^>]*>[\s\S]*?(?:gettyimages\.com|gie-single)[\s\S]*?<\/div>\s*(?:<script[^>]*>[\s\S]*?<\/script>\s*)*/gi, '<!-- GETTY_IMAGE_PLACEHOLDER -->')
    
    // Remove WordPress-specific classes and inline styles
    // BUT preserve classes and styles inside Getty Images placeholders
    html = html.replace(/class="[^"]*"/gi, (match, offset, string) => {
      // If this is near a Getty placeholder, preserve it
      const context = string.substring(Math.max(0, offset - 200), Math.min(string.length, offset + 200))
      if (context.includes('GETTY_IMAGE_PLACEHOLDER') || context.includes('gie-single') || context.includes('gettyimages.com')) {
        return match
      }
      return ''
    })
    html = html.replace(/style="[^"]*"/gi, (match, offset, string) => {
      // If this is near a Getty placeholder, preserve it
      const context = string.substring(Math.max(0, offset - 200), Math.min(string.length, offset + 200))
      if (context.includes('GETTY_IMAGE_PLACEHOLDER') || context.includes('gie-single') || context.includes('gettyimages.com')) {
        return match
      }
      return ''
    })
    html = html.replace(/<p><\/p>/gi, '')
    html = html.replace(/<p>\s*<\/p>/gi, '')
    // Remove empty paragraphs
    html = html.replace(/<p>\s*<\/p>/gi, '')
    // Clean up excessive whitespace
    html = html.replace(/\s+/g, ' ')
    // Ensure proper spacing between elements
    html = html.replace(/<\/p>\s*<p>/gi, '</p>\n\n<p>')
    html = html.replace(/<\/h([1-6])>\s*<p>/gi, '</h$1>\n\n<p>')
    html = html.replace(/<\/div>\s*<p>/gi, '</div>\n\n<p>')
    // Remove WordPress block wrappers if present
    html = html.replace(/<!--\s*wp:[^>]*-->/gi, '')
    
    // Remove duplicate title paragraphs (they appear after the image)
    // This is a simple check - if we have a title-like paragraph right after the embed, remove it
    const titlePattern = /<p>\s*Exclusive:[\s\S]*?<\/p>\s*/gi
    html = html.replace(titlePattern, (match, offset, string) => {
      // Only remove if it appears early in the content (likely duplicate)
      if (offset < 500) {
        return ''
      }
      return match
    })
    
    // Restore Getty Images divs (replace placeholder, preserving all classes, styles, and scripts)
    if (gettyImageDivs.length > 0) {
      html = html.replace(/<!-- GETTY_IMAGE_PLACEHOLDER -->/g, gettyImageDivs[0])
      // Remove any remaining placeholders
      html = html.replace(/<!-- GETTY_IMAGE_PLACEHOLDER -->/g, '')
    }
    
    return html.trim()
  }
  // Otherwise, treat as markdown
  return markdownToHtml(html)
}

export default function ArticleCard({ article, showLink = true }: ArticleCardProps) {
  const contentHtml = cleanWordPressContent(article.content)
  const contentRef = useRef<HTMLDivElement>(null)
  
  // Check if content starts with a Getty Images div or iframe (we want to use that instead of featured image)
  const hasGettyImageInContent = (contentHtml.trim().startsWith('<div') || contentHtml.trim().startsWith('<iframe')) && (contentHtml.includes('gettyimages.com') || contentHtml.includes('embed.gettyimages.com'))
  
  // Execute scripts after content is rendered (for Getty Images embed widget)
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
  
  // Extract Getty Images embed from content if present
  let gettyImageHtml = '';
  let contentWithoutGetty = contentHtml;
  const gettyImageRef = useRef<HTMLDivElement>(null);
  
  if (hasGettyImageInContent) {
    // Extract the Getty Images div with ALL script tags (they come after the closing </div>)
    // Pattern: <div>...gie-single...</div> followed by <script> tags
    const gettyMatch = contentHtml.match(/<div[^>]*>[\s\S]*?(?:gettyimages\.com|gie-single|embed\.gettyimages\.com)[\s\S]*?<\/div>\s*(?:<script[^>]*>[\s\S]*?<\/script>\s*)*/i);
    if (gettyMatch && gettyMatch.index !== undefined) {
      // Get the full match including scripts
      const divEnd = gettyMatch.index + gettyMatch[0].length;
      const afterDiv = contentHtml.substring(divEnd, divEnd + 1000);
      const scriptMatch = afterDiv.match(/<script[^>]*>[\s\S]*?<\/script>/gi);
      if (scriptMatch) {
        gettyImageHtml = gettyMatch[0] + scriptMatch.join('');
      } else {
        gettyImageHtml = gettyMatch[0];
      }
      // Remove it from content (including scripts)
      contentWithoutGetty = contentHtml.replace(gettyImageHtml, '');
    }
  }
  
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
    
    // Load Getty Images widget loader if needed
    if (typeof window !== 'undefined' && !(window as any).gie && (gettyImageHtml.includes('gie-single') || contentHtml.includes('gie-single'))) {
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
      {gettyImageHtml && (
        <div className="px-4 md:px-0 mb-6 md:mb-8">
          <div 
            ref={gettyImageRef}
            className="max-w-full overflow-hidden"
            style={{ maxWidth: '100%', width: '100%' }}
            dangerouslySetInnerHTML={{ __html: gettyImageHtml }}
          />
        </div>
      )}
      
      {/* Only show featured image if no Getty Images and content doesn't already have it */}
      {!gettyImageHtml && !hasGettyImageInContent && (
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


