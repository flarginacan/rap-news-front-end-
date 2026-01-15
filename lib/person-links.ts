import * as cheerio from 'cheerio';

export type PersonRef = { name: string; slug: string };

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
 * Build a robust matcher for a person's display name:
 * - case-insensitive
 * - supports NBSP and regular whitespace
 * - supports optional "'s" / "'s" / "&#8217;s" after name in plain text
 * We match in TEXT NODES, so we don't need to handle tags in between.
 */
function makeNameRegex(name: string) {
  const tokens = name.trim().split(/\s+/).map(escapeRegExp);
  // allow any whitespace including NBSP between tokens
  const between = `[\\s\\u00A0]+`;
  // optional possessive in plain text (apostrophe or curly apostrophe)
  const possessive = `(?:['']s)?`;
  // avoid matching inside a larger word
  const left = `(^|[^\\p{L}\\p{N}_])`;
  const right = `(?=$|[^\\p{L}\\p{N}_])`;
  // Capture group 1: left boundary, Capture group 2: name (including optional possessive)
  return new RegExp(`${left}(${tokens.join(between)}${possessive})${right}`, 'giu');
}

/**
 * Wrap exact person name matches with an anchor to entity page.
 * - Uses canonical slug to ensure all variants point to same page
 * - Points to /{canonicalSlug} (entity page), not /person/{slug}
 * - Avoids linking inside existing <a> tags.
 * - NEVER links inside headings (h1-h6)
 * - Operates on text nodes using cheerio HTML parser
 * @param articleSlug Optional article slug to add ?from= query param for pinning
 */
export async function transformHtmlWithPersonLinks(
  html: string,
  people: PersonRef[],
  articleSlug?: string
): Promise<{ html: string; linkCount: number }> {
  if (!html || !people?.length) {
    console.log(`[transformHtmlWithPersonLinks] ⚠️  Early return: html=${!!html}, people.length=${people?.length || 0}`)
    return { html, linkCount: 0 };
  }

  const $ = cheerio.load(html, { decodeEntities: true });

  // Get canonical slugs for all people upfront
  const { getCanonicalSlug } = await import('./entityCanonical')
  const peopleWithCanonical = await Promise.all(
    people.map(async (person) => ({
      ...person,
      canonicalSlug: await getCanonicalEntitySlug(person.slug),
    }))
  )

  // Sort longer names first to avoid "Lil" matching before "Lil Wayne" if you ever have overlaps
  const peopleSorted = [...peopleWithCanonical]
    .map(p => ({ ...p, name: (p.name || '').trim() }))
    .filter(p => p.name && p.slug)
    .sort((a, b) => b.name.length - a.name.length);

  let linkCount = 0;

  // Debug: log a quick plain text preview
  const fullText = $.root().text();
  console.log('[transformHtmlWithPersonLinks] text length:', fullText.length);
  for (const p of peopleSorted) {
    const contains = fullText.toLowerCase().includes(p.name.toLowerCase());
    console.log(`[transformHtmlWithPersonLinks] text contains "${p.name}"?`, contains);
  }

  // Walk text nodes under body, skipping headings and existing anchors
  const walkerTargets = $('*').contents().toArray();

  for (const node of walkerTargets) {
    if (node.type !== 'text') continue;
    const parent = node.parent as any;
    if (!parent || !parent.tagName) continue;

    const parentTag = String(parent.tagName).toLowerCase();

    // Skip script/style
    if (parentTag === 'script' || parentTag === 'style') continue;

    // Skip anything inside an anchor
    if ($(parent).closest('a').length) continue;

    // Skip headings entirely so titles/headers never get linked
    if ($(parent).closest('h1,h2,h3,h4,h5,h6').length) continue;

    const originalText = node.data || '';
    if (!originalText.trim()) continue;

    let replaced = originalText;

    // Apply all people replacements to this text node
    for (const person of peopleSorted) {
      const re = makeNameRegex(person.name);

      // Build href with optional from=
      const href = articleSlug
        ? `/${person.canonicalSlug}?from=${encodeURIComponent(articleSlug)}`
        : `/${person.canonicalSlug}`;

      // Replace keeping left boundary char (group 1) and name (group 2)
      replaced = replaced.replace(re, (match, leftBoundary, nameMatch) => {
        // IMPORTANT: preserve the left boundary char and wrap only the nameMatch part
        linkCount += 1;
        return `${leftBoundary}<a class="person-link" href="${href}">${nameMatch}</a>`;
      });
    }

    if (replaced !== originalText) {
      // Replace this single text node with HTML (may include <a>)
      // We need to insert as HTML, so replace the text node with parsed nodes
      $(node).replaceWith(replaced);
    }
  }

  const outHtml = $.root().html() || html;
  console.log('[transformHtmlWithPersonLinks] ✅ links added:', linkCount);

  return { html: outHtml, linkCount };
}
