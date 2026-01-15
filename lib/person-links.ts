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
  console.log(`[transformHtmlWithPersonLinks] 🔗 Starting transformation`)
  console.log(`[transformHtmlWithPersonLinks] Input HTML length: ${html?.length || 0}`)
  console.log(`[transformHtmlWithPersonLinks] People to link: ${people?.length || 0}`)
  console.log(`[transformHtmlWithPersonLinks] People: ${people?.map(p => p.name).join(', ') || 'none'}`)
  
  // Show different parts of the HTML to find where the actual text is
  console.log(`[transformHtmlWithPersonLinks] 🔍 HTML start (first 500 chars):`, html.substring(0, 500))
  // Find where actual paragraph content starts (after Getty divs)
  const firstParagraphIndex = html.indexOf('<p>')
  if (firstParagraphIndex > 0) {
    console.log(`[transformHtmlWithPersonLinks] 🔍 First <p> tag at index: ${firstParagraphIndex}`)
    console.log(`[transformHtmlWithPersonLinks] 🔍 Content around first paragraph (500 chars):`, html.substring(Math.max(0, firstParagraphIndex - 50), firstParagraphIndex + 450))
  }
  // Check if person names exist anywhere in the HTML (case-insensitive)
  if (people && people.length > 0) {
    const firstPersonName = people[0].name
    const nameExists = html.toLowerCase().includes(firstPersonName.toLowerCase())
    console.log(`[transformHtmlWithPersonLinks] 🔍 Does HTML contain "${firstPersonName}" (case-insensitive)? ${nameExists}`)
    if (nameExists) {
      const nameIndex = html.toLowerCase().indexOf(firstPersonName.toLowerCase())
      console.log(`[transformHtmlWithPersonLinks] 🔍 Found "${firstPersonName}" at index: ${nameIndex}`)
      console.log(`[transformHtmlWithPersonLinks] 🔍 Context around name (200 chars):`, html.substring(Math.max(0, nameIndex - 100), nameIndex + 100))
    }
  }
  
  if (!html || !people?.length) {
    console.log(`[transformHtmlWithPersonLinks] ⚠️  Early return: html=${!!html}, people.length=${people?.length || 0}`)
    return { html, linkCount: 0 };
  }

  // Sort longest first so "Fetty Wap" links before "Fetty"
  const sorted = [...people]
    .filter(p => p?.name && p?.slug)
    .sort((a, b) => b.name.length - a.name.length);
  
  console.log(`[transformHtmlWithPersonLinks] Sorted people: ${sorted.length}`)

  // Get canonical slugs for all people upfront
  const { getCanonicalSlug } = await import('./entityCanonical')
  const peopleWithCanonical = await Promise.all(
    sorted.map(async (person) => ({
      ...person,
      canonicalSlug: getCanonicalSlug(person.slug),
    }))
  )
  
  console.log(`[transformHtmlWithPersonLinks] People with canonical slugs: ${peopleWithCanonical.map(p => `${p.name} → ${p.canonicalSlug}`).join(', ')}`)

  let linkCount = 0;

  // Split by existing anchor blocks so we don't double-link inside links
  const parts = html.split(/(<a\b[\s\S]*?<\/a>)/gi);
  
  console.log(`[transformHtmlWithPersonLinks] 🔍 HTML split into ${parts.length} parts`)
  console.log(`[transformHtmlWithPersonLinks] 🔍 HTML preview (first 500 chars):`, html.substring(0, 500))

  const transformed = parts
    .map((part, partIndex) => {
      // If this chunk is an existing anchor, return as-is
      if (/^<a\b/i.test(part)) {
        console.log(`[transformHtmlWithPersonLinks] ⏭️  Part ${partIndex}: Skipping existing anchor`)
        return part;
      }

      let out = part;
      console.log(`[transformHtmlWithPersonLinks] 🔍 Processing part ${partIndex} (${part.length} chars):`, part.substring(0, 100))

      for (const person of peopleWithCanonical) {
        const name = person.name.trim();
        if (!name) continue;

        // Word-boundary-ish match for the full name (allows whitespace between words)
        // Also allows possessive: "Fetty Wap's"
        const tokens = name.split(/\s+/).map(escapeRegExp);
        const pattern = `\\b${tokens.join("\\s+")}(?:'s)?\\b`;
        const re = new RegExp(pattern, "g");
        
        // Debug: Check if pattern would match
        const testMatches = out.match(re);
        console.log(`[transformHtmlWithPersonLinks] 🔍 Searching for "${name}" with pattern: ${pattern}`)
        console.log(`[transformHtmlWithPersonLinks] 🔍 Test matches found: ${testMatches ? testMatches.length : 0}`)
        if (testMatches && testMatches.length > 0) {
          console.log(`[transformHtmlWithPersonLinks] 🔍 Sample matches: ${testMatches.slice(0, 3).join(', ')}`)
        } else {
          // Try case-insensitive search to see if name exists with different casing
          const caseInsensitivePattern = new RegExp(name.replace(/\s+/g, '\\s+'), 'gi');
          const caseInsensitiveMatches = out.match(caseInsensitivePattern);
          console.log(`[transformHtmlWithPersonLinks] ⚠️  No matches with word boundaries. Case-insensitive matches: ${caseInsensitiveMatches ? caseInsensitiveMatches.length : 0}`)
          if (caseInsensitiveMatches && caseInsensitiveMatches.length > 0) {
            console.log(`[transformHtmlWithPersonLinks] ⚠️  Found with different casing: ${caseInsensitiveMatches.slice(0, 3).join(', ')}`)
          }
        }

        const beforeReplace = out;
        out = out.replace(re, (match) => {
          linkCount += 1;
          // Use canonical slug and point to entity page, not /person/
          // Add ?from=<article-slug> if provided to guarantee article appears in feed
          const href = articleSlug 
            ? `/${person.canonicalSlug}?from=${encodeURIComponent(articleSlug)}`
            : `/${person.canonicalSlug}`;
          const linkHtml = `<a class="person-link" href="${href}">${match}</a>`;
          console.log(`[transformHtmlWithPersonLinks] ✅ Linked "${match}" → ${href}`)
          return linkHtml;
        });
        
        if (beforeReplace !== out) {
          console.log(`[transformHtmlWithPersonLinks] ✅ Successfully replaced "${name}" in this part`)
        }
      }

      return out;
    })
    .join("");

  console.log(`[transformHtmlWithPersonLinks] ✅ Transformation complete`)
  console.log(`[transformHtmlWithPersonLinks] Links added: ${linkCount}`)
  console.log(`[transformHtmlWithPersonLinks] Output HTML length: ${transformed.length}`)
  console.log(`[transformHtmlWithPersonLinks] Contains person-link class: ${transformed.includes('person-link')}`)
  console.log(`[transformHtmlWithPersonLinks] Person-link count: ${(transformed.match(/class="person-link"/g) || []).length}`)
  console.log(`[transformHtmlWithPersonLinks] Output preview (first 500 chars):`, transformed.substring(0, 500))

  return { html: transformed, linkCount };
}
