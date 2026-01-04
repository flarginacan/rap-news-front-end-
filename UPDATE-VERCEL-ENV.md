# Update Vercel Environment Variables

Your frontend needs to fetch articles from WordPress. Update these in Vercel:

## Steps:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `rap-news-front-end` project
3. Go to **Settings** → **Environment Variables**
4. Add/Update these variables:

```
USE_WORDPRESS = true
WORDPRESS_URL = https://tsf.dvj.mybluehost.me
```

5. **Redeploy** your site (or it will auto-deploy on next push)

## After Updating:

- Your Next.js frontend at `https://donaldbriggs.com` will fetch articles from WordPress
- Articles published via the pipeline will appear on your site automatically
- The site will use the proper layout/design (not the WordPress default)

## Test:

After redeploying, visit `https://donaldbriggs.com` and you should see your published articles!


