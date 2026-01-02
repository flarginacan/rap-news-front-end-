export interface Article {
  id: string;
  title: string;
  image: string;
  category: string;
  author: string;
  date: string;
  comments: number;
  content: string;
  slug: string;
}

export interface ArticlesResponse {
  items: Article[];
  nextCursor: string | null;
}


