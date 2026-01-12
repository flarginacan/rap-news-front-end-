/** @type {import('next').NextConfig} */
const nextConfig = {
  // Rewrite rule removed - app/[slug]/page.tsx now handles all slug routing
  // This prevents rewrite from intercepting entity pages like /drake
};

module.exports = nextConfig;
