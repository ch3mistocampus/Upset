-- ============================================================================
-- Data Source Settings & API Usage Tracking
-- ============================================================================
-- Stores app-wide settings for data sources and tracks API usage

-- App settings table (singleton pattern)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  -- Data source settings
  primary_data_source TEXT NOT NULL DEFAULT 'ufcstats' CHECK (primary_data_source IN ('ufcstats', 'mma-api')),
  fallback_enabled BOOLEAN NOT NULL DEFAULT true,
  -- Caching settings
  events_cache_hours INTEGER NOT NULL DEFAULT 24,  -- How long to cache event data
  fighters_cache_hours INTEGER NOT NULL DEFAULT 168,  -- 7 days for fighter data
  -- Last sync timestamps
  last_events_sync_at TIMESTAMPTZ,
  last_fighters_sync_at TIMESTAMPTZ,
  last_results_sync_at TIMESTAMPTZ,
  -- Metadata
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default settings
INSERT INTO public.app_settings (id) VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write settings
CREATE POLICY "Admins can read settings"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

CREATE POLICY "Admins can update settings"
  ON public.app_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- ============================================================================
-- API Usage Tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('ufcstats', 'mma-api')),
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  -- Track by month for billing purposes
  usage_month TEXT NOT NULL,  -- Format: YYYY-MM
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint for upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_usage_provider_endpoint_month
  ON public.api_usage(provider, endpoint, usage_month);

-- Enable RLS
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

-- Only service role can write, admins can read
CREATE POLICY "Admins can read API usage"
  ON public.api_usage
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- ============================================================================
-- Functions
-- ============================================================================

-- Get current data source settings
CREATE OR REPLACE FUNCTION public.get_data_source_settings()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'primary_data_source', primary_data_source,
      'fallback_enabled', fallback_enabled,
      'events_cache_hours', events_cache_hours,
      'fighters_cache_hours', fighters_cache_hours,
      'last_events_sync_at', last_events_sync_at,
      'last_fighters_sync_at', last_fighters_sync_at,
      'last_results_sync_at', last_results_sync_at
    )
    FROM app_settings
    WHERE id = 'default'
  );
END;
$$;

-- Update data source (admin only)
CREATE OR REPLACE FUNCTION public.set_primary_data_source(p_source TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Only admins can change data source settings';
  END IF;

  -- Validate source
  IF p_source NOT IN ('ufcstats', 'mma-api') THEN
    RAISE EXCEPTION 'Invalid data source: %', p_source;
  END IF;

  UPDATE app_settings
  SET
    primary_data_source = p_source,
    updated_at = NOW(),
    updated_by = auth.uid()
  WHERE id = 'default';

  RETURN true;
END;
$$;

-- Track API usage (called by edge functions)
CREATE OR REPLACE FUNCTION public.track_api_usage(
  p_provider TEXT,
  p_endpoint TEXT,
  p_count INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month TEXT;
BEGIN
  v_month := to_char(NOW(), 'YYYY-MM');

  INSERT INTO api_usage (provider, endpoint, usage_month, request_count)
  VALUES (p_provider, p_endpoint, v_month, p_count)
  ON CONFLICT (provider, endpoint, usage_month)
  DO UPDATE SET
    request_count = api_usage.request_count + p_count,
    updated_at = NOW();
END;
$$;

-- Get API usage summary for current month
CREATE OR REPLACE FUNCTION public.get_api_usage_summary()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month TEXT;
BEGIN
  v_month := to_char(NOW(), 'YYYY-MM');

  RETURN (
    SELECT json_build_object(
      'month', v_month,
      'by_provider', (
        SELECT json_object_agg(provider, total)
        FROM (
          SELECT provider, SUM(request_count) as total
          FROM api_usage
          WHERE usage_month = v_month
          GROUP BY provider
        ) s
      ),
      'total_requests', (
        SELECT COALESCE(SUM(request_count), 0)
        FROM api_usage
        WHERE usage_month = v_month
      ),
      'mma_api_limit', 80,  -- Free tier limit
      'mma_api_used', (
        SELECT COALESCE(SUM(request_count), 0)
        FROM api_usage
        WHERE usage_month = v_month AND provider = 'mma-api'
      )
    )
  );
END;
$$;

-- Update last sync timestamp
CREATE OR REPLACE FUNCTION public.update_sync_timestamp(p_sync_type TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CASE p_sync_type
    WHEN 'events' THEN
      UPDATE app_settings SET last_events_sync_at = NOW() WHERE id = 'default';
    WHEN 'fighters' THEN
      UPDATE app_settings SET last_fighters_sync_at = NOW() WHERE id = 'default';
    WHEN 'results' THEN
      UPDATE app_settings SET last_results_sync_at = NOW() WHERE id = 'default';
    ELSE
      RAISE EXCEPTION 'Invalid sync type: %', p_sync_type;
  END CASE;
END;
$$;

-- Check if sync is needed based on cache settings
CREATE OR REPLACE FUNCTION public.should_sync(p_sync_type TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings RECORD;
  v_last_sync TIMESTAMPTZ;
  v_cache_hours INTEGER;
BEGIN
  SELECT * INTO v_settings FROM app_settings WHERE id = 'default';

  CASE p_sync_type
    WHEN 'events' THEN
      v_last_sync := v_settings.last_events_sync_at;
      v_cache_hours := v_settings.events_cache_hours;
    WHEN 'fighters' THEN
      v_last_sync := v_settings.last_fighters_sync_at;
      v_cache_hours := v_settings.fighters_cache_hours;
    WHEN 'results' THEN
      v_last_sync := v_settings.last_results_sync_at;
      v_cache_hours := 1;  -- Results should be checked more frequently
    ELSE
      RETURN true;  -- Unknown type, sync to be safe
  END CASE;

  -- If never synced, sync now
  IF v_last_sync IS NULL THEN
    RETURN true;
  END IF;

  -- Check if cache has expired
  RETURN v_last_sync < NOW() - (v_cache_hours || ' hours')::INTERVAL;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_data_source_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_primary_data_source(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_api_usage(TEXT, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_api_usage_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_sync_timestamp(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.should_sync(TEXT) TO authenticated, service_role;
