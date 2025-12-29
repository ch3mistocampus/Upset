-- UFC Picks Tracker - Row Level Security Policies
-- Principle: Events/bouts/results are public read; only service-role can write
-- Picks/profiles are user-owned

-- ============================================================================
-- ENABLE RLS
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own profile (one-time, after sign up)
CREATE POLICY "Users can create own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users cannot delete profiles (handled by CASCADE from auth.users)
CREATE POLICY "Users cannot delete profiles"
  ON public.profiles
  FOR DELETE
  USING (false);

-- ============================================================================
-- EVENTS POLICIES
-- ============================================================================

-- Everyone can read events (public data)
CREATE POLICY "Events are publicly readable"
  ON public.events
  FOR SELECT
  USING (true);

-- Only service role can insert events (via Edge Functions)
CREATE POLICY "Only service role can insert events"
  ON public.events
  FOR INSERT
  WITH CHECK (false); -- Will be bypassed by service_role key

-- Only service role can update events
CREATE POLICY "Only service role can update events"
  ON public.events
  FOR UPDATE
  USING (false);

-- Only service role can delete events
CREATE POLICY "Only service role can delete events"
  ON public.events
  FOR DELETE
  USING (false);

-- ============================================================================
-- BOUTS POLICIES
-- ============================================================================

-- Everyone can read bouts (public data)
CREATE POLICY "Bouts are publicly readable"
  ON public.bouts
  FOR SELECT
  USING (true);

-- Only service role can insert bouts
CREATE POLICY "Only service role can insert bouts"
  ON public.bouts
  FOR INSERT
  WITH CHECK (false);

-- Only service role can update bouts
CREATE POLICY "Only service role can update bouts"
  ON public.bouts
  FOR UPDATE
  USING (false);

-- Only service role can delete bouts
CREATE POLICY "Only service role can delete bouts"
  ON public.bouts
  FOR DELETE
  USING (false);

-- ============================================================================
-- RESULTS POLICIES
-- ============================================================================

-- Everyone can read results (public data)
CREATE POLICY "Results are publicly readable"
  ON public.results
  FOR SELECT
  USING (true);

-- Only service role can insert results
CREATE POLICY "Only service role can insert results"
  ON public.results
  FOR INSERT
  WITH CHECK (false);

-- Only service role can update results
CREATE POLICY "Only service role can update results"
  ON public.results
  FOR UPDATE
  USING (false);

-- Only service role can delete results
CREATE POLICY "Only service role can delete results"
  ON public.results
  FOR DELETE
  USING (false);

-- ============================================================================
-- PICKS POLICIES
-- ============================================================================

-- Users can read their own picks
CREATE POLICY "Users can view own picks"
  ON public.picks
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own picks
-- (Lock enforcement handled by trigger, not RLS)
CREATE POLICY "Users can create own picks"
  ON public.picks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own picks (if not locked)
-- (Lock enforcement handled by trigger, not RLS)
CREATE POLICY "Users can update own picks"
  ON public.picks
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own picks (if not locked)
-- (Lock enforcement handled by trigger, not RLS)
CREATE POLICY "Users can delete own picks"
  ON public.picks
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can update picks for grading
CREATE POLICY "Service role can update picks for grading"
  ON public.picks
  FOR UPDATE
  USING (false); -- Bypassed by service_role

-- ============================================================================
-- USER_STATS POLICIES
-- ============================================================================

-- Users can read their own stats
CREATE POLICY "Users can view own stats"
  ON public.user_stats
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert stats
CREATE POLICY "Only service role can insert stats"
  ON public.user_stats
  FOR INSERT
  WITH CHECK (false);

-- Only service role can update stats
CREATE POLICY "Only service role can update stats"
  ON public.user_stats
  FOR UPDATE
  USING (false);

-- Only service role can delete stats
CREATE POLICY "Only service role can delete stats"
  ON public.user_stats
  FOR DELETE
  USING (false);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant select on all tables to authenticated users (RLS will filter)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant insert/update/delete on user-owned tables
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.picks TO authenticated;

-- Public read-only access to events/bouts/results
GRANT SELECT ON public.events, public.bouts, public.results TO anon;

-- Grant select on user_stats to authenticated
GRANT SELECT ON public.user_stats TO authenticated;
