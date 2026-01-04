-- Update friendships RLS policy for follow model
--
-- The original policy required status='pending' for INSERT, but the follow
-- model allows users to directly follow others (status='accepted' on insert).
-- This migration updates the INSERT policy to allow both statuses.

-- Drop the old INSERT policy
DROP POLICY IF EXISTS "Users can send friend requests" ON public.friendships;

-- Create updated INSERT policy that allows direct follows
CREATE POLICY "Users can follow or send friend requests" ON public.friendships
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND status IN ('pending', 'accepted')
  );

-- Add comment explaining the change
COMMENT ON POLICY "Users can follow or send friend requests" ON public.friendships
  IS 'Allows users to follow others directly (accepted) or send friend requests (pending)';
