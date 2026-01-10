/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // Rewrite ONLY true root-level slugs to /article/:slug
      // Important: exclude /article/* and /person/* and all WP/Next system paths.
      {
        source: '/:slug((?!wp-json|wp-admin|wp-content|api|_next|favicon.ico|robots.txt|sitemap.xml|article|person).*)',
        destination: '/article/:slug',
      },
    ];
  },
};

module.exports = nextConfig;
