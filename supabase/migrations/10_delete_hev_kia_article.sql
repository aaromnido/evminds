-- Migration 10: Delete non-EV article (HEV KIA Niro)
-- HEV (mild/full hybrid without plug) is not an electric vehicle

DELETE FROM articles
WHERE id = 'a27c95c6-41a6-4ba2-bece-3704e4933f48';
