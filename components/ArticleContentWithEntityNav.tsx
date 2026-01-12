'use client'

import { useRouter } from 'next/navigation'

interface ArticleContentWithEntityNavProps {
  html: string
  articleSlug: string
}

/**
 * Wrapper component that intercepts clicks on entity links in article content
 * and ensures they always include ?from=<currentArticleSlug>
 */
export default function ArticleContentWithEntityNav({
  html,
  articleSlug,
}: ArticleContentWithEntityNavProps) {
  const router = useRouter()

  return (
    <div
      className="article-content max-w-none"
      onClickCapture={(e) => {
        const target = e.target as HTMLElement | null
        const a = target?.closest('a') as HTMLAnchorElement | null
        if (!a) return

        // Only handle same-origin relative links like "/drake"
        const href = a.getAttribute('href') || ''
        if (!href.startsWith('/')) return

        // Ignore article links and other known routes
        if (href.startsWith('/article/')) return
        if (href.startsWith('/api/')) return
        if (href.startsWith('/wp-')) return

        // Entity slug pattern: "/kendrick-lamar-2"
        const entitySlug = href.slice(1)
        const isEntitySlug = /^[a-z0-9-]+$/.test(entitySlug)
        if (!isEntitySlug) return

        e.preventDefault()
        e.stopPropagation()

        const url = `/${entitySlug}?from=${encodeURIComponent(articleSlug)}`
        router.push(url)
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
