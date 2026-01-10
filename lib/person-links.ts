import * as cheerio from 'cheerio';

/**
 * Transform HTML to link person names
 * Uses cheerio to safely parse HTML and only modify text nodes
 */
export function linkPersonNames(html: string, people: string[]): string {
  if (!html || !people || people.length === 0) {
    return html;
  }

  // Sort people by length DESC (so "Lil Baby" matches before "Lil")
  const sortedPeople = [...people].sort((a, b) => b.length - a.length);

  // Load HTML into cheerio
  const $ = cheerio.load(html, {
    decodeEntities: false, // Preserve HTML entities
  });

  // Function to create slug from person name
  function personToSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-'); // Collapse multiple hyphens
  }

  // Process each person name
  for (const person of sortedPeople) {
    const escapedName = person.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const slug = personToSlug(person);
    const pattern = new RegExp(`\\b${escapedName}\\b`, 'gi');

    // Process all elements that might contain text
    $('p, span, div, li, td, th').each((_, element) => {
      const $el = $(element);
      const tagName = element.tagName?.toLowerCase();

      // Skip if this element or any parent is an excluded tag
      if (
        $el.closest('a, script, style, code, pre, h1, h2, h3, h4, h5, h6').length > 0
      ) {
        return; // Skip if inside excluded tag
      }

      // Skip if this element contains links (we don't want nested links)
      if ($el.find('a').length > 0) {
        return; // Skip if contains links
      }

      // Get the text content
      const text = $el.text();
      if (!text || !pattern.test(text)) {
        return; // Person name not found
      }

      // Get the HTML content
      let htmlContent = $el.html() || '';
      if (!htmlContent) return;

      // Replace person name with link, but avoid replacing inside existing links
      htmlContent = htmlContent.replace(pattern, (match, offset, string) => {
        // Check context before and after
        const beforeMatch = string.substring(Math.max(0, offset - 200), offset);
        const afterMatch = string.substring(offset + match.length, offset + match.length + 200);

        // Count open/close <a> tags before this match
        const openATags = (beforeMatch.match(/<a\s[^>]*>/gi) || []).length;
        const closeATags = (beforeMatch.match(/<\/a>/gi) || []).length;

        // If we're inside an <a> tag, don't replace
        if (openATags > closeATags) {
          return match;
        }

        // Check if immediately after an opening <a> tag
        const lastATagIndex = beforeMatch.lastIndexOf('<a');
        const lastCloseATagIndex = beforeMatch.lastIndexOf('</a>');
        if (lastATagIndex > lastCloseATagIndex) {
          // We're inside an <a> tag
          return match;
        }

        // Replace with link
        return `<a href="/person/${slug}" class="person-link">${match}</a>`;
      });

      // Update the element's HTML if we made changes
      if (htmlContent !== ($el.html() || '')) {
        $el.html(htmlContent);
      }
    });
  }

  // Get the body content (cheerio wraps in <html><body>)
  const bodyHtml = $('body').html() || html;
  return bodyHtml;
}
