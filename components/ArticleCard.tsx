'use client'

import { Article } from '@/types'
import Link from 'next/link'

interface ArticleCardProps {
  article: Article
  showLink?: boolean
}

// Simple markdown to HTML converter for basic formatting
function markdownToHtml(markdown: string): string {
  let html = markdown
  
  // Italic (do before bold to avoid conflicts)
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  
  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold">$1</strong>')
  
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
    // Remove WordPress-specific classes and inline styles
    html = html.replace(/class="[^"]*"/gi, '')
    html = html.replace(/style="[^"]*"/gi, '')
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
    return html.trim()
  }
  // Otherwise, treat as markdown
  return markdownToHtml(html)
}

export default function ArticleCard({ article, showLink = true }: ArticleCardProps) {
  const contentHtml = cleanWordPressContent(article.content)
  
  const articleContent = (
    <>
      <div className="relative w-full aspect-video mb-6 md:mb-10 mt-4 md:mt-6 overflow-hidden bg-gray-200 rounded-lg md:rounded-xl shadow-lg">
        <img
          src={article.image}
          alt={article.title}
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="px-4 md:px-0">
        <h1 className="text-black font-bold text-3xl md:text-4xl lg:text-5xl mb-5 md:mb-6 leading-tight text-balance">
          {article.title}
        </h1>
        
        <div className="flex items-center text-sm md:text-base text-gray-500 space-x-3 mb-8 md:mb-10 pb-5 md:pb-6 border-b border-gray-100">
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
          className="article-content max-w-none"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
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


