-- Migration 5: Disable Spanish sources (testing phase)
-- Keep only English sources active (electrek, cnevpost)

-- Disable Spanish sources temporarily
UPDATE sources
SET active = false
WHERE lang = 'es';

-- Keep English sources active
UPDATE sources
SET active = true
WHERE lang = 'en';

-- Verify active sources
SELECT name, lang, active FROM sources ORDER BY active DESC, lang, name;
