-- Migration 9: Delete wrongly imported F1 article
-- The article passed the EV filter because keyword "ev" matched "nueva" (substring)

DELETE FROM articles
WHERE article_url = 'https://www.motor.es/formula-1/sainz-inventa-tactica-defensiva-tren-drs-overtake-mode-2026113141.html';
