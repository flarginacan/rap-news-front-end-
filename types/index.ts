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
  gettyEmbedIframeSrc?: string; // Refreshed signed iframe URL (preferred over HTML extraction)
}

export interface ArticlesResponse {
  items: Article[];
  nextCursor: string | null;
}


