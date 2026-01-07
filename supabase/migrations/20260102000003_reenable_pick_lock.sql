-- Re-enable pick lock trigger after seeding historical data
-- This reverses the temporary disable from 20260102000002

ALTER TABLE public.picks ENABLE TRIGGER enforce_pick_lock;
