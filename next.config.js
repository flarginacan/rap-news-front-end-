/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // IMPORTANT: DO NOT rewrite /person/* or /article/* or Next/WP/system routes
      {
        source:
          '/:slug((?!wp-json(?:/|$)|wp-admin(?:/|$)|wp-content(?:/|$)|api(?:/|$)|_next(?:/|$)|favicon\\.ico$|robots\\.txt$|sitemap\\.xml$|person(?:/|$)|article(?:/|$)).*)',
        destination: '/article/:slug',
      },
    ];
  },
};

module.exports = nextConfig;
