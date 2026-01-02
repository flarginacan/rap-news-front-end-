import { notFound } from 'next/navigation'
import Header from '@/components/Header'
import ArticleCard from '@/components/ArticleCard'
import ArticleFeed from '@/components/ArticleFeed'
import { parseArticles } from '@/lib/articles'

export function generateStaticParams() {
  try {
    const articles = parseArticles()
    return articles.map((article) => ({
      slug: article.slug,
    }))
  } catch (error) {
    console.error('Error generating static params:', error)
    return []
  }
}

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const allArticles = parseArticles()
  const currentArticle = allArticles.find((a) => a.slug === params.slug)
  const otherArticles = allArticles.filter((a) => a.slug !== params.slug)

  if (!currentArticle) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="pt-16 md:pt-20 bg-white">
        <div className="max-w-4xl mx-auto">
          <ArticleCard article={currentArticle} showLink={false} />
          <ArticleFeed excludeSlug={params.slug} />
        </div>
      </main>
    </div>
  )
}

