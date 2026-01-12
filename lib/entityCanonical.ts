/**
 * Canonical entity tag mapping
 * Maps entity slugs to all possible tag slugs that should be considered the same entity
 * This handles duplicate tags like "drake" vs "drake-2"
 * 
 * IMPORTANT: The FIRST slug in each array is the canonical/primary slug.
 * All entity links should point to the canonical slug.
 */
export const entityCanonicalMap: Record<string, string[]> = {
  'drake': ['drake', 'drake-2', 'drake-3'],
  'drake-2': ['drake', 'drake-2', 'drake-3'],
  'drake-3': ['drake', 'drake-2', 'drake-3'],
  'kendrick-lamar': ['kendrick-lamar', 'kendrick-lamar-2'],
  'kendrick-lamar-2': ['kendrick-lamar', 'kendrick-lamar-2'],
  'future': ['future'],
  'big-sean': ['big-sean'],
}

/**
 * Get the canonical (primary) slug for an entity
 * This is the slug that should be used in all entity links
 */
export function getCanonicalSlug(entitySlug: string): string {
  const slugs = getCanonicalSlugs(entitySlug)
  return slugs[0] // First slug is canonical
}

/**
 * Get all canonical slugs for an entity
 * This ensures that clicking any variant (drake, drake-2, etc.) includes all related tags
 */
export function getCanonicalSlugs(entitySlug: string): string[] {
  // First check if this slug is a key in the map
  if (entityCanonicalMap[entitySlug]) {
    return entityCanonicalMap[entitySlug]
  }
  
  // Otherwise, check if it's a value in any map entry (reverse lookup)
  for (const [key, values] of Object.entries(entityCanonicalMap)) {
    if (values.includes(entitySlug)) {
      return values
    }
  }
  
  // Fallback: just return the slug itself
  return [entitySlug]
}
