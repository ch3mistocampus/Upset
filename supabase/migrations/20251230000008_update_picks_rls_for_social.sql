-- Update Picks RLS Policies for Social Features
-- Sprint 2: Social Features (No Leagues)
--
-- This migration updates the picks table RLS policies to support:
-- - Always-visible picks (per user requirement: "users should be able to see others picks at any time")
-- - Privacy settings (public, friends, private)
-- - Friendship-based visibility
--
-- CRITICAL: Picks are ALWAYS visible to friends, regardless of timing.
-- No time-based locking before events.

-- Drop existing pick visibility policies
DROP POLICY IF EXISTS "Users can view their own picks" ON public.picks;
DROP POLICY IF EXISTS "Users can view picks for fights they can see" ON public.picks;

-- Create new comprehensive pick visibility policy
CREATE POLICY "Users can view picks based on privacy" ON public.picks
  FOR SELECT
  USING (
    -- Users can always see their own picks
    auth.uid() = user_id
    OR
    -- Public picks are visible to everyone
    EXISTS (
      SELECT 1 FROM public.privacy_settings ps
      WHERE ps.user_id = picks.user_id
      AND ps.picks_visibility = 'public'
    )
    OR
    -- Friends can see picks if visibility is 'public' or 'friends'
    (
      EXISTS (
        SELECT 1 FROM public.privacy_settings ps
        WHERE ps.user_id = picks.user_id
        AND ps.picks_visibility IN ('public', 'friends')
      )
      AND
      EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE (
          (f.user_id = auth.uid() AND f.friend_id = picks.user_id)
          OR
          (f.friend_id = auth.uid() AND f.user_id = picks.user_id)
        )
        AND f.status = 'accepted'
      )
    )
  );

-- Users can still only create their own picks
-- (No changes needed to INSERT policy)

-- Users can still only update their own picks before fight starts
-- (No changes needed to UPDATE policy)

-- Picks remain immutable (cannot be deleted)
-- (No changes needed to DELETE policy - already set to false in previous migration)

-- Comments
COMMENT ON POLICY "Users can view picks based on privacy" ON public.picks IS
  'Users can view: (1) their own picks, (2) public picks from anyone, (3) picks from friends if privacy allows. Picks are ALWAYS visible to friends (no time-based locking).';
