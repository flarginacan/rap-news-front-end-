/** @type {import('next').NextConfig} */
const nextConfig = {
  // Rewrite rule removed - app/[slug]/page.tsx now handles all slug routing
  // This prevents rewrite from intercepting entity pages like /drake
  
  async headers() {
    return [
      {
        // Apply headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://embed-cdn.gettyimages.com https://www.googletagmanager.com https://www.google-analytics.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: https: blob: https://embed.gettyimages.com https://embed-cdn.gettyimages.com https://www.gettyimages.com",
              "frame-src 'self' https://embed.gettyimages.com https://embed-cdn.gettyimages.com https://www.gettyimages.com",
              "child-src 'self' https://embed.gettyimages.com https://embed-cdn.gettyimages.com",
              "connect-src 'self' https://embed.gettyimages.com https://embed-cdn.gettyimages.com https://www.gettyimages.com https://www.googletagmanager.com https://www.google-analytics.com https://*.vercel-insights.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
