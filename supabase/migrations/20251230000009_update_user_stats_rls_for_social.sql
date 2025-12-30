-- Update User Stats RLS Policies for Social Features
-- Sprint 2: Social Features (No Leagues)
--
-- This migration updates the user_stats table RLS policies to support:
-- - Privacy settings (public, friends, private)
-- - Friendship-based visibility
-- - Leaderboard access

-- Drop existing user_stats visibility policies
DROP POLICY IF EXISTS "Users can view their own stats" ON public.user_stats;
DROP POLICY IF EXISTS "User stats are publicly readable" ON public.user_stats;

-- Create new comprehensive stats visibility policy
CREATE POLICY "Users can view stats based on privacy" ON public.user_stats
  FOR SELECT
  USING (
    -- Users can always see their own stats
    auth.uid() = user_id
    OR
    -- Public stats are visible to everyone
    EXISTS (
      SELECT 1 FROM public.privacy_settings ps
      WHERE ps.user_id = user_stats.user_id
      AND ps.stats_visibility = 'public'
    )
    OR
    -- Friends can see stats if visibility is 'public' or 'friends'
    (
      EXISTS (
        SELECT 1 FROM public.privacy_settings ps
        WHERE ps.user_id = user_stats.user_id
        AND ps.stats_visibility IN ('public', 'friends')
      )
      AND
      EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE (
          (f.user_id = auth.uid() AND f.friend_id = user_stats.user_id)
          OR
          (f.friend_id = auth.uid() AND f.user_id = user_stats.user_id)
        )
        AND f.status = 'accepted'
      )
    )
  );

-- Users can still only update their own stats via the grading function
-- (No changes needed to UPDATE policy)

-- Comments
COMMENT ON POLICY "Users can view stats based on privacy" ON public.user_stats IS
  'Users can view: (1) their own stats, (2) public stats from anyone, (3) stats from friends if privacy allows.';
