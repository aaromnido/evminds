-- Migration 51: hard-delete a single article at Fer's explicit request
-- (not an archive — a real DELETE from the articles table).
--
-- Article: "Por si el mercado chino de coches eléctricos no estuviera ya lo
-- suficientemente saturado, una nueva marca entra en la carrera"
-- id: 33227459-9dd3-4ec7-b7bc-4e7f72b4ba5c
--
-- Idempotent: re-running is safe, the second run simply deletes 0 rows.
DELETE FROM articles WHERE id = '33227459-9dd3-4ec7-b7bc-4e7f72b4ba5c';
