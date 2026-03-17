-- Migration 11: Recreate cron jobs for scraper
-- Ensures cron jobs exist and use the correct URL/token.
-- Safe to run even if jobs already exist (unschedule first).

-- Remove existing jobs (ignore errors if they don't exist)
SELECT cron.unschedule('scrape-morning');
SELECT cron.unschedule('scrape-midday');
SELECT cron.unschedule('scrape-afternoon');
SELECT cron.unschedule('scrape-evening');

-- Job 1: 07:00 UTC (08:00 CET / 09:00 CEST)
SELECT cron.schedule(
  'scrape-morning',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/scrape',
    headers := '{"Authorization": "Bearer YOUR_SCRAPE_SECRET"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Job 2: 11:00 UTC (12:00 CET / 13:00 CEST)
SELECT cron.schedule(
  'scrape-midday',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/scrape',
    headers := '{"Authorization": "Bearer YOUR_SCRAPE_SECRET"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Job 3: 15:00 UTC (16:00 CET / 17:00 CEST)
SELECT cron.schedule(
  'scrape-afternoon',
  '0 15 * * *',
  $$
  SELECT net.http_post(
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/scrape',
    headers := '{"Authorization": "Bearer YOUR_SCRAPE_SECRET"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Job 4: 17:00 UTC (18:00 CET / 19:00 CEST)
SELECT cron.schedule(
  'scrape-evening',
  '0 17 * * *',
  $$
  SELECT net.http_post(
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/scrape',
    headers := '{"Authorization": "Bearer YOUR_SCRAPE_SECRET"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Verify
SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'scrape-%';
