-- Migration 19: Fix cron jobs with actual project URL and token.
-- Previous migrations used placeholders (YOUR_PROJECT_REF / YOUR_SCRAPE_SECRET)
-- which caused all scheduled scrapes to fail silently.

-- Remove existing broken jobs
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
    'https://{{SUPABASE_PROJECT_REF}}.supabase.co/functions/v1/scrape',
    headers := '{"Authorization": "Bearer {{SCRAPE_SECRET}}"}'::jsonb,
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
    'https://{{SUPABASE_PROJECT_REF}}.supabase.co/functions/v1/scrape',
    headers := '{"Authorization": "Bearer {{SCRAPE_SECRET}}"}'::jsonb,
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
    'https://{{SUPABASE_PROJECT_REF}}.supabase.co/functions/v1/scrape',
    headers := '{"Authorization": "Bearer {{SCRAPE_SECRET}}"}'::jsonb,
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
    'https://{{SUPABASE_PROJECT_REF}}.supabase.co/functions/v1/scrape',
    headers := '{"Authorization": "Bearer {{SCRAPE_SECRET}}"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Verify jobs are created and active
SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'scrape-%';
