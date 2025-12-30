# Sprint 2: Social Features - Implementation Plan (No Leagues)

**Status:** 🚧 In Progress
**Branch:** `claude/evaluate-and-plan-VvCw4`
**Goal:** Add social features with always-visible picks (friendships, leaderboards, community %)

---

## Overview

Sprint 2 implements social features allowing users to connect with friends, view each other's picks, compete on leaderboards, and see community pick trends. **Leagues are excluded** from this sprint per user request.

**Core Principle:** **Picks are ALWAYS visible** to friends (no time-based locking).

---

## Requirements

### User Stories

**As a user:**
- I can add friends by searching for their username
- I can accept or decline friend requests
- I can view my friends' picks at ANY time (not locked until event start)
- I can see what % of the community picked each fighter
- I can see leaderboards (global + friends only)
- I can control my privacy settings (public/friends-only/private)

**As a competitive user:**
- I can see how I rank against all users (global leaderboard)
- I can see how I rank against my friends (friends leaderboard)
- I can see accuracy %, total picks, current streak

**As a privacy-conscious user:**
- I can set my profile to private (friends only)
- I can opt-out of the global leaderboard
- I can control who sees my picks

---

## Database Schema

### New Tables (2 total)

#### 1. Friendships Table

```sql
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_friendship UNIQUE(user_id, friend_id),
  CONSTRAINT no_self_friend CHECK (user_id != friend_id)
);

CREATE INDEX idx_friendships_user ON friendships(user_id, status);
CREATE INDEX idx_friendships_friend ON friendships(friend_id, status);
CREATE INDEX idx_friendships_pending ON friendships(friend_id, status) WHERE status = 'pending';
```

**Fields:**
- `user_id` - User who sent the friend request
- `friend_id` - User who received the friend request
- `status` - pending, accepted, declined, blocked
- Friendship is bi-directional when accepted

**Friendship Flow:**
```
Alice sends request to Bob:
  INSERT INTO friendships (user_id, friend_id, status)
  VALUES (alice_id, bob_id, 'pending')

Bob accepts:
  UPDATE friendships SET status = 'accepted' WHERE id = request_id

Now both can see each other's picks:
  - Alice can see Bob's picks
  - Bob can see Alice's picks
```

---

#### 2. Privacy Settings Table

```sql
CREATE TABLE privacy_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_visibility TEXT NOT NULL DEFAULT 'public' CHECK (profile_visibility IN ('public', 'friends', 'private')),
  picks_visibility TEXT NOT NULL DEFAULT 'friends' CHECK (picks_visibility IN ('public', 'friends', 'private')),
  show_on_leaderboard BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE privacy_settings IS 'User privacy preferences for profile and picks visibility';
COMMENT ON COLUMN privacy_settings.profile_visibility IS 'Who can view profile: public, friends, private';
COMMENT ON COLUMN privacy_settings.picks_visibility IS 'Who can view picks: public (always visible), friends (friends only), private (only me)';
COMMENT ON COLUMN privacy_settings.show_on_leaderboard IS 'Opt-in/out of global leaderboard';
```

**Defaults:**
- `profile_visibility: 'public'` - Anyone can see username, stats
- `picks_visibility: 'friends'` - Only friends can see picks
- `show_on_leaderboard: true` - Appears on global leaderboard

**Privacy Levels:**
| Setting | Public | Friends | Private |
|---------|--------|---------|---------|
| Profile | Anyone can view | Friends can view | Only me |
| Picks | Anyone can view | Friends can view | Only me |
| Leaderboard | Shows on global | Shows on friends | Hidden |

---

### NO New Tables

**Leagues excluded:**
- ❌ No `leagues` table
- ❌ No `league_memberships` table
- ❌ No league-related RLS policies
- ❌ No league invite codes
- ❌ No league leaderboards

---

## RLS Policy Changes

### Critical: Update Picks RLS for Always-Visible Picks

**Current Policy (Sprint 0/1):**
```sql
-- Users can ONLY view their own picks
CREATE POLICY "Users can view own picks" ON picks
FOR SELECT
USING (auth.uid() = user_id);
```

**New Policy (Sprint 2):**
```sql
-- Users can view picks based on friendships and privacy settings
DROP POLICY "Users can view own picks" ON picks;

CREATE POLICY "Users can view picks based on privacy" ON picks
FOR SELECT
USING (
  -- Own picks (always visible)
  auth.uid() = user_id
  OR
  -- Public picks (if picks_visibility = 'public')
  EXISTS (
    SELECT 1 FROM privacy_settings ps
    WHERE ps.user_id = picks.user_id
    AND ps.picks_visibility = 'public'
  )
  OR
  -- Friends' picks (if picks_visibility = 'friends' and friendship accepted)
  (
    EXISTS (
      SELECT 1 FROM privacy_settings ps
      WHERE ps.user_id = picks.user_id
      AND ps.picks_visibility IN ('public', 'friends')
    )
    AND
    EXISTS (
      SELECT 1 FROM friendships f
      WHERE (
        (f.user_id = auth.uid() AND f.friend_id = picks.user_id)
        OR
        (f.friend_id = auth.uid() AND f.user_id = picks.user_id)
      )
      AND f.status = 'accepted'
    )
  )
);
```

**Key Points:**
- ✅ Always visible to friends (when accepted)
- ✅ Respects privacy settings
- ✅ No time-based locking (picks visible before/during/after event)
- ✅ Efficient with indexed lookups

---

### Friendships RLS Policies

```sql
-- Users can view friendships they're part of
CREATE POLICY "Users can view own friendships" ON friendships
FOR SELECT
USING (
  auth.uid() = user_id OR auth.uid() = friend_id
);

-- Users can send friend requests
CREATE POLICY "Users can create friend requests" ON friendships
FOR INSERT
WITH CHECK (
  auth.uid() = user_id  -- Only the requester can create
  AND user_id != friend_id  -- No self-friending
);

-- Users can accept/decline requests sent to them
CREATE POLICY "Users can update received requests" ON friendships
FOR UPDATE
USING (
  auth.uid() = friend_id  -- Only the recipient can update
)
WITH CHECK (
  auth.uid() = friend_id
  AND status IN ('accepted', 'declined')
);

-- Users can delete friendships they're part of
CREATE POLICY "Users can delete own friendships" ON friendships
FOR DELETE
USING (
  auth.uid() = user_id OR auth.uid() = friend_id
);
```

---

### Privacy Settings RLS Policies

```sql
-- Users can view own privacy settings
CREATE POLICY "Users can view own privacy settings" ON privacy_settings
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create own privacy settings
CREATE POLICY "Users can create own privacy settings" ON privacy_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update own privacy settings
CREATE POLICY "Users can update own privacy settings" ON privacy_settings
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- No deletion (settings persist)
```

---

### User Stats RLS Update

**Current:** Users can only see own stats
**New:** Make stats visible based on profile privacy

```sql
DROP POLICY "Users can view own stats" ON user_stats;

CREATE POLICY "Users can view stats based on privacy" ON user_stats
FOR SELECT
USING (
  -- Own stats (always visible)
  auth.uid() = user_id
  OR
  -- Public stats
  EXISTS (
    SELECT 1 FROM privacy_settings ps
    WHERE ps.user_id = user_stats.user_id
    AND ps.profile_visibility = 'public'
  )
  OR
  -- Friends' stats (if profile_visibility allows)
  (
    EXISTS (
      SELECT 1 FROM privacy_settings ps
      WHERE ps.user_id = user_stats.user_id
      AND ps.profile_visibility IN ('public', 'friends')
    )
    AND
    EXISTS (
      SELECT 1 FROM friendships f
      WHERE (
        (f.user_id = auth.uid() AND f.friend_id = user_stats.user_id)
        OR
        (f.friend_id = auth.uid() AND f.user_id = user_stats.user_id)
      )
      AND f.status = 'accepted'
    )
  )
);
```

---

## New Queries & Functions

### 1. Get Friends List

```sql
CREATE OR REPLACE FUNCTION get_friends(target_user_id UUID)
RETURNS TABLE (
  friend_user_id UUID,
  username TEXT,
  accuracy_pct NUMERIC,
  total_picks INT,
  current_streak INT,
  friendship_since TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN f.user_id = target_user_id THEN f.friend_id
      ELSE f.user_id
    END as friend_user_id,
    p.username,
    us.accuracy_pct,
    us.total_picks,
    us.current_streak,
    f.created_at as friendship_since
  FROM friendships f
  JOIN profiles p ON (
    CASE
      WHEN f.user_id = target_user_id THEN f.friend_id
      ELSE f.user_id
    END = p.user_id
  )
  LEFT JOIN user_stats us ON us.user_id = p.user_id
  WHERE (f.user_id = target_user_id OR f.friend_id = target_user_id)
  AND f.status = 'accepted'
  ORDER BY us.accuracy_pct DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 2. Get Friend Requests (Pending)

```sql
CREATE OR REPLACE FUNCTION get_friend_requests(target_user_id UUID)
RETURNS TABLE (
  request_id UUID,
  from_user_id UUID,
  from_username TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id as request_id,
    f.user_id as from_user_id,
    p.username as from_username,
    f.created_at
  FROM friendships f
  JOIN profiles p ON p.user_id = f.user_id
  WHERE f.friend_id = target_user_id
  AND f.status = 'pending'
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 3. Get Community Pick Percentages

```sql
CREATE OR REPLACE FUNCTION get_community_pick_percentages(target_event_id UUID)
RETURNS TABLE (
  bout_id UUID,
  red_name TEXT,
  blue_name TEXT,
  total_picks BIGINT,
  red_picks BIGINT,
  blue_picks BIGINT,
  red_percentage NUMERIC,
  blue_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id as bout_id,
    b.red_name,
    b.blue_name,
    COUNT(p.id) as total_picks,
    COUNT(p.id) FILTER (WHERE p.picked_corner = 'red') as red_picks,
    COUNT(p.id) FILTER (WHERE p.picked_corner = 'blue') as blue_picks,
    ROUND(
      (COUNT(p.id) FILTER (WHERE p.picked_corner = 'red')::NUMERIC /
       NULLIF(COUNT(p.id), 0) * 100), 1
    ) as red_percentage,
    ROUND(
      (COUNT(p.id) FILTER (WHERE p.picked_corner = 'blue')::NUMERIC /
       NULLIF(COUNT(p.id), 0) * 100), 1
    ) as blue_percentage
  FROM bouts b
  LEFT JOIN picks p ON p.bout_id = b.id
  WHERE b.event_id = target_event_id
  GROUP BY b.id, b.red_name, b.blue_name, b.order_index
  ORDER BY b.order_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 4. Get Global Leaderboard

```sql
CREATE OR REPLACE FUNCTION get_global_leaderboard(limit_count INT DEFAULT 50)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  username TEXT,
  accuracy_pct NUMERIC,
  total_picks INT,
  correct_picks INT,
  current_streak INT,
  best_streak INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY us.accuracy_pct DESC, us.total_picks DESC) as rank,
    us.user_id,
    p.username,
    us.accuracy_pct,
    us.total_picks,
    us.correct_winner as correct_picks,
    us.current_streak,
    us.best_streak
  FROM user_stats us
  JOIN profiles p ON p.user_id = us.user_id
  LEFT JOIN privacy_settings ps ON ps.user_id = us.user_id
  WHERE us.total_picks > 0
  AND (ps.show_on_leaderboard IS NULL OR ps.show_on_leaderboard = true)
  ORDER BY us.accuracy_pct DESC, us.total_picks DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 5. Get Friends Leaderboard

```sql
CREATE OR REPLACE FUNCTION get_friends_leaderboard(target_user_id UUID)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  username TEXT,
  accuracy_pct NUMERIC,
  total_picks INT,
  correct_picks INT,
  current_streak INT,
  is_me BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH friend_ids AS (
    SELECT DISTINCT
      CASE
        WHEN f.user_id = target_user_id THEN f.friend_id
        ELSE f.user_id
      END as friend_user_id
    FROM friendships f
    WHERE (f.user_id = target_user_id OR f.friend_id = target_user_id)
    AND f.status = 'accepted'

    UNION

    SELECT target_user_id  -- Include self
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY us.accuracy_pct DESC, us.total_picks DESC) as rank,
    us.user_id,
    p.username,
    us.accuracy_pct,
    us.total_picks,
    us.correct_winner as correct_picks,
    us.current_streak,
    (us.user_id = target_user_id) as is_me
  FROM user_stats us
  JOIN profiles p ON p.user_id = us.user_id
  WHERE us.user_id IN (SELECT friend_user_id FROM friend_ids)
  AND us.total_picks > 0
  ORDER BY us.accuracy_pct DESC, us.total_picks DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## UI Implementation

### New Screens (5 total)

#### 1. Friends List Screen
**Route:** `mobile/app/(tabs)/friends.tsx`

**Features:**
- Tab navigation: Friends | Requests
- Friends tab:
  - List of accepted friends
  - Shows username, accuracy %, current streak
  - Tap to view friend's picks
  - Swipe to unfriend (confirm dialog)
- Requests tab:
  - List of pending requests
  - Accept / Decline buttons
  - Shows username of requester
- Floating "Add Friend" button

---

#### 2. Add Friend Screen
**Route:** `mobile/app/friends/add.tsx`

**Features:**
- Search input (username)
- Search results list
- Shows username, accuracy %
- "Add Friend" button (or "Request Pending" if already sent)
- "Already Friends" indicator
- Empty state: "Search for friends by username"

---

#### 3. Friend Profile Screen
**Route:** `mobile/app/friends/[id].tsx`

**Features:**
- Friend's username and stats
- Tab navigation: Picks | Stats
- Picks tab:
  - List of all their picks (always visible!)
  - Grouped by event
  - Shows picked corner, outcome (if graded)
- Stats tab:
  - Accuracy %
  - Total picks / Correct picks
  - Current streak / Best streak
  - Recent activity
- Unfriend button (confirm dialog)

---

#### 4. Leaderboards Screen
**Route:** `mobile/app/(tabs)/leaderboards.tsx`

**Features:**
- Tab navigation: Global | Friends
- Global tab:
  - Top 50 users by accuracy
  - Shows rank, username, accuracy %, total picks
  - Highlights current user (if on leaderboard)
  - "Your Rank: #123" sticky header
- Friends tab:
  - All friends + self ranked by accuracy
  - Shows rank, username, accuracy %, streak
  - Highlights current user
- Pull to refresh

---

#### 5. Privacy Settings Screen
**Route:** `mobile/app/settings/privacy.tsx`

**Features:**
- Profile Visibility dropdown (Public / Friends / Private)
- Picks Visibility dropdown (Public / Friends / Private)
- Show on Global Leaderboard toggle
- Explanation text for each setting
- Save button (or auto-save on change)
- "Who can see what" info section

---

### Updated Screens (1 total)

#### Pick Screen Enhancement
**File:** `mobile/app/(tabs)/pick.tsx`

**Add Community Percentages:**
```
┌─────────────────────────────────┐
│  Fighter A  [57%] vs [43%]  Fighter B  │
│  (Red)                      (Blue)  │
│                                 │
│  🔴 Pick Fighter A              │
│  ○ Pick Fighter B               │
└─────────────────────────────────┘
```

**Features:**
- Show % of community picks for each fighter
- Display above fighter names
- Real-time data from `get_community_pick_percentages()`
- Updates when user makes pick

---

## Mobile Hook Updates

### New Hook: useFriends

```typescript
// mobile/hooks/useFriends.ts

export function useFriends() {
  const getFriends = async (): Promise<Friend[]> => {
    const { data, error } = await supabase.rpc('get_friends', {
      target_user_id: (await supabase.auth.getUser()).data.user?.id,
    });
    if (error) throw error;
    return data;
  };

  const getFriendRequests = async (): Promise<FriendRequest[]> => {
    const { data, error } = await supabase.rpc('get_friend_requests', {
      target_user_id: (await supabase.auth.getUser()).data.user?.id,
    });
    if (error) throw error;
    return data;
  };

  const sendFriendRequest = async (friendUsername: string) => {
    // Lookup friend by username
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('username', friendUsername)
      .single();

    if (!profile) throw new Error('User not found');

    // Send request
    const { error } = await supabase.from('friendships').insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      friend_id: profile.user_id,
      status: 'pending',
    });

    if (error) throw error;
  };

  const acceptFriendRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (error) throw error;
  };

  const declineFriendRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'declined', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (error) throw error;
  };

  const unfriend = async (friendshipId: string) => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (error) throw error;
  };

  return {
    getFriends,
    getFriendRequests,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    unfriend,
  };
}
```

---

### New Hook: useLeaderboard

```typescript
// mobile/hooks/useLeaderboard.ts

export function useLeaderboard() {
  const getGlobalLeaderboard = async (limit = 50): Promise<LeaderboardEntry[]> => {
    const { data, error } = await supabase.rpc('get_global_leaderboard', {
      limit_count: limit,
    });
    if (error) throw error;
    return data;
  };

  const getFriendsLeaderboard = async (): Promise<LeaderboardEntry[]> => {
    const { data, error } = await supabase.rpc('get_friends_leaderboard', {
      target_user_id: (await supabase.auth.getUser()).data.user?.id,
    });
    if (error) throw error;
    return data;
  };

  return {
    getGlobalLeaderboard,
    getFriendsLeaderboard,
  };
}
```

---

### New Hook: usePrivacy

```typescript
// mobile/hooks/usePrivacy.ts

export function usePrivacy() {
  const getPrivacySettings = async (): Promise<PrivacySettings> => {
    const userId = (await supabase.auth.getUser()).data.user?.id;

    const { data, error } = await supabase
      .from('privacy_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // No settings exist, return defaults
      return {
        profile_visibility: 'public',
        picks_visibility: 'friends',
        show_on_leaderboard: true,
      };
    }

    if (error) throw error;
    return data;
  };

  const updatePrivacySettings = async (settings: Partial<PrivacySettings>) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;

    const { error } = await supabase
      .from('privacy_settings')
      .upsert({
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
  };

  return {
    getPrivacySettings,
    updatePrivacySettings,
  };
}
```

---

## Types

### New TypeScript Types

```typescript
// mobile/types/social.ts

export interface Friend {
  friend_user_id: string;
  username: string;
  accuracy_pct: number;
  total_picks: number;
  current_streak: number;
  friendship_since: string;
}

export interface FriendRequest {
  request_id: string;
  from_user_id: string;
  from_username: string;
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  accuracy_pct: number;
  total_picks: number;
  correct_picks: number;
  current_streak: number;
  best_streak?: number;
  is_me?: boolean;
}

export interface PrivacySettings {
  user_id?: string;
  profile_visibility: 'public' | 'friends' | 'private';
  picks_visibility: 'public' | 'friends' | 'private';
  show_on_leaderboard: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CommunityPickPercentage {
  bout_id: string;
  red_name: string;
  blue_name: string;
  total_picks: number;
  red_picks: number;
  blue_picks: number;
  red_percentage: number;
  blue_percentage: number;
}
```

---

## Testing Strategy

### Test with 3 Users

**User 1 (Alice):**
- Add Bob and Charlie as friends
- Make picks on upcoming event
- Check that Bob can see her picks
- View global leaderboard

**User 2 (Bob):**
- Accept Alice's friend request
- Make different picks than Alice
- View friends leaderboard (should show Alice, Charlie, self)
- Check community percentages

**User 3 (Charlie):**
- Set privacy to "friends only"
- Accept Alice's friend request
- Make picks
- Verify not on global leaderboard (privacy setting)

### Test Scenarios

**Friendships:**
- [ ] Alice sends request to Bob → Shows as pending
- [ ] Bob sees request → Can accept or decline
- [ ] Bob accepts → Both now friends
- [ ] Alice can see Bob's picks (all of them, always visible)
- [ ] Bob can see Alice's picks (all of them, always visible)
- [ ] Unfriend removes access to picks

**Privacy:**
- [ ] Charlie sets picks to "private" → Only Charlie sees them
- [ ] Charlie sets picks to "friends" → Alice sees them (friends), strangers don't
- [ ] Charlie sets picks to "public" → Everyone sees them
- [ ] Charlie disables leaderboard → Not on global leaderboard
- [ ] Charlie's friends still see stats

**Leaderboards:**
- [ ] Global shows top 50 by accuracy
- [ ] Current user highlighted if on leaderboard
- [ ] Friends leaderboard shows all friends + self
- [ ] Ranking updates after picks graded

**Community Percentages:**
- [ ] Shows % for each fighter
- [ ] Updates when user makes pick
- [ ] Accurate calculation (matches actual picks)

---

## Migration Order

**Apply in this order:**

1. `20251230000006_add_friendships_table.sql`
2. `20251230000007_add_privacy_settings_table.sql`
3. `20251230000008_update_picks_rls_for_social.sql`
4. `20251230000009_update_stats_rls_for_social.sql`
5. `20251230000010_add_social_functions.sql`

---

## Success Criteria

Sprint 2 is complete when:
- ✅ Users can add friends by username
- ✅ Users can accept/decline friend requests
- ✅ Friends can see each other's picks (always visible)
- ✅ Community pick percentages show on pick screen
- ✅ Global leaderboard shows top 50
- ✅ Friends leaderboard shows friends + self
- ✅ Privacy settings control visibility
- ✅ All RLS policies updated
- ✅ All tests passing
- ✅ CI green
- ✅ Tested with 3 test users

---

## What's NOT Included

❌ **Leagues** (per user request)
- No leagues table
- No league memberships
- No league invite codes
- No league leaderboards
- Can be added in future sprint if needed

---

## Implementation Checklist

### Phase 1: Database
- [ ] Create friendships table migration
- [ ] Create privacy_settings table migration
- [ ] Update picks RLS policy
- [ ] Update user_stats RLS policy
- [ ] Create social functions (get_friends, get_requests, leaderboards, community %)
- [ ] Apply all migrations locally
- [ ] Test with SQL queries

### Phase 2: Hooks
- [ ] Create useFriends hook
- [ ] Create useLeaderboard hook
- [ ] Create usePrivacy hook
- [ ] Create types (social.ts)
- [ ] Write unit tests for hooks

### Phase 3: UI Screens
- [ ] Create friends list screen (tab: Friends | Requests)
- [ ] Create add friend screen (search + send request)
- [ ] Create friend profile screen (view picks + stats)
- [ ] Create leaderboards screen (tab: Global | Friends)
- [ ] Create privacy settings screen
- [ ] Update pick screen (add community percentages)

### Phase 4: Testing
- [ ] Test with alice, bob, charlie
- [ ] Verify always-visible picks
- [ ] Verify privacy settings work
- [ ] Verify leaderboards accurate
- [ ] Run automated tests

### Phase 5: Documentation
- [ ] Update TEST_USERS.md with social testing scenarios
- [ ] Create SPRINT_2_COMPLETE.md

---

## Timeline

**Estimated:** 3-4 hours

- Database setup: 30 min
- Hooks: 45 min
- UI screens: 2 hours
- Testing: 1 hour

---

## Next Steps

After Sprint 2, the app will be ready for:
- **Leagues** (if desired later)
- **Advanced analytics** (head-to-head, fight predictions)
- **Notifications** (friend requests, pick reminders)
- **Push notifications** (when friends make picks)
- **Achievements/badges** (10-streak, 90% accuracy, etc.)

---

## References

- **Sprint 0:** Testing, RLS, monitoring
- **Sprint 1:** Auth, username login
- **Sprint 2:** This document (social features, no leagues)
