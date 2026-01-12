/**
 * Entity allowlist - tags that should render as entity pages (artist feed pages)
 * 
 * This is a temporary solution until we can properly expose WordPress term meta
 * via REST API or create a dedicated endpoint.
 * 
 * To add new artists, add their tag slug to this array.
 */
export const entityAllowlist: string[] = [
  'drake',
  'drake-2',
  'drake-3',
  'kendrick-lamar',
  'kendrick-lamar-2',
  'future',
  'big-sean',
]
