-- ============================================================================
-- Add RPC function to get email by username
-- ============================================================================
-- Purpose: Enable username + password login
-- This function allows the mobile app to look up a user's email
-- by their username, which is then used for password authentication.
-- ============================================================================

/**
 * Get email address for a username
 * Used for username + password sign-in flow
 *
 * Security: This is safe because usernames are already publicly readable
 * (needed for friend search, @mentions, etc.)
 */
CREATE OR REPLACE FUNCTION get_email_by_username(username_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Look up the user_id for this username
  SELECT au.email INTO user_email
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.user_id
  WHERE p.username = username_input
  LIMIT 1;

  RETURN user_email;
END;
$$;

COMMENT ON FUNCTION get_email_by_username IS 'Get email address for a username to enable username+password sign-in';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_email_by_username(TEXT) TO authenticated, anon;
