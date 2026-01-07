-- Fix get_friends_leaderboard: ambiguous column reference after UNION ALL
-- Wrapping the UNION in a CTE and using explicit column references

CREATE OR REPLACE FUNCTION get_friends_leaderboard()
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  total_picks INTEGER,
  correct_picks INTEGER,
  accuracy NUMERIC,
  rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH combined_users AS (
    -- Friends
    SELECT
      us.user_id,
      p.username,
      us.total_picks,
      us.correct_winner AS correct_picks,
      CASE
        WHEN us.total_picks = 0 THEN 0
        ELSE ROUND((us.correct_winner::NUMERIC / us.total_picks::NUMERIC) * 100, 1)
      END AS accuracy
    FROM public.user_stats us
    JOIN public.profiles p ON p.user_id = us.user_id
    JOIN (
      SELECT
        CASE
          WHEN f.user_id = auth.uid() THEN f.friend_id
          ELSE f.user_id
        END AS friend_user_id
      FROM public.friendships f
      WHERE
        (f.user_id = auth.uid() OR f.friend_id = auth.uid())
        AND f.status = 'accepted'
    ) fi ON fi.friend_user_id = us.user_id
    WHERE us.total_picks > 0

    UNION ALL

    -- Current user (always include themselves in friends leaderboard)
    SELECT
      us.user_id,
      p.username,
      us.total_picks,
      us.correct_winner AS correct_picks,
      CASE
        WHEN us.total_picks = 0 THEN 0
        ELSE ROUND((us.correct_winner::NUMERIC / us.total_picks::NUMERIC) * 100, 1)
      END AS accuracy
    FROM public.user_stats us
    JOIN public.profiles p ON p.user_id = us.user_id
    WHERE us.user_id = auth.uid()
  )
  SELECT
    cu.user_id,
    cu.username,
    cu.total_picks,
    cu.correct_picks,
    cu.accuracy,
    ROW_NUMBER() OVER (
      ORDER BY
        CASE WHEN cu.total_picks = 0 THEN 0 ELSE cu.correct_picks::NUMERIC / cu.total_picks::NUMERIC END DESC,
        cu.total_picks DESC
    ) AS rank
  FROM combined_users cu
  ORDER BY
    CASE WHEN cu.total_picks = 0 THEN 0 ELSE cu.correct_picks::NUMERIC / cu.total_picks::NUMERIC END DESC,
    cu.total_picks DESC;
END;
$$;
