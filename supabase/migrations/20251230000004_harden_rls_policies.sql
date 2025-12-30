-- ============================================================================
-- Sprint 0: RLS Policy Hardening
-- ============================================================================
-- Purpose: Strengthen RLS policies before production launch
-- Changes:
--   1. Make picks immutable (prevent deletions for integrity)
--   2. Remove unnecessary profile delete policy (CASCADE handles this)
--   3. Add public username lookup (prep for Sprint 2 social features)
--   4. Add documentation comments for service_role bypass policies
-- ============================================================================

-- ============================================================================
-- 1. PICKS: Make immutable (prevent deletions)
-- ============================================================================

-- Drop the existing delete policy that allowed users to delete their picks
DROP POLICY IF EXISTS "Users can delete own picks" ON public.picks;

-- Create new policy that prevents ALL pick deletions
-- This maintains leaderboard integrity and provides complete audit trail
CREATE POLICY "Picks are immutable after creation" ON public.picks
FOR DELETE
USING (false);

COMMENT ON POLICY "Picks are immutable after creation" ON public.picks IS
'Picks cannot be deleted to maintain leaderboard integrity and audit trail. Once created, picks are permanent even if voided.';

-- ============================================================================
-- 2. PROFILES: Remove unnecessary delete policy
-- ============================================================================

-- Profile deletion is handled by CASCADE from auth.users deletion
-- No need for explicit RLS policy since users don't delete via app
DROP POLICY IF EXISTS "Users cannot delete profiles" ON public.profiles;

-- ============================================================================
-- 3. PROFILES: Add public username lookup
-- ============================================================================

-- Allow public username lookup for social features (friend search, @ mentions, etc.)
-- Privacy will be controlled by privacy_settings table added in Sprint 2
CREATE POLICY "Usernames are publicly readable" ON public.profiles
FOR SELECT
USING (true);

COMMENT ON POLICY "Usernames are publicly readable" ON public.profiles IS
'Public username lookup enables friend search and social features. Full profile privacy controlled by privacy_settings table (Sprint 2).';

-- Note: This creates TWO select policies on profiles:
--   1. "Users can view own profile" - for reading full own profile
--   2. "Usernames are publicly readable" - for username lookup/search
-- Both policies are evaluated with OR logic (permissive by default)

-- ============================================================================
-- 4. Add documentation comments for service_role policies
-- ============================================================================

-- Document that these policies are bypassed by service_role key in Edge Functions
COMMENT ON POLICY "Only service role can insert events" ON public.events IS
'Bypassed by service_role key used in sync-events Edge Function. Mobile app cannot create events.';

COMMENT ON POLICY "Only service role can update events" ON public.events IS
'Bypassed by service_role key used in sync-events Edge Function. Allows status updates and card changes.';

COMMENT ON POLICY "Only service role can insert bouts" ON public.bouts IS
'Bypassed by service_role key used in sync-next-event-card Edge Function. Mobile app cannot create bouts.';

COMMENT ON POLICY "Only service role can update bouts" ON public.bouts IS
'Bypassed by service_role key used in sync-next-event-card Edge Function. Handles fighter changes and card updates.';

COMMENT ON POLICY "Only service role can insert results" ON public.results IS
'Bypassed by service_role key used in sync-recent-results-and-grade Edge Function. Results written during grading.';

COMMENT ON POLICY "Service role can update picks for grading" ON public.picks IS
'Bypassed by service_role key used in sync-recent-results-and-grade Edge Function. Updates status and score fields during automated grading.';

COMMENT ON POLICY "Only service role can insert stats" ON public.user_stats IS
'Bypassed by service_role key. Stats created by recalculate_user_stats() function called during grading.';

COMMENT ON POLICY "Only service role can update stats" ON public.user_stats IS
'Bypassed by service_role key. Stats updated by recalculate_user_stats() function called during grading.';

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Run these after migration to verify policies are correct

-- 1. Check all policies on picks table (should have 4 policies now)
-- SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'picks' ORDER BY cmd, policyname;

-- 2. Check all policies on profiles table (should have 3 SELECT + 1 INSERT + 1 UPDATE)
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles' ORDER BY cmd, policyname;

-- 3. Verify picks cannot be deleted (should return error)
-- DELETE FROM picks WHERE id = '00000000-0000-0000-0000-000000000000';  -- Should fail

-- 4. Verify usernames are publicly readable
-- SET ROLE anon;
-- SELECT username FROM profiles LIMIT 1;  -- Should succeed (if data exists)
-- RESET ROLE;
