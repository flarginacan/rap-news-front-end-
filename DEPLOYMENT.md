# Deployment Guide for Rap News

## Recommended Setup: WordPress on Bluehost + Next.js on Vercel

### Architecture
- **WordPress** → Stays on Bluehost (your current setup)
- **Next.js Frontend** → Deploy on Vercel (free, fast, built for Next.js)
- **Domain** → Point to Vercel (your Next.js site becomes the main site)

---

## Step 1: Deploy Next.js to Vercel (Recommended)

### Why Vercel?
- ✅ Free for personal projects
- ✅ Built by Next.js creators
- ✅ Automatic deployments from GitHub
- ✅ Fast global CDN
- ✅ Easy domain setup
- ✅ Free SSL certificates

### Steps:

1. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/rap-news-frontend.git
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub
   - Click "Add New Project"
   - Import your GitHub repository

3. **Add Environment Variables in Vercel**
   - In project settings → Environment Variables
   - Add:
     ```
     USE_WORDPRESS=true
     WORDPRESS_URL=https://donaldbriggs.com
     ```

4. **Deploy**
   - Vercel will automatically deploy
   - You'll get a URL like: `rap-news-frontend.vercel.app`

---

## Step 2: Connect Your Domain

### Option A: Use Vercel's Domain (Easiest)
- In Vercel dashboard → Settings → Domains
- Add your domain: `donaldbriggs.com`
- Vercel will give you DNS records to add

### Option B: Point Domain from Bluehost
1. **In Bluehost DNS settings**, update:
   - Change A record for `@` to Vercel's IP (Vercel will provide)
   - Or use CNAME: `www` → `cname.vercel-dns.com`

2. **In Vercel**, add your domain in project settings

---

## Step 3: WordPress Setup (Keep on Bluehost)

Your WordPress site stays at Bluehost. The Next.js site will fetch articles via the REST API.

### Ensure WordPress REST API is Public
- WordPress REST API is public by default
- Test: `https://donaldbriggs.com/wp-json/wp/v2/posts` should work

### If You Get CORS Errors
Add to your WordPress theme's `functions.php`:
```php
function add_cors_headers() {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type");
}
add_action('init', 'add_cors_headers');
```

---

## Alternative: Deploy on Bluehost (If They Support Node.js)

### Check if Bluehost Supports Node.js
1. Log into Bluehost cPanel
2. Look for "Node.js" or "Node.js Selector" in the dashboard
3. If available, you can deploy there

### If Available:
1. Upload your Next.js build files
2. Set environment variables in Bluehost
3. Configure Node.js app
4. Point domain to the Node.js app

**Note:** Most Bluehost plans don't support Node.js. Vercel is the better option.

---

## Final Architecture

```
User visits: donaldbriggs.com
         ↓
    Vercel (Next.js Frontend)
         ↓
    Fetches articles via API
         ↓
    Bluehost (WordPress Backend)
```

---

## Quick Deploy Checklist

- [ ] Code pushed to GitHub
- [ ] Vercel account created
- [ ] Project imported to Vercel
- [ ] Environment variables set in Vercel
- [ ] Domain added to Vercel
- [ ] DNS records updated at Bluehost
- [ ] WordPress REST API tested
- [ ] Site tested and working

---

## Need Help?

If you run into issues:
1. Check Vercel deployment logs
2. Verify environment variables are set
3. Test WordPress API: `https://donaldbriggs.com/wp-json/wp/v2/posts`
4. Check browser console for errors

