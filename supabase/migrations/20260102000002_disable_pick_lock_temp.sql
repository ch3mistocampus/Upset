-- Temporarily disable pick lock trigger for seeding historical data
-- This migration will be deleted after seeding

ALTER TABLE public.picks DISABLE TRIGGER enforce_pick_lock;
