import { notFound } from 'next/navigation'
import Header from '@/components/Header'
import CommentsSection from '@/components/CommentsSection'
import { parseArticles } from '@/lib/articles'
import { fetchWordPressPostBySlug } from '@/lib/wordpress'

const USE_WORDPRESS = process.env.USE_WORDPRESS === 'true'

export function generateStaticParams() {
  try {
    if (USE_WORDPRESS) {
      // For WordPress, we can't pre-generate all paths, so return empty
      // Next.js will generate them on-demand
      return []
    } else {
      const articles = parseArticles()
      return articles.map((article) => ({
        slug: article.slug,
      }))
    }
  } catch (error) {
    console.error('Error generating static params:', error)
    return []
  }
}

export default async function CommentsPage({ params }: { params: { slug: string } }) {
  let articleTitle = 'Article'
  
  if (USE_WORDPRESS) {
    // Fetch from WordPress
    try {
      const article = await fetchWordPressPostBySlug(params.slug)
      if (article) {
        articleTitle = article.title
      } else {
        notFound()
      }
    } catch (error) {
      console.error('Error fetching WordPress article:', error)
      notFound()
    }
  } else {
    // Use mock data
    const articles = parseArticles()
    const article = articles.find((a) => a.slug === params.slug)
    if (article) {
      articleTitle = article.title
    } else {
      notFound()
    }
  }

  return (
    <>
      <Header />
      <CommentsSection articleSlug={params.slug} articleTitle={articleTitle} />
    </>
  )
}

