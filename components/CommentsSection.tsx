'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Comment {
  id: string
  author: string
  text: string
  date: string
}

interface CommentsSectionProps {
  articleSlug: string
  articleTitle: string
}

export default function CommentsSection({ articleSlug, articleTitle }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState({ author: '', text: '' })
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadComments()
  }, [articleSlug])

  const loadComments = () => {
    const stored = localStorage.getItem(`comments-${articleSlug}`)
    if (stored) {
      setComments(JSON.parse(stored))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.author.trim() || !newComment.text.trim()) {
      return
    }

    setLoading(true)
    
    const comment: Comment = {
      id: Date.now().toString(),
      author: newComment.author.trim(),
      text: newComment.text.trim(),
      date: new Date().toISOString(),
    }

    const updatedComments = [comment, ...comments]
    setComments(updatedComments)
    localStorage.setItem(`comments-${articleSlug}`, JSON.stringify(updatedComments))
    
    setNewComment({ author: '', text: '' })
    setLoading(false)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
  }

  return (
    <div className="min-h-screen bg-white pt-16 md:pt-20">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 mb-6 hover:text-black"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to article
        </button>

        <h1 className="text-3xl font-bold text-black mb-2">Comments</h1>
        <p className="text-gray-600 mb-8">{articleTitle}</p>

        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-black mb-4">Leave a comment</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Your name"
                value={newComment.author}
                onChange={(e) => setNewComment({ ...newComment, author: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
                required
              />
            </div>
            <div className="mb-4">
              <textarea
                placeholder="Write your comment..."
                value={newComment.text}
                onChange={(e) => setNewComment({ ...newComment, text: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent resize-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Posting...' : 'Post Comment'}
            </button>
          </form>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-black mb-6">
            {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
          </h2>

          {comments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {comments.map((comment) => (
                <div key={comment.id} className="border-b border-gray-200 pb-6 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-black">{comment.author}</span>
                    <span className="text-sm text-gray-500">{formatDate(comment.date)}</span>
                  </div>
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{comment.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

