# Setup Automation & SEO - Phase 1

This guide covers the final setup steps for Phase 1: Cron jobs automation and Netlify verification.

## ✅ Completed

- ✅ @astrojs/sitemap installed and configured
- ✅ robots.txt created in `/public/robots.txt`
- ✅ SEO meta tags and Open Graph tags added to BaseLayout
- ✅ sitemap.xml will be auto-generated at build time

---

## 🔧 Pending Actions (Require Manual Steps)

### 1. Configure Cron Jobs in Supabase

The scraper is ready but needs to run automatically 4 times per day.

**Steps:**

1. Go to Supabase Dashboard → SQL Editor
2. Open the file `supabase/migrations/06_setup_cron_jobs.sql`
3. **Replace placeholders** before executing:
   - Replace `<PROJECT_REF>` with: `pjpfsclekrvsvwftpkyv` (from your Supabase URL)
   - Replace `<SCRAPE_SECRET>` with the value from `.env.local`
4. Run the entire SQL script in the SQL Editor
5. Verify jobs are scheduled by running:
   ```sql
   SELECT * FROM cron.job;
   ```

**Expected result:** 4 cron jobs scheduled:

- `scrape-morning` (07:00 UTC = 08:00/09:00 Madrid)
- `scrape-midday` (11:00 UTC = 12:00/13:00 Madrid)
- `scrape-afternoon` (15:00 UTC = 16:00/17:00 Madrid)
- `scrape-evening` (17:00 UTC = 18:00/19:00 Madrid)

**To verify execution:**

```sql
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

---

### 2. Verify Environment Variables in Netlify

Ensure all environment variables from `.env.local` are set in Netlify.

**Steps:**

1. Go to [Netlify Dashboard](https://app.netlify.com) → Your Site (evminds)
2. Go to **Site settings** → **Environment variables**
3. Verify these variables are set:

   ```bash
   PUBLIC_SUPABASE_URL=<from .env.local>
   PUBLIC_SUPABASE_ANON_KEY=<from .env.local>
   SUPABASE_SERVICE_ROLE_KEY=<from .env.local>
   SCRAPE_SECRET=<from .env.local>
   OPENAI_API_KEY=<from .env.local — or remove if no longer needed>
   PUBLIC_UMAMI_WEBSITE_ID=<from .env.local>
   ```

4. **Important:** If any variable is missing or incorrect, add/update it
5. After changes, trigger a new deploy for variables to take effect

---

### 3. Complete DNS Verification and SSL Certificate

Your domain `evminds.es` is configured but pending DNS verification.

**Steps:**

1. Go to [Netlify Dashboard](https://app.netlify.com) → Your Site (evminds)
2. Go to **Domain management** → **Domains**
3. Find `evminds.es` in the custom domains list
4. Click **"Retry DNS verification"** button
5. Wait 1-2 minutes for verification to complete

**Expected results:**

- ✅ DNS verified
- ✅ SSL certificate auto-generated (Let's Encrypt)
- ✅ Site accessible at `https://evminds.es` (HTTPS enabled)

**To verify:**

- Visit https://evminds.es in a browser
- Check for the padlock icon (SSL active)
- Check that https://www.evminds.es redirects to https://evminds.es

---

## 📊 Testing After Setup

After completing all steps above, test the entire flow:

1. **Manual scraper test:**

   ```bash
   # Test the scraper Edge Function manually
   curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/scrape \
     -H "Authorization: Bearer <SCRAPE_SECRET from .env.local>"
   ```

2. **Check articles in database:**
   - Go to Supabase Dashboard → Table Editor → `articles`
   - Verify articles are being scraped and stored

3. **Verify SEO:**
   - Visit https://evminds.es
   - View page source (Ctrl+U / Cmd+Option+U)
   - Verify meta tags, Open Graph tags are present
   - Check https://evminds.es/sitemap-index.xml exists
   - Check https://evminds.es/robots.txt exists

4. **Verify Analytics:**
   - Visit https://evminds.es
   - Go to Umami Dashboard
   - Verify visit is tracked

---

## 🎯 Next Steps (After Phase 1 SEO & Automation)

Once these steps are complete, the remaining Phase 1 tasks are:

1. **Scroll infinito con Intersection Observer**
2. **Footer completo**
3. **Filtro de categorías**

These are frontend features and don't require manual Supabase/Netlify configuration.

---

**Questions or issues?** Check the logs in:

- Supabase: Functions → Logs
- Netlify: Deploys → Deploy log
- Cron jobs: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;`
