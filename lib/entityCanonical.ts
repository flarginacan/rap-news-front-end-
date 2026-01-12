/**
 * Canonical entity tag mapping
 * Maps entity slugs to all possible tag slugs that should be considered the same entity
 * This handles duplicate tags like "drake" vs "drake-2"
 */
export const entityCanonicalMap: Record<string, string[]> = {
  'drake': ['drake', 'drake-2', 'drake-3'],
  'kendrick-lamar': ['kendrick-lamar', 'kendrick-lamar-2'],
  'kendrick-lamar-2': ['kendrick-lamar', 'kendrick-lamar-2'],
  'future': ['future'],
  'big-sean': ['big-sean'],
}

/**
 * Get all canonical slugs for an entity
 */
export function getCanonicalSlugs(entitySlug: string): string[] {
  return entityCanonicalMap[entitySlug] || [entitySlug]
}
