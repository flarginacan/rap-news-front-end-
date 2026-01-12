'use client'

import { useEffect, useRef } from 'react'

function isEntityPath(pathname: string) {
  // "/drake" "/kendrick-lamar-2"
  if (!pathname.startsWith('/')) return false
  if (pathname.startsWith('/article/')) return false
  if (pathname.startsWith('/api/')) return false
  if (pathname.startsWith('/wp-')) return false
  const slug = pathname.slice(1)
  return /^[a-z0-9-]+$/.test(slug)
}

export default function EntityHrefPatcher({
  articleSlug,
  children,
}: {
  articleSlug: string
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return

    const anchors = Array.from(root.querySelectorAll('a[href]')) as HTMLAnchorElement[]

    for (const a of anchors) {
      const rawHref = a.getAttribute('href') || ''
      if (!rawHref) continue

      // handle relative "/drake" and absolute "https://rapnews.com/drake"
      let url: URL | null = null

      try {
        url = rawHref.startsWith('http')
          ? new URL(rawHref)
          : new URL(rawHref, window.location.origin)
      } catch {
        continue
      }

      // only same-origin
      if (url.origin !== window.location.origin) continue

      if (!isEntityPath(url.pathname)) continue

      // already has from
      if (url.searchParams.get('from')) continue

      url.searchParams.set('from', articleSlug)

      // preserve relative formatting if original was relative
      const nextHref = rawHref.startsWith('http')
        ? url.toString()
        : `${url.pathname}${url.search}${url.hash}`

      a.setAttribute('href', nextHref)
    }
  }, [articleSlug])

  return (
    <div ref={ref} className="article-content max-w-none">
      {children}
    </div>
  )
}
