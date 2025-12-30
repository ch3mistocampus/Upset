# Social Features & Picks Visibility Plan

**Created**: 2025-12-30
**Status**: Planning Phase
**Goal**: Allow users to see other users' picks while preventing pick copying and maintaining competitive integrity

---

## The Core Problem

**Current State**: Users are completely isolated (RLS policies prevent seeing other users' data)

**User Need**:
- Want to compete with friends
- Want to see how they compare to community
- Want social/competitive aspect to increase engagement

**Challenge**:
- If users can see picks BEFORE event locks → people copy good pickers → no skill, just following
- If users NEVER see picks → no social aspect, boring, no competition

**Solution**: **Time-based visibility with privacy controls**

---

## Proposed Social Model

### Core Principle: "Private Before Lock, Social After Lock"

```
Timeline:
Event Announced → Users Make Picks (PRIVATE) → Event Starts (LOCK) → Picks Revealed (PUBLIC) → Results → Compare Performance
```

### 1. Before Event Lock (Pre-Competition Phase)

**Picks are PRIVATE**:
- ❌ Users CANNOT see other users' specific picks
- ✅ Users CAN see aggregated community trends (anonymous percentages)
- ✅ Users CAN see how many of their friends have made picks (not what they picked)

**Why**:
- Prevents pick copying
- Encourages independent thinking
- Makes competition fair

**Example UI**:
```
Fight: Jones vs Miocic
Your Pick: Jones (Red) ✓

Community Trends:
▓▓▓▓▓▓▓░░░ 64% picking Red (Jones)
░░░░▓▓▓▓▓▓ 36% picking Blue (Miocic)

Friends: 8 of 12 have made picks for this fight
(You'll see who picked what after the event starts)
```

### 2. After Event Lock (Competition Phase)

**Picks are REVEALED**:
- ✅ Users CAN see friends' picks
- ✅ Users CAN see league members' picks
- ✅ Users CAN compare pick-by-pick
- ✅ Leaderboard updates in real-time as results come in

**Why**:
- Creates anticipation ("Did my friend pick the same as me?")
- Allows friendly trash talk
- Makes watching the event more engaging
- Can't be gamed (picks are locked)

**Example UI**:
```
Fight: Jones vs Miocic (IN PROGRESS - Locked)

Your Pick: Jones (Red) ✓
John's Pick: Miocic (Blue) ✗
Sarah's Pick: Jones (Red) ✓
Mike's Pick: Jones (Red) ✓

3 of 4 friends agree with you!
```

### 3. After Event Completes (Results Phase)

**Full Transparency**:
- ✅ See everyone's picks vs results
- ✅ Leaderboards updated with scores
- ✅ Stats recalculated
- ✅ Achievements unlocked

**Example UI**:
```
UFC 300 Results - You went 10/12 (83%)

Leaderboard:
1. Sarah - 11/12 (92%) 🥇
2. You - 10/12 (83%) 🥈
3. Mike - 9/12 (75%) 🥉
4. John - 7/12 (58%)

Fight-by-Fight Breakdown:
✅ Jones def. Miocic - You: ✓ Sarah: ✓ Mike: ✓ John: ✗
✅ Pereira def. Adesanya - You: ✗ Sarah: ✓ Mike: ✗ John: ✗
...
```

---

## Social Features Hierarchy

### Level 1: Public Stats (No Friends Required)

**What Users Can See**:
- ✅ Global leaderboard (top 100 users by accuracy)
- ✅ Community pick percentages (before lock)
- ✅ Aggregate stats (average accuracy, most popular picks, upsets)

**Privacy**:
- Users can OPT OUT of global leaderboard
- Profile visibility setting: Public / Friends Only / Private

**Example**:
```
Global Leaderboard (All Time)
1. PickMaster99 - 892 picks, 78.2% accuracy
2. UFCGenius - 654 picks, 76.8% accuracy
3. You - 234 picks, 72.5% accuracy (Ranked #247)
...

You can opt out in Settings > Privacy > Hide from Leaderboards
```

### Level 2: Friends System (1-on-1 Comparisons)

**How It Works**:
1. User searches for friend by username
2. Sends friend request
3. Friend accepts/declines
4. Both users can now see each other's picks (after lock) and stats

**What Friends Can See**:
- ✅ Each other's picks (after event locks)
- ✅ Head-to-head stats ("You beat John 8 out of last 10 events")
- ✅ Full pick history
- ✅ Accuracy stats, streaks, achievements

**Privacy**:
- Friends are bi-directional (both must accept)
- Can unfriend at any time
- Can block users

**Example**:
```
Friends (12)
[Search for username...]

John Smith (@johnsmith)
  Head-to-Head: You 8 - 2 John (Last 10 events)
  John's Accuracy: 68.4%
  [View Profile] [Unfriend]

Sarah Lee (@sarahlee)
  Head-to-Head: Sarah 6 - 4 You (Last 10 events)
  Sarah's Accuracy: 79.2%
  [View Profile] [Unfriend]
```

### Level 3: Private Leagues (Group Competitions)

**How It Works**:
1. User creates a league (e.g., "Office Pool", "Gym Bros", "College Friends")
2. League gets unique invite code (e.g., "UFC-ABCD-1234")
3. Users join via invite code
4. All members compete on league leaderboard

**League Types**:
- **Private**: Invite-only, admin can remove members
- **Public**: Anyone can join via code, open competition

**What League Members Can See**:
- ✅ League leaderboard (ranked by accuracy or points)
- ✅ All members' picks (after lock)
- ✅ League-specific stats (who's the best in this group)

**League Settings (Admin Controls)**:
- Scoring system (standard accuracy, or custom points)
- Season mode (resets stats each month/year)
- Chat/discussion board (optional)

**Example**:
```
My Leagues (3)

Office Pool (24 members)
  Your Rank: #3 (74.2%)
  League Leader: Mike (81.5%)
  Invite Code: UFC-OFFICE-2025
  [View Leaderboard] [League Chat] [Settings]

Gym Bros (8 members)
  Your Rank: #1 (74.2%) 🏆
  Next Event: UFC 301 (6 of 8 picked)
  [View Leaderboard] [Invite Friends]

Create New League [+]
Join League [Enter Code]
```

### Level 4: Enhanced Social Features (Future)

**Pick Insights**:
- "You agree with 68% of the community on this pick"
- "Your friend Sarah is on a 12-fight correct streak!"
- "Upset alert: Only 15% picked this fighter, but they won!"

**Social Sharing**:
- Share your accuracy to Instagram/Twitter
- Share league leaderboard standings
- Share perfect event card achievement

**Live Event Features**:
- Live pick reveal during event (progressive unlock as fights finish)
- Real-time leaderboard updates
- Group watch party coordination

---

## Database Schema Updates

### New Tables Required

#### 1. Friendships Table

```sql
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

CREATE INDEX idx_friendships_user ON friendships(user_id, status);
CREATE INDEX idx_friendships_friend ON friendships(friend_id, status);

COMMENT ON TABLE friendships IS 'User friend connections';
```

#### 2. Leagues Table

```sql
CREATE TABLE leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) >= 3 AND char_length(name) <= 50),
  description TEXT,
  invite_code TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false,
  scoring_system JSONB DEFAULT '{"type": "standard"}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_leagues_invite_code ON leagues(invite_code);
CREATE INDEX idx_leagues_owner ON leagues(owner_id);

COMMENT ON TABLE leagues IS 'Private leagues for group competitions';
```

#### 3. League Memberships Table

```sql
CREATE TABLE league_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(league_id, user_id)
);

CREATE INDEX idx_league_memberships_league ON league_memberships(league_id);
CREATE INDEX idx_league_memberships_user ON league_memberships(user_id);
```

#### 4. Privacy Settings Table

```sql
CREATE TABLE privacy_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_visibility TEXT CHECK (profile_visibility IN ('public', 'friends', 'private')) DEFAULT 'public',
  show_on_leaderboards BOOLEAN DEFAULT true,
  allow_friend_requests BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE privacy_settings IS 'User privacy preferences';
```

### Updated RLS Policies

#### Picks Table (Modified for Social Features)

```sql
-- Users can view their own picks (always)
CREATE POLICY "Users can view own picks"
  ON picks FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view friends' picks AFTER event has started (locked)
CREATE POLICY "Users can view friends picks after lock"
  ON picks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM friendships f
      WHERE (f.user_id = auth.uid() AND f.friend_id = picks.user_id)
         OR (f.friend_id = auth.uid() AND f.user_id = picks.user_id)
      AND f.status = 'accepted'
    )
    AND EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = picks.event_id
      AND e.event_date <= now()  -- Event has started (locked)
    )
  );

-- Users can view league members' picks AFTER event has started
CREATE POLICY "Users can view league picks after lock"
  ON picks FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM league_memberships lm1
      JOIN league_memberships lm2 ON lm1.league_id = lm2.league_id
      WHERE lm1.user_id = auth.uid()
      AND lm2.user_id = picks.user_id
    )
    AND EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = picks.event_id
      AND e.event_date <= now()  -- Event has started (locked)
    )
  );

-- Service role can always view (for grading)
-- (Bypassed by service_role key)
```

#### User Stats Table (Modified for Social Visibility)

```sql
-- Users can view their own stats
CREATE POLICY "Users can view own stats"
  ON user_stats FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view stats of users with public profiles
CREATE POLICY "Users can view public stats"
  ON user_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM privacy_settings ps
      WHERE ps.user_id = user_stats.user_id
      AND ps.profile_visibility = 'public'
    )
    OR NOT EXISTS (
      SELECT 1 FROM privacy_settings ps
      WHERE ps.user_id = user_stats.user_id
    ) -- Default to public if no privacy settings
  );

-- Users can view friends' stats
CREATE POLICY "Users can view friends stats"
  ON user_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM friendships f
      WHERE (f.user_id = auth.uid() AND f.friend_id = user_stats.user_id)
         OR (f.friend_id = auth.uid() AND f.user_id = user_stats.user_id)
      AND f.status = 'accepted'
    )
  );
```

#### Profiles Table (Modified for Searchability)

```sql
-- Users can search for profiles (username search for friend requests)
CREATE POLICY "Users can search profiles"
  ON profiles FOR SELECT
  USING (true);  -- Allow reading usernames for search

-- Privacy is enforced by privacy_settings, not by hiding profiles
-- This allows friend requests while respecting privacy for stats/picks
```

---

## Community Pick Percentages (Anonymous Aggregation)

### How It Works

**Before Event Lock**:
- Show aggregated percentages of what the community picked
- NO individual user information
- Updated in real-time

**Implementation**:

```sql
-- Create view for community pick percentages
CREATE OR REPLACE VIEW community_pick_percentages AS
SELECT
  b.id as bout_id,
  b.event_id,
  COUNT(CASE WHEN p.picked_corner = 'red' THEN 1 END) as red_count,
  COUNT(CASE WHEN p.picked_corner = 'blue' THEN 1 END) as blue_count,
  COUNT(*) as total_picks,
  ROUND(
    COUNT(CASE WHEN p.picked_corner = 'red' THEN 1 END)::NUMERIC /
    NULLIF(COUNT(*), 0) * 100,
    1
  ) as red_percentage,
  ROUND(
    COUNT(CASE WHEN p.picked_corner = 'blue' THEN 1 END)::NUMERIC /
    NULLIF(COUNT(*), 0) * 100,
    1
  ) as blue_percentage
FROM bouts b
LEFT JOIN picks p ON b.id = p.bout_id AND p.status = 'active'
GROUP BY b.id, b.event_id;

-- RLS: Everyone can read (anonymous data)
ALTER TABLE community_pick_percentages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Community percentages are public"
  ON community_pick_percentages FOR SELECT
  USING (true);
```

**UI Example**:
```typescript
// Pick screen shows community trends
const CommunityTrend = ({ bout }) => {
  const { data } = useCommunityPercentage(bout.id);

  return (
    <View>
      <Text>Community Picks:</Text>
      <ProgressBar
        red={data.red_percentage}
        blue={data.blue_percentage}
      />
      <Text>{data.red_percentage}% picking {bout.red_name}</Text>
      <Text>{data.blue_percentage}% picking {bout.blue_name}</Text>
      <Text>{data.total_picks} total picks</Text>
    </View>
  );
};
```

---

## Mobile App UI/UX Updates

### New Screens Needed

#### 1. Friends Screen (`mobile/app/(tabs)/friends.tsx`)

```
Top Navigation:
  Friends (active) | Requests (badge: 3)

Search Bar:
  [Search username...]

Friend List:
  John Smith (@johnsmith)
    72.5% accuracy | You 8-2 John
    [View Profile]

  Sarah Lee (@sarahlee)
    81.3% accuracy | Sarah 6-4 You
    [View Profile]

  [+ Add Friend]

Friend Requests:
  Mike Johnson wants to be friends
  [Accept] [Decline]
```

#### 2. Leagues Screen (`mobile/app/(tabs)/leagues.tsx`)

```
My Leagues (3)

Office Pool
  #3 of 24 | 74.2% accuracy
  Next event: 6/8 picked
  [View]

Gym Bros
  #1 of 8 | 74.2% accuracy 🏆
  [View]

[+ Create League]
[Join League]
```

#### 3. League Detail Screen (`mobile/app/league/[id].tsx`)

```
Office Pool
24 members | Created by Mike

Leaderboard:
1. Mike - 81.5% (195/239) 🥇
2. Sarah - 78.2% (187/239) 🥈
3. You - 74.2% (177/239) 🥉
4. John - 71.8% (171/239)
...

Upcoming Event: UFC 301
  6 of 24 members have picked

Recent Events:
  UFC 300: Mike won with 11/12

[League Settings] (admin only)
[Leave League]
```

#### 4. Profile Screen (Enhanced)

```
Your Profile
@yourusername

Stats:
  234 picks | 72.5% accuracy
  Current Streak: 3
  Best Streak: 12

Friends: 12
Leagues: 3

Achievements: 8 unlocked
  🏆 Perfect Card (UFC 298)
  🔥 10-Fight Streak
  ...

[Edit Profile]
[Privacy Settings]
[Sign Out]
```

#### 5. User Profile View (`mobile/app/profile/[username].tsx`)

```
John Smith
@johnsmith

Stats:
  892 picks | 78.2% accuracy
  Current Streak: 5
  Best Streak: 23

Achievements: 15 unlocked

Head-to-Head:
  You 8 - 2 John (Last 10 events)

Recent Performance:
  UFC 300: 11/12 (92%)
  UFC 299: 9/11 (82%)
  ...

[Remove Friend]
[Message] (future)
```

### Updated Pick Screen (With Community Trends)

```
UFC 301 - March 15, 2025
Picks lock in: 2d 14h 32m

Main Event
Jones vs Miocic
Heavyweight

Community: 64% Red | 36% Blue
Friends: 8 of 12 have picked

[Red Fighter Card]        [Blue Fighter Card]
  Jones                     Miocic
  26-1-0                    20-4-0
  ✓ Your Pick
```

---

## Privacy Controls (Settings Screen)

```
Privacy & Visibility

Profile Visibility:
  ○ Public - Anyone can see your stats
  ● Friends Only - Only friends can see stats
  ○ Private - No one can see stats

Leaderboards:
  ☑ Show me on global leaderboards
  ☑ Allow friend requests
  ☑ Show in league member lists

Social Features:
  ☑ Allow friends to see my picks (after lock)
  ☑ Allow league members to see my picks (after lock)
  ☑ Show my username in search results

[Save Settings]
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Update database schema (friendships, leagues, privacy_settings)
- [ ] Update RLS policies for time-based visibility
- [ ] Create community_pick_percentages view
- [ ] Add privacy settings to Profile screen

### Phase 2: Friends System (Week 3-4)
- [ ] Create Friends screen UI
- [ ] Implement username search
- [ ] Friend request flow (send, accept, decline)
- [ ] Head-to-head stats calculation
- [ ] Friend picks visibility (after lock)

### Phase 3: Community Features (Week 5-6)
- [ ] Global leaderboard UI
- [ ] Community pick percentages on Pick screen
- [ ] Public profile view
- [ ] Privacy controls

### Phase 4: Leagues (Week 7-8)
- [ ] Create league flow
- [ ] Join league via invite code
- [ ] League leaderboard
- [ ] League member picks visibility
- [ ] Admin controls

### Phase 5: Enhanced Social (Week 9-10)
- [ ] Pick insights and comparisons
- [ ] Social sharing (Instagram, Twitter)
- [ ] Live event features
- [ ] Achievements for social milestones

---

## Key Decisions to Make

### 1. Default Privacy Setting
- **Option A**: Public by default (max engagement, easy to opt out)
- **Option B**: Private by default (max privacy, users opt in)
- **Recommendation**: Public by default with clear onboarding explaining privacy

### 2. Friend Limits
- **Unlimited friends**: Like Facebook (can get overwhelming)
- **Limited friends**: Like Snapchat (200 max) (more intimate)
- **Recommendation**: Start unlimited, add limits if abuse/spam

### 3. Pick Reveal Timing
- **Option A**: Reveal ALL picks when event starts
- **Option B**: Reveal picks progressively as each fight finishes
- **Recommendation**: Option A (cleaner, less complex, more social pre-event)

### 4. League Invite Codes
- **Short codes**: UFC-1234 (easy to share, higher collision risk)
- **Long codes**: UFC-ABCD-1234-EFGH (secure, harder to remember)
- **Recommendation**: Medium codes: UFC-ABCD-1234 (6 char alphanumeric)

### 5. Usernames vs Display Names
- **Usernames only**: @johnsmith (unique, searchable, simple)
- **Display names + usernames**: "John Smith" (@johnsmith)
- **Recommendation**: Display names + usernames (more personal, better UX)

---

## Testing Strategy

### Privacy Tests
- [ ] User A cannot see User B's picks before event locks
- [ ] User A CAN see friend User B's picks after event locks
- [ ] User A cannot see User B's stats if User B is private
- [ ] Blocked users cannot see each other's data
- [ ] Privacy settings are respected in all views

### Social Tests
- [ ] Friend request flow (send, accept, decline, block)
- [ ] League creation and joining
- [ ] Leaderboards update correctly
- [ ] Community percentages calculate correctly
- [ ] Head-to-head stats accurate

### Performance Tests
- [ ] Leaderboard queries fast with 10k+ users
- [ ] Community percentages fast with 1000+ picks per bout
- [ ] Friend list loads quickly with 200+ friends

---

## Engagement Metrics to Track

### Social Adoption
- % of users who add at least 1 friend
- % of users who join at least 1 league
- Average friends per user
- Average leagues per user

### Social Engagement
- % of users who view community percentages
- % of users who view leaderboards
- % of users who compare with friends after events
- Friend picks viewed per event

### Retention Impact
- Day 7 retention: Social users vs Solo users
- Picks per event: Social users vs Solo users
- Session frequency: Social users vs Solo users

**Hypothesis**: Social users have 2-3x better retention and engagement

---

## Summary

### The Social Model

**Before Lock**: Private picks + Anonymous community trends
**After Lock**: Full transparency + Social comparison
**After Results**: Leaderboards + Achievements + Bragging rights

### Core Features
1. **Friends System** - 1-on-1 competition and comparison
2. **Private Leagues** - Group competitions with invite codes
3. **Global Leaderboards** - See top performers worldwide
4. **Community Trends** - Anonymous pick percentages before lock
5. **Privacy Controls** - Users control their visibility

### Database Updates
- 4 new tables: friendships, leagues, league_memberships, privacy_settings
- Updated RLS policies for time-based visibility
- Community pick percentages view

### Timeline
- 10 weeks for full social feature set
- Can launch with just Friends (4 weeks) and add Leagues later

---

## Next Steps

Before implementing, please confirm:

1. **Privacy model**: Private before lock, public after lock ✓ or different?
2. **Friend limits**: Unlimited or cap at X friends?
3. **Default privacy**: Public profile or private profile?
4. **Pick reveal timing**: All at once when event starts, or progressive?
5. **Priority order**: Friends first, or Leagues first, or both together?

Once confirmed, I'll start implementing the database schema and RLS policies!
