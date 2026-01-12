export type PersonRef = { name: string; slug: string };

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Get canonical slug for entity links
 * Person links should point to entity pages (/{canonicalSlug}), not /person/{slug}
 */
async function getCanonicalEntitySlug(slug: string): Promise<string> {
  try {
    const { getCanonicalSlug } = await import('./entityCanonical')
    return getCanonicalSlug(slug)
  } catch {
    return slug
  }
}

/**
 * Wrap exact person name matches with an anchor to entity page.
 * - Uses canonical slug to ensure all variants point to same page
 * - Points to /{canonicalSlug} (entity page), not /person/{slug}
 * - Avoids linking inside existing <a> tags.
 * @param articleSlug Optional article slug to add ?from= query param for pinning
 */
export async function transformHtmlWithPersonLinks(html: string, people: PersonRef[], articleSlug?: string): Promise<{ html: string; linkCount: number }> {
  if (!html || !people?.length) return { html, linkCount: 0 };

  // Sort longest first so "Fetty Wap" links before "Fetty"
  const sorted = [...people]
    .filter(p => p?.name && p?.slug)
    .sort((a, b) => b.name.length - a.name.length);

  // Get canonical slugs for all people upfront
  const { getCanonicalSlug } = await import('./entityCanonical')
  const peopleWithCanonical = await Promise.all(
    sorted.map(async (person) => ({
      ...person,
      canonicalSlug: getCanonicalSlug(person.slug),
    }))
  )

  let linkCount = 0;

  // Split by existing anchor blocks so we don't double-link inside links
  const parts = html.split(/(<a\b[\s\S]*?<\/a>)/gi);

  const transformed = parts
    .map(part => {
      // If this chunk is an existing anchor, return as-is
      if (/^<a\b/i.test(part)) return part;

      let out = part;

      for (const person of peopleWithCanonical) {
        const name = person.name.trim();
        if (!name) continue;

        // Word-boundary-ish match for the full name (allows whitespace between words)
        // Also allows possessive: "Fetty Wap's"
        const tokens = name.split(/\s+/).map(escapeRegExp);
        const pattern = `\\b${tokens.join("\\s+")}(?:'s)?\\b`;
        const re = new RegExp(pattern, "g");

        out = out.replace(re, (match) => {
          linkCount += 1;
          // Use canonical slug and point to entity page, not /person/
          // Add ?from=<article-slug> if provided to guarantee article appears in feed
          const href = articleSlug 
            ? `/${person.canonicalSlug}?from=${encodeURIComponent(articleSlug)}`
            : `/${person.canonicalSlug}`;
          return `<a class="person-link" href="${href}">${match}</a>`;
        });
      }

      return out;
    })
    .join("");

  return { html: transformed, linkCount };
}
