-- Add bio and avatar_url fields to profiles table
-- This migration enhances user profiles with:
-- 1. A bio field for user descriptions (max 280 characters)
-- 2. An avatar_url field for profile pictures

-- Add bio column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bio TEXT CHECK (char_length(bio) <= 280);

-- Add avatar_url column for profile pictures
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add updated_at column to track profile changes
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profile_updated_at();

-- Comment on new columns
COMMENT ON COLUMN public.profiles.bio IS 'User bio/description (max 280 characters)';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to user profile picture (from Supabase Storage or external)';
COMMENT ON COLUMN public.profiles.updated_at IS 'Timestamp of last profile update';
