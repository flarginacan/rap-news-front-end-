'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Article, ArticlesResponse } from '@/types'
import ArticleCard from './ArticleCard'

interface ArticleFeedProps {
  excludeSlug?: string
}

export default function ArticleFeed({ excludeSlug }: ArticleFeedProps = {}) {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [cursor, setCursor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)

  const fetchArticles = useCallback(async (currentCursor: string | null) => {
    if (loadingRef.current) return
    
    loadingRef.current = true
    setLoading(true)
    try {
      const url = currentCursor
        ? `/api/articles?cursor=${currentCursor}`
        : '/api/articles'
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data: ArticlesResponse = await response.json()
      
      // Filter out excluded article if provided
      const filteredItems = excludeSlug 
        ? data.items.filter(item => item.slug !== excludeSlug)
        : data.items
      
      if (currentCursor) {
        setArticles(prev => [...prev, ...filteredItems])
      } else {
        setArticles(filteredItems)
      }
      
      setCursor(data.nextCursor)
      setHasMore(data.nextCursor !== null)
      setError(null)
    } catch (error) {
      console.error('Failed to fetch articles:', error)
      setError(error instanceof Error ? error.message : 'Failed to load articles')
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [])

  useEffect(() => {
    fetchArticles(null)
  }, [fetchArticles])

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
          fetchArticles(cursor)
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(sentinelRef.current)

    return () => {
      if (sentinelRef.current) {
        observer.unobserve(sentinelRef.current)
      }
    }
  }, [cursor, hasMore, loading, fetchArticles])

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 font-bold mb-2">Error loading articles</p>
          <p className="text-gray-600 text-sm">{error}</p>
          <button
            onClick={() => {
              setError(null)
              fetchArticles(null)
            }}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {loading && articles.length === 0 && (
        <div className="flex justify-center items-center py-12">
          <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {articles.length === 0 && !loading && (
        <div className="flex justify-center items-center py-12">
          <p className="text-gray-600">No articles found</p>
        </div>
      )}
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
      
      <div ref={sentinelRef} className="h-4" />
      
      {loading && articles.length > 0 && (
        <div className="flex justify-center items-center py-8">
          <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}

