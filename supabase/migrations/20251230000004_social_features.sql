-- Social Features Schema
-- Tables: friendships, leagues, league_memberships, privacy_settings
-- Updates: profiles (add display_name)

-- ============================================================================
-- UPDATE PROFILES TABLE
-- ============================================================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS display_name TEXT CHECK (char_length(display_name) >= 1 AND char_length(display_name) <= 50);

-- Set display_name to username for existing users
UPDATE public.profiles
SET display_name = username
WHERE display_name IS NULL;

COMMENT ON COLUMN public.profiles.display_name IS 'Display name (1-50 characters), defaults to username';

-- ============================================================================
-- FRIENDSHIPS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_friendship UNIQUE(user_id, friend_id),
  CONSTRAINT no_self_friendship CHECK (user_id != friend_id)
);

COMMENT ON TABLE public.friendships IS 'Friend relationships between users';
COMMENT ON COLUMN public.friendships.user_id IS 'User who initiated the friend request';
COMMENT ON COLUMN public.friendships.friend_id IS 'User receiving the friend request';
COMMENT ON COLUMN public.friendships.status IS 'pending, accepted, declined, or blocked';

CREATE INDEX idx_friendships_user_status ON public.friendships(user_id, status);
CREATE INDEX idx_friendships_friend_status ON public.friendships(friend_id, status);
CREATE INDEX idx_friendships_accepted ON public.friendships(status) WHERE status = 'accepted';

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- LEAGUES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) >= 3 AND char_length(name) <= 50),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 500),
  invite_code TEXT UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN NOT NULL DEFAULT false,
  max_members INT NOT NULL DEFAULT 50 CHECK (max_members >= 2 AND max_members <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.leagues IS 'Private leagues for group competitions';
COMMENT ON COLUMN public.leagues.name IS 'League name (3-50 characters)';
COMMENT ON COLUMN public.leagues.invite_code IS 'Unique invite code for joining (e.g., UFC-ABCD-1234)';
COMMENT ON COLUMN public.leagues.is_public IS 'If true, league appears in public directory';
COMMENT ON COLUMN public.leagues.max_members IS 'Maximum number of members allowed (2-100)';

CREATE INDEX idx_leagues_invite_code ON public.leagues(invite_code);
CREATE INDEX idx_leagues_owner ON public.leagues(owner_id);
CREATE INDEX idx_leagues_public ON public.leagues(is_public) WHERE is_public = true;

-- Function to generate unique invite codes
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_count INT;
BEGIN
  LOOP
    -- Generate code format: UFC-XXXX-YYYY (uppercase letters and numbers)
    code := 'UFC-' ||
            substring(upper(md5(random()::text)) from 1 for 4) || '-' ||
            substring(upper(md5(random()::text)) from 1 for 4);

    -- Check if code exists
    SELECT COUNT(*) INTO exists_count FROM public.leagues WHERE invite_code = code;

    -- Exit loop if unique
    EXIT WHEN exists_count = 0;
  END LOOP;

  RETURN code;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_invite_code IS 'Generate unique invite code for new leagues';

-- ============================================================================
-- LEAGUE MEMBERSHIPS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.league_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_league_membership UNIQUE(league_id, user_id)
);

COMMENT ON TABLE public.league_memberships IS 'User memberships in leagues';
COMMENT ON COLUMN public.league_memberships.role IS 'admin (can manage) or member';

CREATE INDEX idx_league_memberships_league ON public.league_memberships(league_id);
CREATE INDEX idx_league_memberships_user ON public.league_memberships(user_id);
CREATE INDEX idx_league_memberships_admin ON public.league_memberships(league_id, role) WHERE role = 'admin';

-- ============================================================================
-- PRIVACY SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.privacy_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_visibility TEXT NOT NULL DEFAULT 'public' CHECK (profile_visibility IN ('public', 'friends', 'private')),
  show_on_leaderboards BOOLEAN NOT NULL DEFAULT true,
  allow_friend_requests BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.privacy_settings IS 'User privacy preferences';
COMMENT ON COLUMN public.privacy_settings.profile_visibility IS 'public: anyone can view, friends: friends only, private: only self';
COMMENT ON COLUMN public.privacy_settings.show_on_leaderboards IS 'If false, user hidden from global leaderboards';
COMMENT ON COLUMN public.privacy_settings.allow_friend_requests IS 'If false, user cannot receive friend requests';

CREATE TRIGGER update_privacy_settings_updated_at
  BEFORE UPDATE ON public.privacy_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View for accepted friendships (both directions)
CREATE OR REPLACE VIEW public.accepted_friends AS
SELECT
  user_id,
  friend_id,
  created_at
FROM public.friendships
WHERE status = 'accepted'
UNION
SELECT
  friend_id as user_id,
  user_id as friend_id,
  created_at
FROM public.friendships
WHERE status = 'accepted';

COMMENT ON VIEW public.accepted_friends IS 'Bidirectional view of accepted friendships';

-- View for league leaderboards
CREATE OR REPLACE VIEW public.league_leaderboards AS
SELECT
  lm.league_id,
  lm.user_id,
  p.username,
  p.display_name,
  COALESCE(us.total_picks, 0) as total_picks,
  COALESCE(us.correct_winner, 0) as correct_winner,
  COALESCE(us.accuracy_pct, 0) as accuracy_pct,
  COALESCE(us.current_streak, 0) as current_streak,
  COALESCE(us.best_streak, 0) as best_streak,
  lm.joined_at,
  lm.role
FROM public.league_memberships lm
JOIN public.profiles p ON p.user_id = lm.user_id
LEFT JOIN public.user_stats us ON us.user_id = lm.user_id
ORDER BY us.accuracy_pct DESC NULLS LAST, us.total_picks DESC NULLS LAST;

COMMENT ON VIEW public.league_leaderboards IS 'League member rankings by accuracy';

-- View for community pick percentages
CREATE OR REPLACE VIEW public.community_pick_stats AS
SELECT
  bout_id,
  COUNT(CASE WHEN picked_corner = 'red' THEN 1 END) as red_count,
  COUNT(CASE WHEN picked_corner = 'blue' THEN 1 END) as blue_count,
  COUNT(*) as total_picks,
  ROUND(
    COUNT(CASE WHEN picked_corner = 'red' THEN 1 END)::NUMERIC /
    NULLIF(COUNT(*), 0) * 100,
    1
  ) as red_percentage,
  ROUND(
    COUNT(CASE WHEN picked_corner = 'blue' THEN 1 END)::NUMERIC /
    NULLIF(COUNT(*), 0) * 100,
    1
  ) as blue_percentage
FROM public.picks
WHERE status = 'active'
GROUP BY bout_id;

COMMENT ON VIEW public.community_pick_stats IS 'Anonymous community pick percentages per bout';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Check if two users are friends
CREATE OR REPLACE FUNCTION are_friends(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
    AND (
      (user_id = user1_id AND friend_id = user2_id)
      OR (user_id = user2_id AND friend_id = user1_id)
    )
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION are_friends IS 'Check if two users have an accepted friendship';

-- Check if users are in the same league
CREATE OR REPLACE FUNCTION share_league(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.league_memberships lm1
    JOIN public.league_memberships lm2 ON lm1.league_id = lm2.league_id
    WHERE lm1.user_id = user1_id AND lm2.user_id = user2_id
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION share_league IS 'Check if two users share at least one league';

-- Get user visibility level
CREATE OR REPLACE FUNCTION get_user_visibility(target_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  visibility TEXT;
BEGIN
  SELECT profile_visibility INTO visibility
  FROM public.privacy_settings
  WHERE user_id = target_user_id;

  -- Default to public if no settings
  RETURN COALESCE(visibility, 'public');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_user_visibility IS 'Get user profile visibility setting (defaults to public)';

-- ============================================================================
-- RLS POLICIES FOR SOCIAL TABLES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;

-- FRIENDSHIPS POLICIES
-- Users can view friendships they're involved in
CREATE POLICY "Users can view own friendships"
  ON public.friendships FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can create friend requests
CREATE POLICY "Users can send friend requests"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update friendships they received (accept/decline)
CREATE POLICY "Users can respond to friend requests"
  ON public.friendships FOR UPDATE
  USING (auth.uid() = friend_id)
  WITH CHECK (auth.uid() = friend_id);

-- Users can delete friendships they're part of
CREATE POLICY "Users can remove friendships"
  ON public.friendships FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- LEAGUES POLICIES
-- Anyone can view public leagues, members can view private leagues
CREATE POLICY "Public leagues visible to all"
  ON public.leagues FOR SELECT
  USING (
    is_public = true
    OR owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.league_memberships
      WHERE league_id = leagues.id AND user_id = auth.uid()
    )
  );

-- Authenticated users can create leagues
CREATE POLICY "Authenticated users can create leagues"
  ON public.leagues FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Only owner can update league
CREATE POLICY "Owner can update league"
  ON public.leagues FOR UPDATE
  USING (auth.uid() = owner_id);

-- Only owner can delete league
CREATE POLICY "Owner can delete league"
  ON public.leagues FOR DELETE
  USING (auth.uid() = owner_id);

-- LEAGUE MEMBERSHIPS POLICIES
-- Members can see other members in their leagues
CREATE POLICY "Members can view league memberships"
  ON public.league_memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.league_memberships lm
      WHERE lm.league_id = league_memberships.league_id
      AND lm.user_id = auth.uid()
    )
  );

-- Users can join leagues (with valid invite code check at application level)
CREATE POLICY "Users can join leagues"
  ON public.league_memberships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can update memberships, users can update own
CREATE POLICY "Admins can manage memberships"
  ON public.league_memberships FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.league_memberships lm
      WHERE lm.league_id = league_memberships.league_id
      AND lm.user_id = auth.uid()
      AND lm.role = 'admin'
    )
  );

-- Users can leave, admins can remove members
CREATE POLICY "Users can leave or be removed"
  ON public.league_memberships FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.league_memberships lm
      WHERE lm.league_id = league_memberships.league_id
      AND lm.user_id = auth.uid()
      AND lm.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.leagues
      WHERE id = league_memberships.league_id
      AND owner_id = auth.uid()
    )
  );

-- PRIVACY SETTINGS POLICIES
-- Users can only view/manage their own privacy settings
CREATE POLICY "Users can view own privacy settings"
  ON public.privacy_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own privacy settings"
  ON public.privacy_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own privacy settings"
  ON public.privacy_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- UPDATED RLS POLICIES FOR PICKS (Social Visibility)
-- ============================================================================

-- Add policy for friends to view each other's picks
CREATE POLICY "Friends can view each others picks"
  ON public.picks FOR SELECT
  USING (
    are_friends(auth.uid(), user_id)
  );

-- Add policy for league members to view each other's picks
CREATE POLICY "League members can view each others picks"
  ON public.picks FOR SELECT
  USING (
    share_league(auth.uid(), user_id)
  );

-- Add policy for viewing public profiles' picks
CREATE POLICY "Public profiles picks are visible"
  ON public.picks FOR SELECT
  USING (
    get_user_visibility(user_id) = 'public'
  );
