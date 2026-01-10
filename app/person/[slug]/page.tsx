import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchTagBySlug, fetchPostsByTagId } from '@/lib/wordpress';

export const revalidate = 60;

export default async function PersonPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;

  // 1) Find the WP tag by slug
  const tag = await fetchTagBySlug(slug);
  if (!tag?.id) return notFound();

  // 2) Fetch ONLY posts that have this tag ID
  const posts = await fetchPostsByTagId(tag.id, 50);

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
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
