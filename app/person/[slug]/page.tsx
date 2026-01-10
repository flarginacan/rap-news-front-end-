import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchTagBySlug, fetchPostsByTagId } from '@/lib/wordpress';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PersonPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;

  const tag = await fetchTagBySlug(slug);
  if (!tag?.id) return notFound();

  const { posts, debug } = await fetchPostsByTagId(tag.id, 50);
  const firstSlugs = posts.slice(0, 10).map((p: any) => p.slug);

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      {/* TEMP DEBUG (remove after we confirm) */}
      <div style={{ padding: 12, border: '1px solid #f0d58c', background: '#fff8df', borderRadius: 10, marginBottom: 18 }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>DEBUG: /person/[slug]</div>
        <div><b>slug:</b> {slug}</div>
        <div><b>tag.id:</b> {tag.id}</div>
        <div><b>tag.name:</b> {tag.name}</div>
        <div><b>posts url:</b> <span style={{ fontFamily: 'monospace' }}>{debug.url}</span></div>
        <div><b>wp total:</b> {debug.wpTotal ?? 'null'} | <b>wp pages:</b> {debug.wpTotalPages ?? 'null'} | <b>status:</b> {debug.status}</div>
        <div><b>posts returned:</b> {posts.length}</div>
        <div><b>first slugs:</b> <span style={{ fontFamily: 'monospace' }}>{firstSlugs.join(', ')}</span></div>
      </div>

      <h1 style={{ fontSize: 34, fontWeight: 900, marginBottom: 10 }}>{tag.name}</h1>
      <p style={{ opacity: 0.7, marginBottom: 20 }}>
        Showing {posts.length} article{posts.length === 1 ? '' : 's'} tagged with "{tag.name}"
      </p>

      {posts.length === 0 ? (
        <div style={{ padding: 16, border: '1px solid #eee', borderRadius: 10 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>No tagged articles yet</div>
          <div style={{ opacity: 0.7 }}>
            This person tag exists, but no posts are currently tagged with it.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {posts.map((p: any) => (
            <div key={p.id} style={{ padding: 14, border: '1px solid #eee', borderRadius: 10 }}>
              <Link href={`/${p.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ fontWeight: 900, fontSize: 18 }} dangerouslySetInnerHTML={{ __html: p.title?.rendered ?? 'Untitled' }} />
              </Link>
              <div style={{ marginTop: 6, opacity: 0.7, fontSize: 13 }}>
                {p.date ? new Date(p.date).toLocaleString() : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
