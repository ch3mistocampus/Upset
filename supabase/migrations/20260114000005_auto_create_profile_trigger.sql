-- Migration: Auto-create profile on user signup
-- Fixes P2 bug: Users in auth.users without corresponding profiles
--
-- Problem: Profiles are only created via app code in create-username screen.
-- If that flow is interrupted (OAuth failure, app crash, network issue),
-- users end up authenticated but without a profile.
--
-- Solution: Database trigger that auto-creates a placeholder profile
-- when a new user is created in auth.users.

-- ============================================================================
-- STEP 1: Create function to auto-generate profile
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  placeholder_username TEXT;
  username_exists BOOLEAN;
  attempt_count INTEGER := 0;
  max_attempts INTEGER := 10;
BEGIN
  -- Generate a unique placeholder username
  -- Format: user_XXXXXXXX (8 chars from UUID)
  LOOP
    IF attempt_count = 0 THEN
      placeholder_username := 'user_' || substr(NEW.id::text, 1, 8);
    ELSE
      -- Add random suffix if collision
      placeholder_username := 'user_' || substr(md5(NEW.id::text || attempt_count::text), 1, 8);
    END IF;

    -- Check if username already exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE username = placeholder_username)
    INTO username_exists;

    EXIT WHEN NOT username_exists OR attempt_count >= max_attempts;
    attempt_count := attempt_count + 1;
  END LOOP;

  -- Insert the profile (ignore if already exists via ON CONFLICT)
  INSERT INTO public.profiles (user_id, username)
  VALUES (NEW.id, placeholder_username)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Failed to auto-create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- ============================================================================
-- STEP 2: Create trigger on auth.users
-- ============================================================================

-- Drop trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger that fires after user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- STEP 3: Backfill orphaned users (users without profiles)
-- ============================================================================

-- Create profiles for any existing users who don't have one
DO $$
DECLARE
  orphan_record RECORD;
  placeholder_username TEXT;
  username_exists BOOLEAN;
  attempt_count INTEGER;
  created_count INTEGER := 0;
BEGIN
  FOR orphan_record IN
    SELECT au.id, au.email
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.user_id = au.id
    WHERE p.user_id IS NULL
  LOOP
    attempt_count := 0;

    LOOP
      IF attempt_count = 0 THEN
        placeholder_username := 'user_' || substr(orphan_record.id::text, 1, 8);
      ELSE
        placeholder_username := 'user_' || substr(md5(orphan_record.id::text || attempt_count::text), 1, 8);
      END IF;

      SELECT EXISTS(SELECT 1 FROM public.profiles WHERE username = placeholder_username)
      INTO username_exists;

      EXIT WHEN NOT username_exists OR attempt_count >= 10;
      attempt_count := attempt_count + 1;
    END LOOP;

    INSERT INTO public.profiles (user_id, username)
    VALUES (orphan_record.id, placeholder_username)
    ON CONFLICT (user_id) DO NOTHING;

    created_count := created_count + 1;
    RAISE NOTICE 'Created profile for orphaned user: % with username: %', orphan_record.id, placeholder_username;
  END LOOP;

  IF created_count > 0 THEN
    RAISE NOTICE 'Backfill complete: Created % profile(s) for orphaned users', created_count;
  ELSE
    RAISE NOTICE 'Backfill complete: No orphaned users found';
  END IF;
END;
$$;

-- ============================================================================
-- STEP 4: Add comment for documentation
-- ============================================================================

COMMENT ON FUNCTION public.handle_new_user() IS
'Auto-creates a placeholder profile when a new user signs up.
Username format: user_XXXXXXXX (8 chars from UUID).
Users can update their username later via the app.
This prevents the edge case where OAuth/signup flow is interrupted
before the create-username screen completes.';
