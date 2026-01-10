import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchTagBySlug, fetchPostsByTagId } from '@/lib/wordpress';

export const revalidate = 60;

export default async function PersonPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;

  try {
    const tag = await fetchTagBySlug(slug);
    if (!tag?.id) {
      console.log(`[PersonPage] Tag not found for slug: ${slug}`)
      return notFound();
    }

    console.log(`[PersonPage] Found tag: ${tag.name} (ID: ${tag.id})`)

    const posts = await fetchPostsByTagId(tag.id, 50);
    console.log(`[PersonPage] Found ${posts.length} posts for ${tag.name}`)

    return (
      <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: 40, fontWeight: 800, marginBottom: 8 }}>{tag.name}</h1>
        <p style={{ opacity: 0.7, marginBottom: 24 }}>
          Latest articles mentioning <strong>{tag.name}</strong>
        </p>

        {posts.length === 0 ? (
          <p>No articles found yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {posts.map((p: any) => (
              <Link
                key={p.id}
                href={`/${p.slug}`}
                style={{
                  display: 'block',
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: 12,
                  padding: 14,
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
                  {new Date(p.date).toLocaleString()}
                </div>
                <div
                  style={{ fontSize: 18, fontWeight: 800 }}
                  dangerouslySetInnerHTML={{ __html: p.title?.rendered ?? 'Untitled' }}
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  } catch (err) {
    console.error('[PersonPage] fatal error', { slug, err });
    return notFound();
  }
}
