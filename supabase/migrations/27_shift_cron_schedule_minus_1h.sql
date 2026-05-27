-- Migration 27: Shift all 4 scrape cron jobs 1 hour earlier (UTC).
-- Reason: With CEST (UTC+2) the morning run was firing at 09:00 Spain time,
-- which felt too late. Shifting -1h keeps Spain morning at 08:00 in summer
-- and 07:00 in winter. pg_cron only understands UTC and cannot follow DST,
-- so we accept the winter drift in exchange for an earlier summer start.
--
-- Schedule mapping after this change:
--   scrape-morning   06:00 UTC -> 08:00 ES summer / 07:00 ES winter
--   scrape-midday    10:00 UTC -> 12:00 ES summer / 11:00 ES winter
--   scrape-afternoon 14:00 UTC -> 16:00 ES summer / 15:00 ES winter
--   scrape-evening   16:00 UTC -> 18:00 ES summer / 17:00 ES winter

SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'scrape-morning'),
  schedule => '0 6 * * *'
);

SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'scrape-midday'),
  schedule => '0 10 * * *'
);

SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'scrape-afternoon'),
  schedule => '0 14 * * *'
);

SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'scrape-evening'),
  schedule => '0 16 * * *'
);

-- Verify
SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'scrape-%' ORDER BY jobname;
