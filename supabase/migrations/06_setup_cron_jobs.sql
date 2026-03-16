-- Setup pg_cron for automatic article scraping
-- Run this migration manually in Supabase SQL Editor

-- Enable pg_cron extension (only needed once)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant permissions to cron schema
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Schedule scraper to run 4 times daily (UTC times)

-- Job 1: 07:00 UTC (08:00 CET winter / 09:00 CEST summer)
SELECT cron.schedule(
  'scrape-morning',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    'https://pjpfsclekrvsvwftpkyv.supabase.co/functions/v1/scrape',
    headers := '{"Authorization": "Bearer evminds_scraper_2026_secure_token_f8a3b9c2"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Job 2: 11:00 UTC (12:00 CET winter / 13:00 CEST summer)
SELECT cron.schedule(
  'scrape-midday',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    'https://pjpfsclekrvsvwftpkyv.supabase.co/functions/v1/scrape',
    headers := '{"Authorization": "Bearer evminds_scraper_2026_secure_token_f8a3b9c2"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Job 3: 15:00 UTC (16:00 CET winter / 17:00 CEST summer)
SELECT cron.schedule(
  'scrape-afternoon',
  '0 15 * * *',
  $$
  SELECT net.http_post(
    'https://pjpfsclekrvsvwftpkyv.supabase.co/functions/v1/scrape',
    headers := '{"Authorization": "Bearer evminds_scraper_2026_secure_token_f8a3b9c2"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Job 4: 17:00 UTC (18:00 CET winter / 19:00 CEST summer)
SELECT cron.schedule(
  'scrape-evening',
  '0 17 * * *',
  $$
  SELECT net.http_post(
    'https://pjpfsclekrvsvwftpkyv.supabase.co/functions/v1/scrape',
    headers := '{"Authorization": "Bearer evminds_scraper_2026_secure_token_f8a3b9c2"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Verify scheduled jobs
SELECT * FROM cron.job;

-- Optional: View cron job execution history
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- To manually unschedule a job (if needed):
-- SELECT cron.unschedule('scrape-morning');
-- SELECT cron.unschedule('scrape-midday');
-- SELECT cron.unschedule('scrape-afternoon');
-- SELECT cron.unschedule('scrape-evening');
