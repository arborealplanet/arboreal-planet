-- Hatchling Stakes functions call pgcrypto helpers (gen_random_bytes, digest),
-- which live in the "extensions" schema on this project. The original migration
-- set search_path = public on every function, so those calls raised 42883
-- ("No function matches the given name and argument types") at execution time.
-- Widen the search_path instead of restating function bodies.
ALTER FUNCTION public.hatchling_stakes_register_offspring(text, jsonb, jsonb) SET search_path = public, extensions;
ALTER FUNCTION public.hatchling_stakes_create_npc_wager(text) SET search_path = public, extensions;
ALTER FUNCTION public.hatchling_stakes_start_session(uuid, text, jsonb) SET search_path = public, extensions;
ALTER FUNCTION public.hatchling_stakes_settle(uuid, uuid, int) SET search_path = public, extensions;
ALTER FUNCTION public.hatchling_stakes_void(uuid, text) SET search_path = public, extensions;
