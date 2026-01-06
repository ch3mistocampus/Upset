-- Phase 3.2: Add storage bucket validation
-- Add file size limits, type restrictions, and per-user quota tracking

-- Update bucket configuration with file size limit (if supported by your Supabase version)
UPDATE storage.buckets
SET file_size_limit = 5242880, -- 5MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
WHERE id = 'post-images';

-- Create user storage quota tracking table
CREATE TABLE IF NOT EXISTS public.user_storage_quota (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_bytes_used BIGINT NOT NULL DEFAULT 0,
  file_count INTEGER NOT NULL DEFAULT 0,
  max_bytes_allowed BIGINT NOT NULL DEFAULT 104857600, -- 100MB default
  max_files_allowed INTEGER NOT NULL DEFAULT 500, -- 500 files default
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quota lookups
CREATE INDEX IF NOT EXISTS idx_user_storage_quota_user
  ON public.user_storage_quota(user_id);

-- Enable RLS
ALTER TABLE public.user_storage_quota ENABLE ROW LEVEL SECURITY;

-- Users can view their own quota
CREATE POLICY "Users can view their own storage quota"
  ON public.user_storage_quota FOR SELECT
  USING (auth.uid() = user_id);

-- Drop existing permissive policies and replace with restrictive ones
DROP POLICY IF EXISTS "Authenticated users can upload post images" ON storage.objects;
DROP POLICY IF EXISTS "Post images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own post images" ON storage.objects;

-- Create more restrictive upload policy with validation
CREATE POLICY "Authenticated users can upload validated post images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post-images'
    AND auth.role() = 'authenticated'
    -- File must be in user's folder
    AND (storage.foldername(name))[1] = auth.uid()::text
    -- Validate mime type (belt and suspenders with bucket config)
    AND (
      (metadata->>'mimetype') IS NULL
      OR (metadata->>'mimetype') IN ('image/jpeg', 'image/png', 'image/gif', 'image/webp')
    )
  );

-- Public read access for post images
CREATE POLICY "Post images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images');

-- Users can only delete their own images
CREATE POLICY "Users can delete their own post images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'post-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Function to check and update storage quota
CREATE OR REPLACE FUNCTION check_storage_quota(
  p_file_size BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_current_bytes BIGINT;
  v_current_files INTEGER;
  v_max_bytes BIGINT;
  v_max_files INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get or create quota record
  INSERT INTO public.user_storage_quota (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Get current quota
  SELECT total_bytes_used, file_count, max_bytes_allowed, max_files_allowed
  INTO v_current_bytes, v_current_files, v_max_bytes, v_max_files
  FROM public.user_storage_quota
  WHERE user_id = v_user_id;

  -- Check if upload would exceed quota
  IF (v_current_bytes + p_file_size) > v_max_bytes THEN
    RETURN FALSE;
  END IF;

  IF (v_current_files + 1) > v_max_files THEN
    RETURN FALSE;
  END IF;

  -- Update quota
  UPDATE public.user_storage_quota
  SET
    total_bytes_used = total_bytes_used + p_file_size,
    file_count = file_count + 1,
    updated_at = now()
  WHERE user_id = v_user_id;

  RETURN TRUE;
END;
$$;

-- Function to decrease quota when file is deleted
CREATE OR REPLACE FUNCTION decrease_storage_quota(
  p_file_size BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.user_storage_quota
  SET
    total_bytes_used = GREATEST(total_bytes_used - p_file_size, 0),
    file_count = GREATEST(file_count - 1, 0),
    updated_at = now()
  WHERE user_id = v_user_id;
END;
$$;

-- Function to get user's storage quota status
CREATE OR REPLACE FUNCTION get_storage_quota_status()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_quota RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get or create quota record
  INSERT INTO public.user_storage_quota (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_quota
  FROM public.user_storage_quota
  WHERE user_id = v_user_id;

  RETURN json_build_object(
    'total_bytes_used', v_quota.total_bytes_used,
    'max_bytes_allowed', v_quota.max_bytes_allowed,
    'bytes_remaining', v_quota.max_bytes_allowed - v_quota.total_bytes_used,
    'file_count', v_quota.file_count,
    'max_files_allowed', v_quota.max_files_allowed,
    'files_remaining', v_quota.max_files_allowed - v_quota.file_count,
    'usage_percentage', ROUND((v_quota.total_bytes_used::NUMERIC / v_quota.max_bytes_allowed) * 100, 2)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_storage_quota_status() TO authenticated;

-- Function to recalculate user's storage usage from actual files
CREATE OR REPLACE FUNCTION recalculate_storage_quota(p_user_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_target_user UUID := COALESCE(p_user_id, auth.uid());
  v_total_bytes BIGINT;
  v_file_count INTEGER;
BEGIN
  IF v_target_user IS NULL THEN
    RAISE EXCEPTION 'User ID required';
  END IF;

  -- Calculate actual usage from storage.objects
  SELECT
    COALESCE(SUM((metadata->>'size')::BIGINT), 0),
    COUNT(*)
  INTO v_total_bytes, v_file_count
  FROM storage.objects
  WHERE bucket_id = 'post-images'
    AND (storage.foldername(name))[1] = v_target_user::text;

  -- Update quota record
  INSERT INTO public.user_storage_quota (user_id, total_bytes_used, file_count)
  VALUES (v_target_user, v_total_bytes, v_file_count)
  ON CONFLICT (user_id) DO UPDATE
  SET
    total_bytes_used = v_total_bytes,
    file_count = v_file_count,
    updated_at = now();

  RETURN v_file_count;
END;
$$;

GRANT EXECUTE ON FUNCTION recalculate_storage_quota(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_storage_quota(UUID) TO service_role;

-- Add comments for documentation
COMMENT ON TABLE public.user_storage_quota IS 'Tracks per-user storage usage for upload quotas';
COMMENT ON COLUMN public.user_storage_quota.max_bytes_allowed IS 'Maximum storage in bytes (default 100MB)';
COMMENT ON COLUMN public.user_storage_quota.max_files_allowed IS 'Maximum number of files (default 500)';
