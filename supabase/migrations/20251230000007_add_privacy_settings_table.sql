-- Add Privacy Settings Table
-- Sprint 2: Social Features (No Leagues)
--
-- This migration creates the privacy_settings table to manage user privacy preferences.
--
-- Features:
-- - Per-user privacy controls
-- - Picks visibility: public, friends, private
-- - Profile visibility: public, friends, private
-- - Stats visibility: public, friends, private
-- - Default values for all users
-- - Automatic creation via trigger

-- Create privacy_settings table
CREATE TABLE IF NOT EXISTS public.privacy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  picks_visibility TEXT NOT NULL DEFAULT 'public' CHECK (picks_visibility IN ('public', 'friends', 'private')),
  profile_visibility TEXT NOT NULL DEFAULT 'public' CHECK (profile_visibility IN ('public', 'friends', 'private')),
  stats_visibility TEXT NOT NULL DEFAULT 'public' CHECK (stats_visibility IN ('public', 'friends', 'private')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- One privacy setting per user
  CONSTRAINT unique_privacy_settings_per_user UNIQUE (user_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_privacy_settings_user_id ON public.privacy_settings(user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_privacy_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER privacy_settings_updated_at
  BEFORE UPDATE ON public.privacy_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_privacy_settings_updated_at();

-- Create default privacy settings for existing users
INSERT INTO public.privacy_settings (user_id, picks_visibility, profile_visibility, stats_visibility)
SELECT
  id,
  'public',
  'public',
  'public'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.privacy_settings)
ON CONFLICT (user_id) DO NOTHING;

-- Trigger to create default privacy settings for new users
CREATE OR REPLACE FUNCTION create_default_privacy_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.privacy_settings (user_id, picks_visibility, profile_visibility, stats_visibility)
  VALUES (NEW.id, 'public', 'public', 'public')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This trigger goes on auth.users, which requires superuser privileges
-- It will be created automatically by Supabase when migrations are applied
-- If running locally, you may need to create it manually in the Supabase dashboard
CREATE TRIGGER on_auth_user_created_privacy_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_privacy_settings();

-- RLS Policies for privacy_settings
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their own privacy settings
CREATE POLICY "Users can view their own privacy settings" ON public.privacy_settings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own privacy settings
CREATE POLICY "Users can update their own privacy settings" ON public.privacy_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can insert their own privacy settings (in case trigger fails)
CREATE POLICY "Users can insert their own privacy settings" ON public.privacy_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Anyone can view privacy settings (needed for RLS checks on other tables)
-- This is safe because we only expose the visibility levels, not sensitive data
CREATE POLICY "Privacy settings are readable for RLS checks" ON public.privacy_settings
  FOR SELECT
  USING (true);

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.privacy_settings TO authenticated;

-- Comments
COMMENT ON TABLE public.privacy_settings IS 'User privacy preferences for picks, profile, and stats visibility';
COMMENT ON COLUMN public.privacy_settings.user_id IS 'User these privacy settings belong to';
COMMENT ON COLUMN public.privacy_settings.picks_visibility IS 'Who can see this users picks: public, friends, or private';
COMMENT ON COLUMN public.privacy_settings.profile_visibility IS 'Who can see this users profile: public, friends, or private';
COMMENT ON COLUMN public.privacy_settings.stats_visibility IS 'Who can see this users stats: public, friends, or private';
COMMENT ON COLUMN public.privacy_settings.created_at IS 'When privacy settings were created';
COMMENT ON COLUMN public.privacy_settings.updated_at IS 'When privacy settings were last updated';
