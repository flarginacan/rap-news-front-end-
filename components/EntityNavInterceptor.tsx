'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function EntityNavInterceptor({
  articleSlug,
  children,
}: {
  articleSlug: string
  children: React.ReactNode
}) {
  const router = useRouter()
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      const a = target?.closest('a') as HTMLAnchorElement | null
      if (!a) return

      const href = a.getAttribute('href') || ''
      if (!href.startsWith('/')) return
      if (href.startsWith('/article/')) return
      if (href.startsWith('/api/')) return
      if (href.startsWith('/wp-')) return

      const entitySlug = href.slice(1)
      if (!/^[a-z0-9-]+$/.test(entitySlug)) return

      e.preventDefault()
      e.stopPropagation()

      router.push(`/${entitySlug}?from=${encodeURIComponent(articleSlug)}`)
    }

    el.addEventListener('click', handler, true) // capture phase
    return () => el.removeEventListener('click', handler, true)
  }, [router, articleSlug])

  return (
    <div ref={ref} data-entity-nav="1" className="article-content max-w-none">
      {children}
    </div>
  )
}
