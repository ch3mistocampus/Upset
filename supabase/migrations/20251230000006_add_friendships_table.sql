-- Add Friendships Table
-- Sprint 2: Social Features (No Leagues)
--
-- This migration creates the friendships table to manage friend relationships
-- between users.
--
-- Features:
-- - Bidirectional friendship tracking (user_id sends request to friend_id)
-- - Status tracking: pending, accepted, declined
-- - Timestamps for request and response
-- - Prevents duplicate friendships
-- - Prevents self-friending

-- Create friendships table
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Prevent duplicate friendships (either direction)
  CONSTRAINT unique_friendship UNIQUE (user_id, friend_id),

  -- Prevent self-friending
  CONSTRAINT no_self_friendship CHECK (user_id != friend_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON public.friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.friendships(status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_friendships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION update_friendships_updated_at();

-- RLS Policies for friendships
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Users can view friendships they're part of
CREATE POLICY "Users can view their own friendships" ON public.friendships
  FOR SELECT
  USING (
    auth.uid() = user_id OR auth.uid() = friend_id
  );

-- Users can send friend requests (INSERT with status = 'pending')
CREATE POLICY "Users can send friend requests" ON public.friendships
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
  );

-- Users can accept or decline friend requests sent to them
CREATE POLICY "Users can respond to friend requests" ON public.friendships
  FOR UPDATE
  USING (
    auth.uid() = friend_id
    AND status = 'pending'
  )
  WITH CHECK (
    status IN ('accepted', 'declined')
  );

-- Users can delete friendships they're part of (unfriend)
CREATE POLICY "Users can delete their own friendships" ON public.friendships
  FOR DELETE
  USING (
    auth.uid() = user_id OR auth.uid() = friend_id
  );

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT USAGE ON SEQUENCE friendships_id_seq TO authenticated;

-- Comments
COMMENT ON TABLE public.friendships IS 'Manages friend relationships between users';
COMMENT ON COLUMN public.friendships.user_id IS 'User who initiated the friend request';
COMMENT ON COLUMN public.friendships.friend_id IS 'User who received the friend request';
COMMENT ON COLUMN public.friendships.status IS 'Status of friendship: pending, accepted, or declined';
COMMENT ON COLUMN public.friendships.created_at IS 'When the friend request was sent';
COMMENT ON COLUMN public.friendships.updated_at IS 'When the friendship status was last updated';
