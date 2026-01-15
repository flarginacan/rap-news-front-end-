export type GettyOEmbedResult = {
  creditText: string;   // "Photo by X/Getty Images" (or best available)
  embedHtml: string;    // optional, but we return it for future use
};

function normalize(s: string) {
  return (s || "").replace(/\s+/g, " ").trim();
}

// Try to extract "Photo by .../Getty Images" from caption/html/text.
function extractCreditLine(input: string): string {
  const text = normalize(input);
  if (!text) return "";
  // common patterns
  // e.g. "Photo by Amy Sussman/Getty Images"
  const m1 = text.match(/(Photo(?:graph)?\s+by\s+[^.<>]+?\/\s*Getty\s+Images)/i);
  if (m1?.[1]) return normalize(m1[1]);

  // sometimes "Photo by ... (Getty Images)" or similar
  const m2 = text.match(/(Photo(?:graph)?\s+by\s+[^.<>]+?Getty\s+Images)/i);
  if (m2?.[1]) return normalize(m2[1]);

  // if all else fails, return empty so caller can fallback
  return "";
}

export async function fetchGettyOEmbedByUrl(gettyDetailUrl: string): Promise<GettyOEmbedResult> {
  const url = `https://embed.gettyimages.com/oembed?url=${encodeURIComponent(gettyDetailUrl)}`;

  const res = await fetch(url, {
    // cache on server (Next fetch cache)
    next: { revalidate: 60 * 60 * 24 * 30 }, // 30 days
    headers: {
      "accept": "application/json",
    },
  });

  if (!res.ok) {
    return { creditText: "", embedHtml: "" };
  }

  const data: any = await res.json();

  // Getty oEmbed typically includes: html, title, author_name, provider_name, etc.
  const embedHtml = typeof data?.html === "string" ? data.html : "";

  // Best place to pull photographer credit is usually the caption embedded inside html or title.
  // Try several fields.
  const candidates = [
    data?.caption,
    data?.title,
    data?.author_name,
    embedHtml,
  ].filter(Boolean).map(String);

  let creditText = "";
  for (const c of candidates) {
    creditText = extractCreditLine(c);
    if (creditText) break;
  }

  // Fallback (still better than nothing)
  if (!creditText) creditText = "Getty Images";

  return { creditText, embedHtml };
}
