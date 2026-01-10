import { notFound } from "next/navigation";

export const revalidate = 60;

type WPTag = {
  id: number;
  name: string;
  slug: string;
};

type WPPost = {
  id: number;
  slug: string;
  title: { rendered: string };
  date: string;
  link: string;
};

async function wpFetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    // IMPORTANT: ModSecurity friendly headers
    headers: {
      Accept: "application/json",
      "User-Agent": "rapnews-server-fetch/1.0",
    },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[person page] WP fetch failed:", res.status, url, text.slice(0, 250));
    throw new Error(`WP fetch failed ${res.status}`);
  }

  return res.json();
}

async function getTagBySlug(slug: string) {
  const url = `https://www.rapnews.com/wp-json/wp/v2/tags?slug=${encodeURIComponent(slug)}&per_page=1`;
  const tags = await wpFetchJson<WPTag[]>(url);
  return tags?.[0] || null;
}

async function getPostsByTagId(tagId: number) {
  // order by date desc, pull enough for a feed
  const url = `https://www.rapnews.com/wp-json/wp/v2/posts?tags=${tagId}&per_page=50&orderby=date&order=desc`;
  return wpFetchJson<WPPost[]>(url);
}

export default async function PersonPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;

  let tag: WPTag | null = null;
  let posts: WPPost[] = [];

  try {
    tag = await getTagBySlug(slug);
    if (!tag) return notFound();

    posts = await getPostsByTagId(tag.id);
  } catch (e) {
    console.error("[person page] fatal:", e);
    return notFound();
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ fontSize: 40, fontWeight: 800, marginBottom: 8 }}>{tag.name}</h1>
      <p style={{ opacity: 0.7, marginBottom: 24 }}>
        Latest articles mentioning <strong>{tag.name}</strong>
      </p>

      {posts.length === 0 ? (
        <p>No articles found yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {posts.map((p) => (
            <a
              key={p.id}
              href={`/${p.slug}`}
              style={{
                display: "block",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 12,
                padding: 14,
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
                {new Date(p.date).toLocaleString()}
              </div>
              <div
                style={{ fontSize: 18, fontWeight: 800 }}
                dangerouslySetInnerHTML={{ __html: p.title.rendered }}
              />
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
