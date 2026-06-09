-- Rename the "Coches Eléctricos Org" source to use the .org-style name,
-- matching the channel's website identity. Corrects migration 30, which was
-- already applied to remote with the plain slug 'cocheselectricos'.
-- Idempotent: on a fresh setup migration 30 already inserts the final name,
-- so this UPDATE matches no rows and is a no-op.
UPDATE sources
SET name = 'cocheselectricos.org'
WHERE name = 'cocheselectricos';
