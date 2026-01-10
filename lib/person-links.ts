export type PersonRef = { name: string; slug: string };

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Wrap exact person name matches with an anchor to /person/{slug}.
 * - Uses absolute path (leading slash) so it never becomes /article/person/...
 * - Avoids linking inside existing <a> tags.
 */
export function transformHtmlWithPersonLinks(html: string, people: PersonRef[]) {
  if (!html || !people?.length) return { html, linkCount: 0 };

  // Sort longest first so "Fetty Wap" links before "Fetty"
  const sorted = [...people]
    .filter(p => p?.name && p?.slug)
    .sort((a, b) => b.name.length - a.name.length);

  let linkCount = 0;

  // Split by existing anchor blocks so we don't double-link inside links
  const parts = html.split(/(<a\b[\s\S]*?<\/a>)/gi);

  const transformed = parts
    .map(part => {
      // If this chunk is an existing anchor, return as-is
      if (/^<a\b/i.test(part)) return part;

      let out = part;

      for (const person of sorted) {
        const name = person.name.trim();
        if (!name) continue;

        // Word-boundary-ish match for the full name (allows whitespace between words)
        // Also allows possessive: "Fetty Wap's"
        const tokens = name.split(/\s+/).map(escapeRegExp);
        const pattern = `\\b${tokens.join("\\s+")}(?:'s)?\\b`;
        const re = new RegExp(pattern, "g");

        out = out.replace(re, (match) => {
          linkCount += 1;
          return `<a class="person-link" href="/person/${person.slug}">${match}</a>`;
        });
      }

      return out;
    })
    .join("");

  return { html: transformed, linkCount };
}
