/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // Note: The app/[slug]/page.tsx route will handle entity pages first
      // This rewrite is a fallback for articles only
      // Rewrite root-level slugs to /article/:slug (but [slug] route takes precedence)
      {
        source: '/:slug((?!wp-json|wp-admin|wp-content|api|_next|favicon.ico|robots.txt|sitemap.xml|article|person).*)',
        destination: '/article/:slug',
      },
    ];
  },
};

module.exports = nextConfig;
