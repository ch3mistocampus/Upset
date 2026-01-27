-- Usage tracking table for free tier limits
CREATE TABLE public.usage_tracking (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  events_picked_count INTEGER NOT NULL DEFAULT 0,
  posts_created_count INTEGER NOT NULL DEFAULT 0,
  events_picked_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own usage" ON public.usage_tracking
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own usage" ON public.usage_tracking
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role manages usage" ON public.usage_tracking
  FOR ALL USING (auth.role() = 'service_role');

-- Auto-create row on profile creation
CREATE OR REPLACE FUNCTION public.create_default_usage()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.usage_tracking (user_id)
  VALUES (NEW.user_id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_usage
  AFTER INSERT ON public.profiles FOR EACH ROW
  EXECUTE FUNCTION public.create_default_usage();

-- RPC: Increment event usage atomically
CREATE OR REPLACE FUNCTION public.increment_event_usage(p_event_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INTEGER; v_ids UUID[];
BEGIN
  INSERT INTO public.usage_tracking (user_id) VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT events_picked_ids INTO v_ids FROM public.usage_tracking WHERE user_id = auth.uid();
  IF p_event_id = ANY(v_ids) THEN
    SELECT events_picked_count INTO v_count FROM public.usage_tracking WHERE user_id = auth.uid();
    RETURN json_build_object('count', v_count, 'already_counted', true);
  END IF;

  UPDATE public.usage_tracking
  SET events_picked_count = events_picked_count + 1,
      events_picked_ids = array_append(events_picked_ids, p_event_id),
      updated_at = now()
  WHERE user_id = auth.uid()
  RETURNING events_picked_count INTO v_count;

  RETURN json_build_object('count', v_count, 'already_counted', false);
END;
$$;

-- RPC: Increment post usage
CREATE OR REPLACE FUNCTION public.increment_post_usage()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INTEGER;
BEGIN
  INSERT INTO public.usage_tracking (user_id) VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.usage_tracking
  SET posts_created_count = posts_created_count + 1, updated_at = now()
  WHERE user_id = auth.uid()
  RETURNING posts_created_count INTO v_count;

  RETURN v_count;
END;
$$;
