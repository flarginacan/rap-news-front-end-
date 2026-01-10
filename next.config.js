/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/wp-json/:path*',
        destination: 'https://tsf.dvj.mybluehost.me/wp-json/:path*',
      },
      {
        source: '/wp-admin/:path*',
        destination: 'https://tsf.dvj.mybluehost.me/wp-admin/:path*',
      },
      {
        source: '/wp-content/:path*',
        destination: 'https://tsf.dvj.mybluehost.me/wp-content/:path*',
      },
      // Rewrite root-level slugs to /article/:slug
      // This allows /exclusive-... to work and route to /article/exclusive-...
      {
        source: '/:slug((?!wp-json|wp-admin|wp-content|api|_next|favicon.ico|robots.txt|sitemap.xml).*)',
        destination: '/article/:slug',
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'donaldbriggs.com',
          },
        ],
        destination: 'https://rapnews.com/:path*',
        permanent: true, // 301 redirect
      },
    ];
  },
}

module.exports = nextConfig
