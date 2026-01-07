-- ============================================================================
-- Allow Pick Deletions for Unselect Feature
-- ============================================================================
-- Purpose: Re-enable pick deletions so users can unselect fighters before
-- an event locks. The previous "immutable" policy was too restrictive
-- for the UX we want.
--
-- Context: The picks lock trigger already prevents modifications after
-- event start. We don't need RLS to block deletions too.
-- ============================================================================

-- Drop the immutable policy that blocks all deletions
DROP POLICY IF EXISTS "Picks are immutable after creation" ON public.picks;

-- Restore the original policy allowing users to delete their own picks
-- Lock enforcement is handled by the existing trigger, not RLS
CREATE POLICY "Users can delete own picks" ON public.picks
FOR DELETE
USING (auth.uid() = user_id);

COMMENT ON POLICY "Users can delete own picks" ON public.picks IS
'Users can delete their own picks before event locks. Pick lock enforcement is handled by trigger, not RLS.';
