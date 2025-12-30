# UFC Picks Tracker - Planned Changes Summary

**Date**: 2025-12-30
**Status**: Planning Phase
**Branch**: claude/evaluate-and-plan-VvCw4

---

## Overview

This document summarizes all planned changes to move the UFC Picks Tracker from its current MVP state to a production-ready, social-enabled application.

---

## 1. Authentication System Redesign

### Current State
- Email OTP only (one-time password sent to email)
- **Currently bypassed in development** (`mobile/app/index.tsx` line 12)
- No social login options

### Planned Changes

**Primary Auth Method: Email + Password**
- Traditional email/password sign-in
- Username OR email login supported
- Password reset functionality
- Email verification on signup

**Keep Email OTP as Alternative**
- For users who prefer passwordless
- Existing OTP flow remains as option

**Future (When Ready)**:
- Google Sign-In (requires Google Cloud account)
- Apple Sign-In (requires Apple Developer account - $99/year)

### Implementation
- Update `mobile/hooks/useAuth.ts` with email/password methods
- Create new sign-in screen with email/password form
- Re-enable auth routing in `mobile/app/index.tsx`
- Add password reset flow
- Add email validation

### Files to Modify
- `mobile/hooks/useAuth.ts`
- `mobile/app/(auth)/sign-in.tsx`
- `mobile/app/(auth)/sign-up.tsx` (new)
- `mobile/app/(auth)/reset-password.tsx` (new)
- `mobile/app/index.tsx` (uncomment auth logic)

### Timeline: 1 week

---

## 2. Production Readiness

### Critical Gaps to Fix

#### A. Testing Infrastructure (CRITICAL)
**Current**: Zero tests, no testing framework

**Changes**:
- Install Jest + React Native Testing Library
- Add unit tests for hooks (useAuth, useQueries)
- Add component tests for Pick screen
- Add integration tests for auth flow
- Add integration tests for pick → lock → grade flow
- Set up GitHub Actions CI to run tests on PR
- Target: 60% code coverage on critical paths

**Files to Create**:
- `mobile/jest.config.js`
- `mobile/jest.setup.js`
- `mobile/__tests__/hooks/useAuth.test.ts`
- `mobile/__tests__/hooks/useQueries.test.ts`
- `mobile/__tests__/screens/pick.test.tsx`
- `mobile/__tests__/integration/auth-flow.test.ts`
- `mobile/__tests__/integration/pick-flow.test.ts`
- `.github/workflows/test.yml`

**Timeline**: 2-3 days

#### B. Error Tracking & Monitoring (CRITICAL)
**Current**: 106 console.log statements, no error tracking

**Changes**:
- Integrate Sentry for mobile app error tracking
- Integrate Sentry for Edge Functions error tracking
- Replace console.log with structured logging in Edge Functions
- Add custom analytics events (pick_made, event_graded, etc.)
- Create monitoring dashboard for key metrics
- Set up alerts for critical failures

**Files to Create**:
- `mobile/lib/sentry.ts`
- `mobile/lib/analytics.ts`
- `supabase/functions/_shared/logger.ts`
- `supabase/functions/_shared/sentry.ts`

**Dependencies to Add**:
- `@sentry/react-native`
- Sentry Deno SDK for Edge Functions

**Timeline**: 1 day

#### C. Security Hardening (HIGH PRIORITY)
**Changes**:
- Audit all RLS policies with multiple test users
- Add rate limiting to auth endpoints (prevent spam)
- Add email validation on sign-up
- Test session refresh token logic
- Verify service role key never exposed in mobile app

**Timeline**: 1 day

#### D. Edge Case Handling (HIGH PRIORITY)
**Changes**:
- Handle fighter name changes in scraper
- Handle event rescheduling (date changes)
- Handle bout replacements (fighter pulls out)
- Add transaction support to scraper (rollback on partial failure)
- Add scraper health check automation

**Files to Modify**:
- `supabase/functions/sync-next-event-card/index.ts`
- `supabase/functions/sync-recent-results-and-grade/index.ts`

**Timeline**: 2 days

#### E. Performance Optimization (MEDIUM PRIORITY)
**Changes**:
- Profile app on physical devices
- Add database indexes for slow queries (use EXPLAIN ANALYZE)
- Refactor large components (pick.tsx = 440 lines)
- Add React.memo to prevent unnecessary re-renders
- Optimize bundle size

**Timeline**: 2-3 days

#### F. Code Quality (LOW PRIORITY)
**Changes**:
- Add ESLint + Prettier
- Add pre-commit hooks (Husky)
- Refactor large components into smaller pieces
- Add JSDoc comments to functions

**Timeline**: 2-3 days

### Production Readiness Timeline
- **Minimum Viable Production**: 1 week (Critical items only)
- **Recommended Production**: 2-3 weeks (Critical + High Priority)
- **Fully Hardened**: 4-6 weeks (All items)

---

## 3. Social Features

### Core Decision: Picks Are Always Visible

**Users can see other users' picks at any time** - before lock, after lock, anytime.

### Why This Works
- Maximum transparency and social interaction
- Users can discuss picks before events
- Learn from good pickers
- More engaging pre-event conversations
- Simpler to implement (no time-based logic)
- Pick copying isn't a major concern - skill still matters

### Social Features to Implement

#### A. Friends System

**Features**:
- Search for users by username
- Send/accept/decline friend requests
- View friends list
- See friends' picks (anytime, including before event)
- Head-to-head stats: "You beat John 8-2 in last 10 events"
- Compare accuracy, streaks, achievements

**Database Tables**:
```sql
CREATE TABLE friendships (
  user_id UUID,
  friend_id UUID,
  status TEXT (pending, accepted, declined, blocked),
  created_at TIMESTAMPTZ,
  UNIQUE(user_id, friend_id)
);
```

**RLS Policy**:
```sql
-- Friends can see each other's picks (always)
CREATE POLICY "Friends can view each others picks"
  ON picks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM friendships
      WHERE (user_id = auth.uid() AND friend_id = picks.user_id)
         OR (friend_id = auth.uid() AND user_id = picks.user_id)
      AND status = 'accepted'
    )
  );
```

**UI Screens**:
- `mobile/app/(tabs)/friends.tsx` - Friends list + search
- `mobile/app/profile/[username].tsx` - View friend's profile
- Friend request notifications

**Timeline**: 2 weeks

#### B. Private Leagues

**Features**:
- Create leagues with name + description
- Generate unique invite code (e.g., "UFC-ABCD-1234")
- Join league via invite code
- League leaderboard (ranked by accuracy)
- All league members can see each other's picks (anytime)
- Admin can remove members

**Use Cases**:
- Office pool competitions
- Gym/training partners
- Friend groups
- Family leagues

**Database Tables**:
```sql
CREATE TABLE leagues (
  id UUID,
  name TEXT,
  description TEXT,
  invite_code TEXT UNIQUE,
  owner_id UUID,
  is_public BOOLEAN,
  created_at TIMESTAMPTZ
);

CREATE TABLE league_memberships (
  league_id UUID,
  user_id UUID,
  role TEXT (admin, member),
  joined_at TIMESTAMPTZ,
  UNIQUE(league_id, user_id)
);
```

**RLS Policy**:
```sql
-- League members can see each other's picks (always)
CREATE POLICY "League members can view picks"
  ON picks FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM league_memberships lm1
      JOIN league_memberships lm2 ON lm1.league_id = lm2.league_id
      WHERE lm1.user_id = auth.uid()
      AND lm2.user_id = picks.user_id
    )
  );
```

**UI Screens**:
- `mobile/app/(tabs)/leagues.tsx` - My leagues list
- `mobile/app/league/[id].tsx` - League detail + leaderboard
- `mobile/app/league/create.tsx` - Create new league
- `mobile/app/league/join.tsx` - Join via code

**Timeline**: 2 weeks

#### C. Global Leaderboards

**Features**:
- Global leaderboard (top 100 by accuracy)
- Monthly leaderboard (best in last 30 days)
- Streak leaderboard (longest active streaks)
- Friends-only leaderboard
- Opt-out option in privacy settings

**UI Screens**:
- `mobile/app/(tabs)/leaderboards.tsx` - Leaderboard tabs
- Filter by: Global / Monthly / Streaks / Friends

**Timeline**: 1 week

#### D. Community Pick Percentages

**Features**:
- Show what % of community picked each fighter
- Anonymous aggregation (no individual data)
- Real-time updates
- Shown on Pick screen before user makes pick

**Example UI**:
```
Fight: Jones vs Miocic

Community Picks:
▓▓▓▓▓▓▓░░░ 64% picking Red (Jones)
░░░░▓▓▓▓▓▓ 36% picking Blue (Miocic)
1,247 total picks

Your Pick: [Select Fighter]
```

**Database View**:
```sql
CREATE VIEW community_pick_percentages AS
SELECT
  bout_id,
  COUNT(CASE WHEN picked_corner = 'red' THEN 1 END) as red_count,
  COUNT(CASE WHEN picked_corner = 'blue' THEN 1 END) as blue_count,
  COUNT(*) as total_picks,
  ROUND(red_count::NUMERIC / total_picks * 100, 1) as red_percentage
FROM picks
WHERE status = 'active'
GROUP BY bout_id;
```

**Timeline**: 3 days

#### E. Privacy Controls

**Features**:
- Profile visibility: Public / Friends Only / Private
- Show on leaderboards: Yes / No
- Allow friend requests: Yes / No
- Search visibility: Yes / No

**Default Settings**: Public (maximize engagement)

**Database Table**:
```sql
CREATE TABLE privacy_settings (
  user_id UUID PRIMARY KEY,
  profile_visibility TEXT (public, friends, private),
  show_on_leaderboards BOOLEAN,
  allow_friend_requests BOOLEAN,
  created_at TIMESTAMPTZ
);
```

**UI**:
- `mobile/app/settings/privacy.tsx` - Privacy settings screen

**Timeline**: 2 days

### Updated RLS Policies for Picks Table

```sql
-- Users can always view their own picks
CREATE POLICY "Users can view own picks"
  ON picks FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view friends' picks (anytime)
CREATE POLICY "Users can view friends picks"
  ON picks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM friendships f
      WHERE (f.user_id = auth.uid() AND f.friend_id = picks.user_id)
         OR (f.friend_id = auth.uid() AND f.user_id = picks.user_id)
      AND f.status = 'accepted'
    )
  );

-- Users can view league members' picks (anytime)
CREATE POLICY "Users can view league picks"
  ON picks FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM league_memberships lm1
      JOIN league_memberships lm2 ON lm1.league_id = lm2.league_id
      WHERE lm1.user_id = auth.uid()
      AND lm2.user_id = picks.user_id
    )
  );

-- Users can view picks of users with public profiles (anytime)
CREATE POLICY "Users can view public profile picks"
  ON picks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM privacy_settings ps
      WHERE ps.user_id = picks.user_id
      AND ps.profile_visibility = 'public'
    )
    OR NOT EXISTS (
      SELECT 1 FROM privacy_settings ps
      WHERE ps.user_id = picks.user_id
    ) -- Default to public
  );
```

### Social Features Timeline
- **Friends System**: 2 weeks
- **Leagues**: 2 weeks
- **Leaderboards**: 1 week
- **Community Percentages**: 3 days
- **Privacy Controls**: 2 days
- **Total**: 6 weeks for all social features

---

## 4. Database Schema Changes

### New Tables to Create

```sql
-- Friendships
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

-- Leagues
CREATE TABLE leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) >= 3 AND char_length(name) <= 50),
  description TEXT,
  invite_code TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- League Memberships
CREATE TABLE league_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(league_id, user_id)
);

-- Privacy Settings
CREATE TABLE privacy_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_visibility TEXT CHECK (profile_visibility IN ('public', 'friends', 'private')) DEFAULT 'public',
  show_on_leaderboards BOOLEAN DEFAULT true,
  allow_friend_requests BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_friendships_user ON friendships(user_id, status);
CREATE INDEX idx_friendships_friend ON friendships(friend_id, status);
CREATE INDEX idx_leagues_invite_code ON leagues(invite_code);
CREATE INDEX idx_league_memberships_league ON league_memberships(league_id);
CREATE INDEX idx_league_memberships_user ON league_memberships(user_id);
```

### Modified Tables

**profiles** - Add display name:
```sql
ALTER TABLE profiles ADD COLUMN display_name TEXT CHECK (char_length(display_name) >= 1 AND char_length(display_name) <= 50);
UPDATE profiles SET display_name = username WHERE display_name IS NULL;
```

**picks** - Add updated_at for tracking changes:
```sql
ALTER TABLE picks ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();

CREATE TRIGGER update_picks_updated_at
BEFORE UPDATE ON picks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

---

## 5. New Mobile Screens

### Authentication Screens
- `mobile/app/(auth)/sign-in.tsx` - Email/password login (redesigned)
- `mobile/app/(auth)/sign-up.tsx` - Email/password signup (new)
- `mobile/app/(auth)/reset-password.tsx` - Password reset (new)
- `mobile/app/(auth)/sign-in-otp.tsx` - Email OTP alternative (new)

### Social Screens
- `mobile/app/(tabs)/friends.tsx` - Friends list + search (new tab)
- `mobile/app/(tabs)/leagues.tsx` - My leagues list (new tab)
- `mobile/app/(tabs)/leaderboards.tsx` - Global leaderboards (new tab)
- `mobile/app/profile/[username].tsx` - View other user's profile (new)
- `mobile/app/league/[id].tsx` - League detail + leaderboard (new)
- `mobile/app/league/create.tsx` - Create league (new)
- `mobile/app/league/join.tsx` - Join league via code (new)
- `mobile/app/settings/privacy.tsx` - Privacy settings (new)

### Enhanced Existing Screens
- `mobile/app/(tabs)/pick.tsx` - Add community pick percentages
- `mobile/app/(tabs)/stats.tsx` - Add social comparisons
- `mobile/app/(tabs)/profile.tsx` - Add friends/leagues stats

---

## 6. New React Hooks

**Social Features Hooks**:
- `mobile/hooks/useFriends.ts` - Friend management
- `mobile/hooks/useLeagues.ts` - League operations
- `mobile/hooks/useLeaderboards.ts` - Leaderboard data
- `mobile/hooks/useCommunityPercentages.ts` - Pick percentages
- `mobile/hooks/usePrivacySettings.ts` - Privacy controls

---

## 7. Dependencies to Add

### Mobile App (`mobile/package.json`)

```json
{
  "dependencies": {
    // Already installed:
    // "@supabase/supabase-js": "^2.89.0",
    // "@tanstack/react-query": "^5.90.15",
    // "expo": "~54.0.30",
    // "react": "19.1.0",
    // "react-native": "0.81.5"
  },
  "devDependencies": {
    // Testing
    "jest": "^29.0.0",
    "@testing-library/react-native": "^12.0.0",
    "@testing-library/jest-native": "^5.4.0",
    "jest-expo": "^51.0.0",
    "@types/jest": "^29.0.0",

    // Error Tracking
    "@sentry/react-native": "^5.0.0",

    // Code Quality
    "eslint": "^8.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "eslint-plugin-react": "^7.0.0",
    "eslint-plugin-react-native": "^4.0.0",
    "prettier": "^3.0.0",
    "husky": "^8.0.0",
    "lint-staged": "^15.0.0"
  }
}
```

---

## 8. Implementation Roadmap

### Phase 0: Production Launch Prep (Week 1-3)
**Critical blockers that must be fixed:**

**Week 1:**
- [ ] Re-enable authentication flow in index.tsx
- [ ] Add email/password sign-in/sign-up
- [ ] Set up Jest + React Native Testing Library
- [ ] Write critical path tests (auth, picks)
- [ ] Integrate Sentry for error tracking

**Week 2:**
- [ ] Replace console.log with structured logging
- [ ] Add custom analytics events
- [ ] Security audit (RLS policies)
- [ ] Add rate limiting to auth endpoints
- [ ] Handle edge cases (fighter changes, rescheduling)

**Week 3:**
- [ ] Performance optimization (profile app, optimize queries)
- [ ] Add ESLint + Prettier
- [ ] Refactor large components
- [ ] Set up GitHub Actions CI
- [ ] Final testing and bug fixes

**Deliverable**: Production-ready app without social features

### Phase 1: Social Foundation (Week 4-7)
**Add core social features:**

**Week 4-5: Friends System**
- [ ] Create friendships table + RLS policies
- [ ] Add Friends tab UI
- [ ] Username search functionality
- [ ] Friend request flow (send, accept, decline)
- [ ] View friend's profile + picks
- [ ] Head-to-head stats

**Week 6-7: Leagues**
- [ ] Create leagues + league_memberships tables
- [ ] Add Leagues tab UI
- [ ] Create league flow
- [ ] Join league via invite code
- [ ] League leaderboard
- [ ] Admin controls

**Deliverable**: Users can compete with friends and in leagues

### Phase 2: Community Features (Week 8-9)
**Add broader community engagement:**

**Week 8:**
- [ ] Global leaderboards (overall, monthly, streaks)
- [ ] Community pick percentages on Pick screen
- [ ] Privacy settings UI
- [ ] Public profile view

**Week 9:**
- [ ] Pick insights ("You agree with 68% of community")
- [ ] Social sharing to Instagram/Twitter
- [ ] Enhanced stats visualization
- [ ] Polish and bug fixes

**Deliverable**: Full social experience with community features

### Total Timeline: 9 weeks

---

## 9. Key Metrics to Track

### User Engagement
- Daily Active Users (DAU)
- Weekly Active Users (WAU)
- Picks per user per event
- Pick completion rate (% of users who pick on events)

### Social Adoption
- % of users who add at least 1 friend
- % of users who join at least 1 league
- Average friends per user
- Average leagues per user

### Social Engagement
- % of users who view friends' picks
- % of users who view community percentages
- % of users who view leaderboards
- Friend picks views per event

### Retention Impact
- Day 7 retention: Social users vs Solo users
- Day 30 retention: Social users vs Solo users
- Session frequency: Social users vs Solo users
- Picks per event: Social users vs Solo users

**Hypothesis**: Social users have 2-3x better retention

### Technical Metrics
- App crash rate (target: <1%)
- API error rate (target: <5%)
- Average response time (target: <500ms)
- Scraper success rate (target: >99%)
- Grading success rate (target: >99%)

---

## 10. Current State vs Target State

### Authentication
| Current | Target |
|---------|--------|
| Email OTP only | Email/Password primary |
| Bypassed in dev | Fully enabled |
| No social login | Email OTP as alternative |
| No session refresh | (Google/Apple future) |

### Testing
| Current | Target |
|---------|--------|
| 0 tests | 60% coverage on critical paths |
| No CI/CD | GitHub Actions running tests |
| Manual testing only | Automated test suite |

### Monitoring
| Current | Target |
|---------|--------|
| 106 console.logs | Structured logging |
| No error tracking | Sentry integrated |
| No analytics | Custom event tracking |
| No alerts | Critical failure alerts |

### Social Features
| Current | Target |
|---------|--------|
| Isolated users | Friends system |
| No competition | Private leagues |
| No leaderboards | Global leaderboards |
| Private picks only | Always-visible picks |
| No community data | Community pick percentages |

### Production Readiness
| Current | Target |
|---------|--------|
| 20% ready | 100% ready |
| 4 critical blockers | 0 blockers |
| Development mode | Production mode |

---

## 11. Next Immediate Steps

### Step 1: Re-enable Auth (Start Here - 1 day)
1. Update `mobile/hooks/useAuth.ts` with email/password methods
2. Create new sign-in screen with email/password form
3. Uncomment auth logic in `mobile/app/index.tsx`
4. Test complete auth flow
5. Fix any bugs

### Step 2: Set Up Testing (2-3 days)
1. Install Jest + React Native Testing Library
2. Create test configuration files
3. Write first tests for useAuth hook
4. Write tests for picks flow
5. Set up GitHub Actions CI

### Step 3: Add Monitoring (1 day)
1. Create Sentry account
2. Install and configure Sentry for mobile
3. Install and configure Sentry for Edge Functions
4. Test error reporting
5. Add custom analytics events

### Step 4: Security & Edge Cases (2 days)
1. Audit RLS policies with test users
2. Add rate limiting to auth
3. Handle fighter name changes
4. Handle event rescheduling
5. Add transaction support to scraper

### Step 5: Performance & Code Quality (2-3 days)
1. Profile app performance
2. Optimize slow queries
3. Refactor large components
4. Add ESLint + Prettier
5. Final polish

### Then: Start Social Features (Week 4)

---

## 12. Questions Answered

✅ **Users want to see other picks at any time** - Not time-based, always visible
✅ **No users yet** - Fresh start, no migration needed
✅ **No Google Cloud account yet** - Skip Google OAuth for now
✅ **No Apple Developer account yet** - Skip Apple OAuth for now
✅ **Keep Email OTP** - Yes, as alternative to email/password
✅ **Default auth: Email** - Email/password is primary

---

## Summary

**What's Working**: MVP features are complete (picks, grading, stats)

**What's Missing**:
- Production readiness (testing, monitoring, security)
- Social features (friends, leagues, leaderboards)
- Auth is bypassed

**Timeline**:
- **Week 1-3**: Production readiness (critical)
- **Week 4-7**: Social features (friends + leagues)
- **Week 8-9**: Community features (leaderboards + percentages)

**Total**: 9 weeks to fully social, production-ready app

**Next Action**: Start with re-enabling auth + testing infrastructure (Week 1)
