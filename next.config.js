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
    ];
  },
}

module.exports = nextConfig
