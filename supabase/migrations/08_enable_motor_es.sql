-- Migration 8: Enable motor.es source
-- motor.es is a general automotive site, but the scraper applies
-- an EV keyword filter (motor-filter.ts) so only electric vehicle
-- articles are ingested.

UPDATE sources
SET active = true
WHERE name = 'motor.es';

-- Verify
SELECT name, lang, active FROM sources ORDER BY active DESC, name;
