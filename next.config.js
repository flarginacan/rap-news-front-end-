/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/wp-json/:path*',
        destination: 'https://donaldbriggs.com/wp-json/:path*',
      },
    ];
  },
}

module.exports = nextConfig
