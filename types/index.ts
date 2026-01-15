export interface Article {
  id: string;
  title: string;
  image: string;
  category: string;
  author: string;
  date: string; // Formatted date string (e.g., "2 hours ago")
  rawDate?: string; // ISO date string for sorting (e.g., "2024-01-15T10:30:00")
  comments: number;
  content: string;
  slug: string;
  gettyAnchorHtml?: string; // Only the anchor element HTML (no scripts)
  gettyWidgetConfig?: {
    id: string;
    sig: string;
    items: string;
    w?: string;
    h?: string;
    caption?: boolean;
  }; // Widget config extracted from oEmbed (for manual widgets.load() call)
  // New Getty extraction fields (server-side, robust)
  gettyEmbedHtml?: string;   // embed wrapper / iframe html OR gie-single anchor html
  gettyCreditText?: string;  // plain text like "Photo by X/Getty Images"
  gettyAssetUrl?: string;    // link to Getty detail page if detectable
  gettyAssetId?: string;     // numeric id if detectable
  hasGettyEmbed?: boolean;
}

export interface ArticlesResponse {
  items: Article[];
  nextCursor: string | null;
}


