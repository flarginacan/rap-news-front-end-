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
    // Use word boundary regex - but allow punctuation/possessive
    const pattern = new RegExp(`\\b${escapedName}\\b`, 'gi');

    // Process all text nodes directly
    $('body').find('*').contents().each((_, node) => {
      // Only process text nodes
      if (node.type !== 'text') {
        return;
      }

      const $node = $(node);
      const $parent = $node.parent();
      const parentTag = $parent[0]?.tagName?.toLowerCase();

      // Skip if parent is an excluded tag
      if (
        parentTag === 'a' ||
        parentTag === 'script' ||
        parentTag === 'style' ||
        parentTag === 'code' ||
        parentTag === 'pre' ||
        parentTag === 'h1' ||
        parentTag === 'h2' ||
        parentTag === 'h3' ||
        parentTag === 'h4' ||
        parentTag === 'h5' ||
        parentTag === 'h6'
      ) {
        return; // Skip if inside excluded tag
      }

      // Get text content
      const text = $node.text();
      if (!text || !pattern.test(text)) {
        return; // Person name not found
      }

      // Replace person name with link in text
      const newText = text.replace(pattern, (match) => {
        // Replace with link
        return `<a href="/person/${slug}" class="person-link">${match}</a>`;
      });

      // Replace text node with new HTML if changed
      if (newText !== text) {
        $node.replaceWith(newText);
      }
    });
  }

  // Get the body content (cheerio wraps in <html><body>)
  const bodyHtml = $('body').html() || html;
  return bodyHtml;
}
