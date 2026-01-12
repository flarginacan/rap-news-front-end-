'use client'

import Link from 'next/link'

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black w-full h-16 md:h-20 flex items-center justify-center px-4 md:px-8">
      <Link href="/" className="hover:opacity-80 transition-opacity">
        <h1 className="text-red-600 text-3xl md:text-5xl lg:text-6xl font-black text-center tracking-tight md:tracking-tighter cursor-pointer">
          RAP NEWS
        </h1>
      </Link>
      
      <button
        className="text-white p-2 absolute right-4 md:right-8 hover:opacity-80 transition-opacity"
        aria-label="Search"
      >
        <svg
          className="w-6 h-6 md:w-7 md:h-7"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </button>
    </header>
  )
}

