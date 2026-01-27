-- Backfill subscription + usage rows for all existing profiles
INSERT INTO public.subscriptions (user_id, status)
SELECT user_id, 'free' FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.usage_tracking (user_id)
SELECT user_id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;
