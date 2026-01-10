export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";

type WpPost = {
  id: number;
  slug: string;
  date: string;
  title?: { rendered?: string };
  content?: { rendered?: string };
};

function slugToPersonName(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function stripHtml(input: string) {
  return (input || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function buildNameRegex(personName: string) {
  // Multi-word match allowing any whitespace between words, plus optional possessive.
  // Example: "Fetty Wap" matches "Fetty   Wap" and "Fetty Wap's"
  const tokens = personName
    .trim()
    .split(/\s+/)
    .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  const pattern = `\\b${tokens.join("\\s+")}(?:'s)?\\b`;
  return new RegExp(pattern, "i");
}

function postMentionsPerson(post: WpPost, personName: string) {
  const re = buildNameRegex(personName);
  const title = stripHtml(post?.title?.rendered || "");
  const content = stripHtml(post?.content?.rendered || "");
  return re.test(title) || re.test(content);
}

async function fetchWpPostsPage(page: number, perPage: number) {
  // Use direct Bluehost URL to bypass Vercel Security Checkpoint
  const WORDPRESS_BACKEND_URL = process.env.WORDPRESS_URL || 'https://tsf.dvj.mybluehost.me';
  const url =
    `${WORDPRESS_BACKEND_URL}/wp-json/wp/v2/posts` +
    `?per_page=${perPage}&page=${page}&_embed=1&orderby=date&order=desc`;

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent": "rapnews-server-fetch/1.0",
    },
  });

  const text = await res.text();
  if (!res.ok) {
    return { ok: false as const, url, status: res.status, body: text, posts: [] as WpPost[] };
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false as const, url, status: res.status, body: text, posts: [] as WpPost[] };
  }

  return { ok: true as const, url, status: res.status, body: "", posts: Array.isArray(data) ? (data as WpPost[]) : [] };
}

export default async function PersonPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const personName = slugToPersonName(slug);

  const perPage = 50;
  const maxPagesToScan = 10; // 10 * 50 = 500 posts scanned max
  const matches: WpPost[] = [];

  // Scan recent pages until we find enough matches (or we hit limit)
  let debugLastUrl = "";
  let debugLastStatus = 0;
  let debugLastError = "";

  for (let page = 1; page <= maxPagesToScan; page++) {
    const result = await fetchWpPostsPage(page, perPage);
    debugLastUrl = result.url;
    debugLastStatus = result.status;

    if (!result.ok) {
      debugLastError = (result.body || "").slice(0, 300);
      break; // stop if WP blocks us
    }

    const filtered = result.posts.filter(p => postMentionsPerson(p, personName));
    for (const p of filtered) {
      matches.push(p);
      if (matches.length >= 50) break;
    }

    // If WP returned fewer than perPage, no more posts
    if (result.posts.length < perPage) break;
    if (matches.length >= 50) break;
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 16px" }}>
      <h1 style={{ fontSize: 44, fontWeight: 800, marginBottom: 8 }}>{personName}</h1>
      <p style={{ color: "#444", marginBottom: 24 }}>
        Showing {matches.length} articles mentioning "{personName}"
      </p>

      {/* TEMP DEBUG (only show in production if you want; remove later) */}
      <div style={{ background: "#fff7d6", border: "1px solid #f0d68a", padding: 12, borderRadius: 8, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Debug</div>
        <div style={{ fontSize: 13, lineHeight: 1.5 }}>
          <div><b>slug:</b> {slug}</div>
          <div><b>personName:</b> {personName}</div>
          <div><b>lastURL:</b> {debugLastUrl}</div>
          <div><b>lastStatus:</b> {debugLastStatus}</div>
          {debugLastError ? <div><b>lastError:</b> {debugLastError}</div> : null}
          <div><b>scanLimit:</b> {maxPagesToScan} pages</div>
        </div>
      </div>

      {matches.length === 0 ? (
        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 18 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>No articles found</h3>
          <p style={{ marginTop: 8, color: "#444" }}>No articles mention this person yet.</p>
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {matches.map(post => (
            <li key={post.id} style={{ padding: "14px 0", borderBottom: "1px solid #eee" }}>
              <Link href={`/article/${post.slug}`} style={{ fontSize: 18, fontWeight: 700, textDecoration: "none" }}>
                {stripHtml(post?.title?.rendered || post.slug)}
              </Link>
              <div style={{ color: "#666", fontSize: 13, marginTop: 6 }}>
                {new Date(post.date).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
