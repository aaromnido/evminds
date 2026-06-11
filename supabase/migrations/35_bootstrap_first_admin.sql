-- One-off: promote the first admin (Fase 4 bootstrap).
--
-- The auth user was created in the Supabase dashboard; the handle_new_user
-- trigger (migration 32) already inserted a profiles row with role='user'.
-- This flips that row to 'admin' so is_admin() returns true and the middleware
-- grants access to /admin.
--
-- Matched by email (stable, readable) rather than a hardcoded UUID. Idempotent:
-- re-running just sets the role to 'admin' again.

UPDATE public.profiles
SET role = 'admin', updated_at = now()
WHERE id = (SELECT id FROM auth.users WHERE email = 'aaromnido@gmail.com');
