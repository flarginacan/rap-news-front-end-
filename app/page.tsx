import Header from '@/components/Header'
import ArticleFeed from '@/components/ArticleFeed'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="pt-16 md:pt-20 bg-white">
        <div className="max-w-4xl mx-auto">
          <ArticleFeed />
        </div>
      </main>
    </div>
  )
}


