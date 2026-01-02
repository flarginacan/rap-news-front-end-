# Connecting to WordPress

## Setup Instructions

### 1. WordPress REST API Setup

Your WordPress site already has the REST API enabled by default. You just need to make sure it's accessible.

**Test your WordPress API:**
Visit: `https://your-wordpress-site.com/wp-json/wp/v2/posts`

You should see JSON data with your posts.

### 2. Environment Variables

Create a `.env.local` file in the root of your project:

```env
USE_WORDPRESS=true
WORDPRESS_URL=https://your-wordpress-site.com
```

Replace `https://your-wordpress-site.com` with your actual WordPress URL.

### 3. Deployment Options

#### Option A: Deploy on Vercel (Recommended - Free & Easy)
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Add environment variables in Vercel dashboard:
   - `USE_WORDPRESS=true`
   - `WORDPRESS_URL=https://your-wordpress-site.com`
5. Deploy!

**Why Vercel?**
- Free for personal projects
- Automatic deployments from GitHub
- Fast CDN
- Built for Next.js

#### Option B: Deploy on Bluehost (If they support Node.js)
1. Check if your Bluehost plan supports Node.js
2. Upload your Next.js build files
3. Set environment variables in Bluehost control panel
4. Configure your domain

**Note:** Bluehost typically hosts WordPress sites, but may not support Node.js/Next.js hosting. You might need:
- A separate hosting service for Next.js (like Vercel)
- Or use Bluehost just for WordPress, and host Next.js elsewhere

#### Option C: Use Bluehost for WordPress + Vercel for Next.js (Recommended)
- Keep WordPress on Bluehost (where it is now)
- Deploy Next.js frontend on Vercel
- Connect them via the WordPress REST API

### 4. WordPress Post Format

Make sure your WordPress posts have:
- **Featured Image** - Will be used as the article image
- **Categories** - Will be used as the article category
- **Content** - Full post content will be displayed

### 5. Custom Fields (Optional)

If you want to add custom fields like "Author" or "Comment Count", you can:
- Install a plugin like "Advanced Custom Fields"
- Or modify the `wordpress.ts` file to fetch additional data

### 6. CORS Issues (If Needed)

If you get CORS errors, add this to your WordPress theme's `functions.php`:

```php
function add_cors_headers() {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type");
}
add_action('init', 'add_cors_headers');
```

Or install a CORS plugin from WordPress repository.

## Testing Locally

1. Set up `.env.local` with your WordPress URL
2. Set `USE_WORDPRESS=true`
3. Run `npm run dev`
4. Your site should now fetch articles from WordPress!

## Troubleshooting

- **404 on API calls**: Check your WordPress URL is correct
- **CORS errors**: Add CORS headers (see above)
- **No images**: Make sure posts have featured images set
- **Slow loading**: The API caches for 60 seconds, adjust in `wordpress.ts`

