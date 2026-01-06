-- Fix get_new_activity_count - remove reference to non-existent is_public column

DROP FUNCTION IF EXISTS get_new_activity_count(TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION get_new_activity_count(since_timestamp TIMESTAMPTZ)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cur_user_id UUID;
  new_count INTEGER;
BEGIN
  cur_user_id := auth.uid();

  SELECT COUNT(*)::INTEGER INTO new_count
  FROM public.activities a
  JOIN public.profiles p ON p.user_id = a.user_id
  WHERE a.created_at > since_timestamp
    -- Exclude blocked users
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = cur_user_id AND b.blocked_id = a.user_id)
         OR (b.blocked_id = cur_user_id AND b.blocker_id = a.user_id)
    )
    -- Exclude muted users
    AND NOT EXISTS (
      SELECT 1 FROM public.mutes m
      WHERE m.user_id = cur_user_id AND m.muted_user_id = a.user_id
    );

  RETURN new_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_new_activity_count(TIMESTAMPTZ) TO authenticated;
