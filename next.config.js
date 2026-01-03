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
