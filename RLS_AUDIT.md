# RLS Policies Audit - Current State

**Audit Date:** 2025-12-30
**Purpose:** Document existing RLS policies before Sprint 0 hardening

---

## Summary

**Overall Security Posture:** ✅ **SECURE** for current single-user MVP

- All tables have RLS enabled
- User data is properly isolated (picks, profiles, stats)
- Public data is appropriately public (events, bouts, results)
- Service role properly gates backend operations

**Gaps for Production:**
1. ❌ Picks can be deleted (should be immutable for integrity)
2. ❌ Profiles can be deleted by users (should rely on CASCADE only)
3. ❌ No public username lookup (needed for social features in Sprint 2)
4. ⚠️ Missing explicit service role check in some policies

---

## Detailed Policy Analysis

### 1. PROFILES Table

**Current Policies:**
```sql
✅ "Users can view own profile" (SELECT)
   USING (auth.uid() = user_id)

✅ "Users can create own profile" (INSERT)
   WITH CHECK (auth.uid() = user_id)

✅ "Users can update own profile" (UPDATE)
   USING (auth.uid() = user_id)
   WITH CHECK (auth.uid() = user_id)

❌ "Users cannot delete profiles" (DELETE)
   USING (false)
   → Issue: Should never allow deletion (handled by CASCADE from auth.users)
```

**Gaps:**
- Missing public username lookup for social features
- Delete policy exists but should be removed (trust CASCADE)

**Recommendations:**
```sql
-- Add for Sprint 2 social features
CREATE POLICY "Usernames are publicly readable"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Remove DELETE policy entirely (rely on CASCADE from auth.users)
DROP POLICY "Users cannot delete profiles" ON public.profiles;
```

---

### 2. EVENTS Table

**Current Policies:**
```sql
✅ "Events are publicly readable" (SELECT)
   USING (true)

✅ "Only service role can insert events" (INSERT)
   WITH CHECK (false)  -- Bypassed by service_role key

✅ "Only service role can update events" (UPDATE)
   USING (false)

✅ "Only service role can delete events" (DELETE)
   USING (false)
```

**Status:** ✅ **Perfect** - No changes needed

**Notes:**
- Public read is correct (everyone needs to see upcoming events)
- Service role bypass works correctly for sync-events Edge Function
- Delete protection appropriate (events should rarely be deleted)

---

### 3. BOUTS Table

**Current Policies:**
```sql
✅ "Bouts are publicly readable" (SELECT)
   USING (true)

✅ "Only service role can insert bouts" (INSERT)
   WITH CHECK (false)

✅ "Only service role can update bouts" (UPDATE)
   USING (false)

✅ "Only service role can delete bouts" (DELETE)
   USING (false)
```

**Status:** ✅ **Perfect** - No changes needed

**Notes:**
- Public read is correct (fight cards are public data)
- Service role gating prevents user tampering
- Handles fight card changes via sync-next-event-card Edge Function

---

### 4. RESULTS Table

**Current Policies:**
```sql
✅ "Results are publicly readable" (SELECT)
   USING (true)

✅ "Only service role can insert results" (INSERT)
   WITH CHECK (false)

✅ "Only service role can update results" (UPDATE)
   USING (false)

✅ "Only service role can delete results" (DELETE)
   USING (false)
```

**Status:** ✅ **Perfect** - No changes needed

**Notes:**
- Public read is correct (fight results are public)
- Service role gating ensures only grading function writes results
- One-to-one with bouts (PRIMARY KEY on bout_id)

---

### 5. PICKS Table

**Current Policies:**
```sql
✅ "Users can view own picks" (SELECT)
   USING (auth.uid() = user_id)
   → Will need to expand for social features in Sprint 2

✅ "Users can create own picks" (INSERT)
   WITH CHECK (auth.uid() = user_id)

✅ "Users can update own picks" (UPDATE)
   USING (auth.uid() = user_id)
   WITH CHECK (auth.uid() = user_id)
   → Lock enforcement handled by validate_pick_not_locked() trigger

❌ "Users can delete own picks" (DELETE)
   USING (auth.uid() = user_id)
   → Issue: Picks should be IMMUTABLE for leaderboard integrity

⚠️ "Service role can update picks for grading" (UPDATE)
   USING (false)
   → Works but relies on service_role bypass; consider explicit policy
```

**Critical Issue - Picks Can Be Deleted:**

**Problem:**
- Users can delete their own picks even after grading
- This would corrupt leaderboards and user_stats
- No audit trail of deleted picks

**Impact:**
- User makes bad pick → deletes it → improves accuracy artificially
- Breaks trust in competitive features
- user_stats become unreliable

**Fix Required:**
```sql
DROP POLICY "Users can delete own picks" ON public.picks;

CREATE POLICY "Picks are immutable after creation" ON public.picks
FOR DELETE
USING (false);  -- No one can delete picks, ever
```

**Recommendations for Sprint 2:**
```sql
-- Expand SELECT for social features (always-visible picks)
DROP POLICY "Users can view own picks" ON public.picks;

CREATE POLICY "Users can view all picks" ON public.picks
FOR SELECT
USING (
  -- Own picks
  auth.uid() = user_id
  OR
  -- Friend picks (if profile is public/friends-only)
  EXISTS (
    SELECT 1 FROM friendships f
    WHERE f.user_id = auth.uid() AND f.friend_id = picks.user_id AND f.status = 'accepted'
  )
  OR
  -- League picks
  EXISTS (
    SELECT 1 FROM league_memberships lm1
    JOIN league_memberships lm2 ON lm1.league_id = lm2.league_id
    WHERE lm1.user_id = auth.uid() AND lm2.user_id = picks.user_id
  )
  OR
  -- Public profiles
  EXISTS (
    SELECT 1 FROM privacy_settings ps
    WHERE ps.user_id = picks.user_id AND ps.picks_visibility = 'public'
  )
);
```

---

### 6. USER_STATS Table

**Current Policies:**
```sql
✅ "Users can view own stats" (SELECT)
   USING (auth.uid() = user_id)

✅ "Only service role can insert stats" (INSERT)
   WITH CHECK (false)

✅ "Only service role can update stats" (UPDATE)
   USING (false)

✅ "Only service role can delete stats" (DELETE)
   USING (false)
```

**Status:** ✅ **Good** - Minor enhancement needed

**Recommendations for Sprint 2:**
```sql
-- Allow public leaderboard reads
CREATE POLICY "Stats are publicly readable for leaderboards"
  ON public.user_stats
  FOR SELECT
  USING (true);

-- Or friend-based:
CREATE POLICY "Users can view friend stats"
  ON public.user_stats
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.user_id = auth.uid() AND f.friend_id = user_stats.user_id AND f.status = 'accepted'
    )
  );
```

---

## Security Mechanisms Summary

### ✅ What's Working Well

1. **User Isolation:**
   - Picks properly isolated to owner
   - Profiles properly isolated to owner
   - Stats properly isolated to owner

2. **Service Role Protection:**
   - Events can only be synced by backend
   - Bouts can only be modified by backend
   - Results can only be written by backend
   - Stats can only be updated by backend

3. **Public Data Access:**
   - Anyone can read events (correct - upcoming fights are public)
   - Anyone can read bouts (correct - fight cards are public)
   - Anyone can read results (correct - outcomes are public)

4. **Trigger-Based Lock Enforcement:**
   - `validate_pick_not_locked()` trigger prevents changes after event.event_date
   - Works independently of RLS (defense in depth)
   - Raises clear exception message: "Picks are locked. Event has already started."

### ❌ What Needs Hardening

1. **Picks Mutability:**
   - Users can delete picks (breaks integrity)
   - Should be immutable after creation

2. **Profile Deletion:**
   - Explicit DELETE policy unnecessary
   - Should rely on CASCADE from auth.users deletion

3. **Username Lookup:**
   - No public read access to usernames
   - Needed for friend search, @ mentions, etc.

4. **Social Access:**
   - No friend-based or league-based pick visibility
   - Will be needed in Sprint 2

---

## Grant Permissions Analysis

**Current Grants:**
```sql
✅ GRANT USAGE ON SCHEMA public TO anon, authenticated;
✅ GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
✅ GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
✅ GRANT INSERT, UPDATE, DELETE ON public.picks TO authenticated;
✅ GRANT SELECT ON public.events, public.bouts, public.results TO anon;
✅ GRANT SELECT ON public.user_stats TO authenticated;
```

**Status:** ✅ **Correct**

**Notes:**
- Anon role can read public data (events/bouts/results) - needed for unauthenticated browsing
- Authenticated role has appropriate CRUD on user-owned tables
- RLS policies further restrict within these grants

---

## Sprint 0 Hardening Migration

**File:** `supabase/migrations/20250101000002_harden_rls_policies.sql`

### Changes Required:

1. **Make picks immutable (delete protection)**
2. **Remove profile delete policy (rely on CASCADE)**
3. **Add public username lookup (prep for Sprint 2)**
4. **Add explicit comments documenting service_role bypass**

### Migration:

```sql
-- ============================================================================
-- Sprint 0: RLS Policy Hardening
-- ============================================================================

-- 1. PICKS: Make immutable (prevent deletions)
DROP POLICY IF EXISTS "Users can delete own picks" ON public.picks;

CREATE POLICY "Picks are immutable after creation" ON public.picks
FOR DELETE
USING (false);

COMMENT ON POLICY "Picks are immutable after creation" ON public.picks IS
'Picks cannot be deleted to maintain leaderboard integrity and audit trail';

-- 2. PROFILES: Remove unnecessary delete policy (CASCADE handles this)
DROP POLICY IF EXISTS "Users cannot delete profiles" ON public.profiles;

-- 3. PROFILES: Add public username lookup (needed for social features)
CREATE POLICY "Usernames are publicly readable" ON public.profiles
FOR SELECT
USING (true);

COMMENT ON POLICY "Usernames are publicly readable" ON public.profiles IS
'Public username lookup enables friend search and social features. Privacy controlled by privacy_settings table (Sprint 2)';

-- 4. Add documentation comments
COMMENT ON POLICY "Only service role can insert events" ON public.events IS
'Bypassed by service_role key used in sync-events Edge Function';

COMMENT ON POLICY "Only service role can insert results" ON public.results IS
'Bypassed by service_role key used in sync-recent-results-and-grade Edge Function';

COMMENT ON POLICY "Service role can update picks for grading" ON public.picks IS
'Bypassed by service_role key used in sync-recent-results-and-grade Edge Function for automated grading';
```

### Validation:

```sql
-- Verify all policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  CASE
    WHEN qual IS NOT NULL THEN 'USING: ' || qual
    ELSE ''
  END as using_clause,
  CASE
    WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || with_check
    ELSE ''
  END as check_clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;
```

---

## Testing Checklist

After applying hardening migration, test with 3 users:

### Picks Immutability
- [ ] User A creates pick for Event 1, Bout 1
- [ ] User A tries to delete pick → Should fail with policy violation
- [ ] Admin tries to delete pick from database → Should fail
- [ ] Verify pick still exists after attempted deletions

### Username Lookup
- [ ] User A can read User B's username
- [ ] Anon can read any username (for future public leaderboards)
- [ ] User A cannot update User B's username (existing policy prevents this)

### Existing Functionality Preserved
- [ ] User A can create picks for upcoming events → Success
- [ ] User A can update own picks before event starts → Success
- [ ] User A cannot update picks after event starts → Trigger blocks
- [ ] User A can only see own picks (Sprint 0) → Success
- [ ] User A can see events, bouts, results → Success
- [ ] sync-recent-results-and-grade can update picks.status and picks.score → Success

### Service Role Bypass
- [ ] Edge Functions can insert events (service_role key)
- [ ] Edge Functions can insert bouts (service_role key)
- [ ] Edge Functions can update picks for grading (service_role key)
- [ ] Edge Functions can insert/update user_stats (service_role key)

---

## Future Enhancements (Sprint 2)

### Social Features RLS Changes

**When implementing Sprint 2:**

1. **Picks visibility expansion** - Allow friend/league-based reads
2. **Privacy settings** - Add new table and integrate with picks policy
3. **Leaderboard access** - Make user_stats readable based on privacy settings
4. **Community percentages** - Aggregate pick data (no user isolation needed)

**Schema additions in Sprint 2:**
```sql
CREATE TABLE friendships (...);
CREATE TABLE leagues (...);
CREATE TABLE league_memberships (...);
CREATE TABLE privacy_settings (...);
```

**RLS policies to add in Sprint 2:**
- friendships: users can CRUD own relationships
- leagues: members can read, creator can update
- league_memberships: members can read, admins can manage
- privacy_settings: users can CRUD own settings

---

## References

- **Initial Schema:** `/home/user/Upset/supabase/migrations/20250101000000_initial_schema.sql`
- **Current Policies:** `/home/user/Upset/supabase/migrations/20250101000001_rls_policies.sql`
- **Sprint 0 Plan:** `/home/user/Upset/SPRINT_0_PLAN.md`
- **Social Features Plan:** `/home/user/Upset/SOCIAL_FEATURES_PLAN.md` (note: time-based visibility rejected by user)

---

## Conclusion

**Current RLS Status:** ✅ Secure for single-user MVP

**Required for Production:** 3 changes (picks immutability, username lookup, policy cleanup)

**Timeline:** Apply hardening migration before Sprint 1 (auth redesign)

**Risk Level:** Low - Changes are additive/protective, no breaking changes
