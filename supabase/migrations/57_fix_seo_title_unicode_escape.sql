-- Fixes one article's seo_title, corrupted by a Gemini SEO-title generation
-- quirk that emitted literal `á`/`ñ` escape notation instead of the
-- real accented characters. Confirmed unrelated to the editorial-wizard work
-- on this branch (Fer, 2026-08-03) — a one-off data fix, not a schema change.
UPDATE articles
SET seo_title = 'MG ZS EV, el SUV eléctrico más vendido en España'
WHERE id = '08884dd4-efec-4d3e-bf4c-07dff7af3a00';
