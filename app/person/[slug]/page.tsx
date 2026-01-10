import Link from 'next/link';
import { notFound } from 'next/navigation';
import { convertWordPressPost } from '@/lib/wordpress';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Convert slug to person name: "fetty-wap" -> "Fetty Wap"
function slugToPersonName(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Escape regex special characters
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Extract plain text from HTML (simple version)
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Check if post actually mentions the person
function postMentionsPerson(post: any, personName: string): boolean {
  const escapedName = escapeRegex(personName);
  // Allow word boundaries, possessives, and punctuation
  const pattern = new RegExp(`\\b${escapedName}\\b[''s]?`, 'i');
  
  const title = post.title?.rendered || post.title || '';
  const content = post.content?.rendered || post.content || '';
  
  const titleText = stripHtml(title);
  const contentText = stripHtml(content);
  
  return pattern.test(titleText) || pattern.test(contentText);
}

export default async function PersonPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const personName = slugToPersonName(slug);

  // Fetch posts using WP search (tags endpoint is blocked)
  const searchUrl = `https://www.rapnews.com/wp-json/wp/v2/posts?search=${encodeURIComponent(personName)}&per_page=50&orderby=date&order=desc&_embed=1`;
  
  let posts: any[] = [];
  let status = 0;
  let beforeFilterCount = 0;
  
  try {
    const res = await fetch(searchUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'rapnews-server-fetch/1.0',
      },
      cache: 'no-store',
    });
    
    status = res.status;
    
    if (res.ok) {
      const allPosts = await res.json();
      beforeFilterCount = allPosts.length;
      
      // Post-filter to ensure actual mentions
      posts = allPosts.filter((post: any) => postMentionsPerson(post, personName));
    } else {
      const body = await res.text().catch(() => '');
      console.error('[PersonPage] WP search failed', { slug, personName, status, body: body.slice(0, 300) });
    }
  } catch (error) {
    console.error('[PersonPage] Fetch error', { slug, personName, error });
  }

  // Convert WP posts to Article format
  const articles = await Promise.all(
    posts.map(post => convertWordPressPost(post))
  );

  const isDev = process.env.NODE_ENV !== 'production';

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      {/* Debug UI (dev only) */}
      {isDev && (
        <div style={{ padding: 12, border: '1px solid #f0d58c', background: '#fff8df', borderRadius: 10, marginBottom: 18 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>DEBUG: /person/[slug]</div>
          <div><b>slug:</b> {slug}</div>
          <div><b>personName:</b> {personName}</div>
          <div><b>WP URL:</b> <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{searchUrl}</span></div>
          <div><b>HTTP status:</b> {status}</div>
          <div><b>posts before filter:</b> {beforeFilterCount}</div>
          <div><b>posts after filter:</b> {posts.length}</div>
        </div>
      )}

      <h1 style={{ fontSize: 34, fontWeight: 900, marginBottom: 10 }}>{personName}</h1>
      <p style={{ opacity: 0.7, marginBottom: 20 }}>
        Showing {articles.length} article{articles.length === 1 ? '' : 's'} mentioning "{personName}"
      </p>

      {articles.length === 0 ? (
        <div style={{ padding: 16, border: '1px solid #eee', borderRadius: 10 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>No articles found</div>
          <div style={{ opacity: 0.7 }}>
            {status === 0 
              ? 'Unable to fetch articles at this time.'
              : 'No articles mention this person yet.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {articles.map((article) => (
            <div key={article.id} style={{ padding: 14, border: '1px solid #eee', borderRadius: 10 }}>
              <Link href={`/${article.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ fontWeight: 900, fontSize: 18 }}>{article.title}</div>
              </Link>
              <div style={{ marginTop: 6, opacity: 0.7, fontSize: 13 }}>
                {article.date}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
