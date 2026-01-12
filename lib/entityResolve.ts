import { fetchTagBySlug, fetchTagsBySearch } from './wordpress'

/**
 * Normalize a string for comparison (lowercase, trim, collapse whitespace, remove punctuation)
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/['".,\-]/g, '') // Remove punctuation
}

/**
 * Resolve entity tag group by searching WordPress for tags with matching names
 * This automatically finds all duplicate tags (drake, drake-2, etc.) without hardcoding
 * 
 * @param entitySlug - The entity slug (e.g., 'drake', 'kendrick-lamar')
 * @returns Tag group with displayName, tagIds, and slugs, or null if not found
 */
export async function resolveEntityTagGroup(entitySlug: string): Promise<{
  displayName: string
  tagIds: number[]
  slugs: string[]
} | null> {
  try {
    console.log(`[resolveEntityTagGroup] Resolving entity: ${entitySlug}`)
    
    // Step 1: Fetch the primary tag by slug
    const primaryTag = await fetchTagBySlug(entitySlug)
    if (!primaryTag) {
      console.log(`[resolveEntityTagGroup] No tag found for slug: ${entitySlug}`)
      return null
    }
    
    const displayName = primaryTag.name
    console.log(`[resolveEntityTagGroup] Primary tag: ${displayName} (ID: ${primaryTag.id})`)
    
    // Step 2: Search for tags with matching name
    const candidates = await fetchTagsBySearch(displayName)
    
    // Step 3: Normalize and filter candidates
    const normalizedPrimaryName = normalizeName(displayName)
    const matchingTags = candidates.filter(tag => {
      const normalizedCandidateName = normalizeName(tag.name)
      return normalizedCandidateName === normalizedPrimaryName
    })
    
    console.log(`[resolveEntityTagGroup] Found ${matchingTags.length} matching tags for "${displayName}"`)
    
    // Step 4: Extract tag IDs and slugs
    const tagIds = matchingTags.map(t => t.id)
    const slugs = matchingTags.map(t => t.slug)
    
    console.log(`[resolveEntityTagGroup] Tag IDs: [${tagIds.join(', ')}]`)
    console.log(`[resolveEntityTagGroup] Slugs: [${slugs.join(', ')}]`)
    
    return {
      displayName,
      tagIds,
      slugs,
    }
  } catch (error) {
    console.error(`[resolveEntityTagGroup] Error resolving entity ${entitySlug}:`, error)
    // Fallback: return just the primary tag
    try {
      const primaryTag = await fetchTagBySlug(entitySlug)
      if (primaryTag) {
        return {
          displayName: primaryTag.name,
          tagIds: [primaryTag.id],
          slugs: [primaryTag.slug],
        }
      }
    } catch (fallbackError) {
      console.error(`[resolveEntityTagGroup] Fallback also failed:`, fallbackError)
    }
    return null
  }
}
