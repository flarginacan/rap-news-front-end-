'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Article, ArticlesResponse } from '@/types'
import ArticleCard from './ArticleCard'
import ErrorBoundary from './ErrorBoundary'

interface ArticleFeedProps {
  excludeSlug?: string
  tagId?: number | string // Support single ID or comma-separated string (legacy)
  tagIds?: number[] // NEW: Array of tag IDs (preferred)
}

export default function ArticleFeed({ excludeSlug, tagId, tagIds }: ArticleFeedProps = {}) {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [cursor, setCursor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)
  const previousTagIdsRef = useRef<number[] | undefined>(undefined)

  const fetchArticles = useCallback(async (currentCursor: string | null) => {
    if (loadingRef.current) return
    
    loadingRef.current = true
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (currentCursor) {
        params.set('cursor', currentCursor)
      }
      // Prefer tagIds array over tagId
      if (tagIds && tagIds.length > 0) {
        params.set('tagIds', tagIds.join(','))
      } else if (tagId) {
        // Legacy: tagId can be number or comma-separated string
        params.set('tagId', tagId.toString())
      }
      const url = `/api/articles?${params.toString()}`
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data: ArticlesResponse = await response.json()
      
      // Filter out excluded article if provided
      let filteredItems = excludeSlug 
        ? data.items.filter(item => item.slug !== excludeSlug)
        : data.items
      
      // Deduplicate articles by ID (prevent same article appearing multiple times)
      if (currentCursor) {
        // When appending, filter out articles we already have
        setArticles(prev => {
          const existingIds = new Set(prev.map(a => a.id))
          const newItems = filteredItems.filter(item => !existingIds.has(item.id))
          return [...prev, ...newItems]
        })
      } else {
        // When replacing, deduplicate within the new batch
        const seenIds = new Set<string>()
        filteredItems = filteredItems.filter(item => {
          if (seenIds.has(item.id)) {
            return false
          }
          seenIds.add(item.id)
          return true
        })
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
  }, [tagId, tagIds])

  // Reset state when tagIds or tagId changes
  useEffect(() => {
    const currentTagIds = tagIds || (tagId ? [typeof tagId === 'string' ? parseInt(tagId) : tagId] : [])
    const previousTagIds = previousTagIdsRef.current || []
    
    // Check if tag IDs changed
    const tagIdsChanged = 
      currentTagIds.length !== previousTagIds.length ||
      currentTagIds.some((id, idx) => id !== previousTagIds[idx])
    
    if (tagIdsChanged) {
      // Tag changed - reset everything
      setArticles([])
      setCursor(null)
      setHasMore(true)
      setError(null)
      previousTagIdsRef.current = currentTagIds
      // Fetch fresh articles
      fetchArticles(null)
    }
  }, [tagId, tagIds, fetchArticles])
  
  // Initial fetch when component mounts
  useEffect(() => {
    if (previousTagIdsRef.current === undefined) {
      fetchArticles(null)
    }
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

