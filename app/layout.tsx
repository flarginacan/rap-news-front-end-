import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RAP NEWS',
  description: 'Latest rap and hip-hop news',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-white">{children}</body>
    </html>
  )
}


