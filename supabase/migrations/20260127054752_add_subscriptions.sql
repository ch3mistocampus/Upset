-- Subscriptions table for Upset Pro monetization
CREATE TABLE public.subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'free'
    CHECK (status IN ('free', 'pro', 'trial', 'expired', 'cancelled')),
  plan TEXT CHECK (plan IN ('monthly', 'yearly')),
  product_id TEXT,
  original_transaction_id TEXT,
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  trial_started_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role manages subscriptions" ON public.subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- Auto-create free row on profile creation
CREATE OR REPLACE FUNCTION public.create_default_subscription()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, status)
  VALUES (NEW.user_id, 'free') ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_subscription
  AFTER INSERT ON public.profiles FOR EACH ROW
  EXECUTE FUNCTION public.create_default_subscription();
