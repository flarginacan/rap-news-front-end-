// lib/injectFrom.ts
const SITE_HOSTS = new Set(['rapnews.com', 'www.rapnews.com'])

function isEntityPath(path: string) {
  // "/drake" or "/kendrick-lamar-2"
  if (!path.startsWith('/')) return false
  if (path.startsWith('/article/')) return false
  if (path.startsWith('/api/')) return false
  if (path.startsWith('/wp-')) return false
  const slug = path.slice(1).split('?')[0].split('#')[0]
  return /^[a-z0-9-]+$/.test(slug)
}

function addFromParam(urlStr: string, articleSlug: string) {
  try {
    // Handle absolute or relative
    const url = urlStr.startsWith('http')
      ? new URL(urlStr)
      : new URL(urlStr, 'https://www.rapnews.com')

    // Only same-origin (rapnews.com)
    if (url.hostname && !SITE_HOSTS.has(url.hostname)) return urlStr

    // Only entity paths
    if (!isEntityPath(url.pathname)) return urlStr

    // If already has from, leave it
    if (url.searchParams.get('from')) return urlStr

    url.searchParams.set('from', articleSlug)

    // Return in original format (relative stays relative)
    if (!urlStr.startsWith('http')) {
      return `${url.pathname}?${url.searchParams.toString()}${url.hash || ''}`
    }
    return url.toString()
  } catch {
    return urlStr
  }
}

/**
 * Rewrites href="..." inside HTML so entity links get ?from=<articleSlug>
 */
export function injectFromIntoEntityLinks(html: string, articleSlug: string) {
  if (!html || !articleSlug) return html

  // Replace href="..."
  return html.replace(
    /href\s*=\s*"(.*?)"/gi,
    (full, rawHref: string) => {
      if (!rawHref) return full
      const patched = addFromParam(rawHref, articleSlug)
      // only change if different
      if (patched === rawHref) return full
      return `href="${patched}"`
    }
  )
}
