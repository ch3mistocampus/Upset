# UFC Picks Tracker - Evaluation & Roadmap

**Generated**: 2025-12-30
**Branch**: claude/evaluate-and-plan-VvCw4
**Current Status**: MVP Complete, Pre-Production

---

## Executive Summary

The UFC Picks Tracker has successfully completed its MVP phase with all core features implemented and functional. The app provides a clean, focused experience for tracking UFC prediction accuracy with automated data syncing, pick locking, and statistics calculation.

**Current State**: ✅ Feature-complete MVP with solid architecture
**Production Ready**: ⚠️ 70% - Needs testing, monitoring, and auth re-enablement
**Code Quality**: ✅ Good - Type-safe, documented, well-architected
**Technical Debt**: ⚠️ Moderate - Missing tests, monitoring, and some edge case handling

---

## Current State Analysis

### What's Working Well ✅

1. **Core User Flow**
   - Seamless pick making with instant visual feedback
   - Automatic pick locking at event start time
   - Auto-grading with UFCStats scraping
   - Accurate statistics calculation (accuracy %, streaks)

2. **Technical Foundation**
   - Full TypeScript coverage with strong typing
   - Supabase backend with RLS security
   - React Query for efficient data caching
   - Automated data pipeline via GitHub Actions
   - Clean component architecture

3. **User Experience**
   - Polished dark theme with UFC branding
   - Smooth animations and haptic feedback
   - Loading states and error handling
   - Pull-to-refresh on all screens

4. **Documentation**
   - Comprehensive README with setup instructions
   - Implementation plan documenting decisions
   - UFCStats data structure documentation
   - Deployment guides

### Critical Gaps ⚠️

1. **Testing**
   - ❌ No unit tests for React components
   - ❌ No integration tests for API flows
   - ❌ No E2E tests for user journeys
   - ❌ Manual scraper testing only

2. **Production Readiness**
   - ❌ Auth flow bypassed in development
   - ❌ No error tracking (Sentry/Rollbar)
   - ❌ No analytics tracking
   - ❌ No app store presence (iOS/Android)

3. **Monitoring & Observability**
   - ❌ Console.log only (no structured logging)
   - ❌ No Edge Function performance metrics
   - ❌ No database query monitoring
   - ❌ No user behavior analytics

4. **Edge Cases & Robustness**
   - ⚠️ Fighter name changes not tracked
   - ⚠️ Preliminary card changes limited to `card_snapshot`
   - ⚠️ No conflict resolution if scraper fails mid-run
   - ⚠️ No handling for rescheduled events
   - ⚠️ No rate limit protection for users

5. **Features (Not Critical)**
   - ❌ Push notifications (UI exists but not functional)
   - ❌ Delete account feature (placeholder)
   - ❌ Social features (friends, leagues)
   - ❌ Method/round prediction scoring

---

## Strategic Priorities

### Priority 1: Production Readiness (Critical Path)
**Goal**: Launch app to real users safely and reliably

**Required Before Public Launch:**
1. Re-enable authentication flow
2. Implement error tracking and monitoring
3. Add critical path testing (pick flow, grading, stats)
4. Build and deploy to TestFlight/Google Play Beta
5. Conduct beta testing with 10-20 users
6. Fix critical bugs from beta feedback
7. Set up app store listings

**Success Metrics:**
- Zero critical bugs in beta
- <3s app launch time
- 99.5% API success rate
- Successful grading of at least 2 events

### Priority 2: Enhanced MVP
**Goal**: Improve core experience and add high-value features

**Features:**
1. Push notifications for upcoming events and grading completion
2. Pick history view (see past predictions)
3. Fighter statistics and historical data
4. Edit picks before lock time
5. Delete account functionality
6. Improved stats visualization

**Success Metrics:**
- 30%+ users enable notifications
- 50%+ users view pick history
- Reduced user confusion/support requests

### Priority 3: Social & Engagement
**Goal**: Drive retention through social competition

**Features:**
1. Friend system (add/remove friends)
2. Private leagues (compete with selected users)
3. Leaderboards (global, friends, league)
4. Social sharing (post accuracy to social media)
5. Weekly/monthly accuracy challenges
6. Achievement system (badges, milestones)

**Success Metrics:**
- 40%+ users add at least 1 friend
- 25%+ users join a league
- 2x increase in weekly active users
- 3x increase in picks per user

### Priority 4: Advanced Features
**Goal**: Differentiate from competitors and add depth

**Features:**
1. Method and round prediction scoring
2. Confidence-weighted picks (1x, 2x, 3x multiplier)
3. Multi-organization support (Bellator, PFL, ONE)
4. Pick insights (fighter stats, tale of the tape)
5. Parlay challenges (pick entire card perfectly)
6. Prediction analytics (which fights you're best/worst at)
7. Historical fighter matchup data

**Success Metrics:**
- 60%+ users enable method/round predictions
- 40%+ users use confidence weighting
- 15%+ users track non-UFC organizations

---

## Detailed Roadmap

### Phase 0: Production Launch Preparation

#### 0.1 Testing Infrastructure
**Why**: Prevent regressions and catch bugs before users do

**Tasks:**
- [ ] Set up Jest + React Native Testing Library
- [ ] Add unit tests for critical hooks (useAuth, useQueries)
- [ ] Add component tests for Pick screen (primary user interaction)
- [ ] Add integration tests for auth flow (OTP → username → home)
- [ ] Add integration tests for pick → lock → grade flow
- [ ] Set up GitHub Actions CI to run tests on PR
- [ ] Achieve 60% code coverage minimum on critical paths

**Files to Create:**
- `mobile/__tests__/hooks/useAuth.test.ts`
- `mobile/__tests__/hooks/useQueries.test.ts`
- `mobile/__tests__/screens/pick.test.tsx`
- `mobile/__tests__/integration/auth-flow.test.ts`
- `mobile/__tests__/integration/pick-flow.test.ts`
- `mobile/jest.config.js`
- `mobile/jest.setup.js`
- `.github/workflows/test.yml`

**Estimated Impact**: Prevent 80% of regressions, faster development cycle

#### 0.2 Monitoring & Error Tracking
**Why**: Understand production issues and user behavior

**Tasks:**
- [ ] Integrate Sentry for error tracking (React Native + Edge Functions)
- [ ] Add structured logging to Edge Functions (replace console.log)
- [ ] Set up custom analytics events (pick_made, event_graded, etc.)
- [ ] Create monitoring dashboard for key metrics
- [ ] Set up alerts for critical failures (scraper down, grading failed)
- [ ] Add performance monitoring for slow queries
- [ ] Track user funnels (sign-up → pick → view stats)

**Files to Create:**
- `mobile/lib/sentry.ts`
- `mobile/lib/analytics.ts`
- `supabase/functions/_shared/logger.ts`
- `supabase/functions/_shared/sentry.ts`

**Key Metrics to Track:**
- Daily Active Users (DAU)
- Picks per user per event
- Auth completion rate
- Scraper success rate (events, cards, results)
- Grading accuracy (% of picks graded)
- App crash rate
- API error rate by endpoint

**Estimated Impact**: Reduce bug resolution time by 70%, understand user behavior

#### 0.3 Auth Flow & Security Hardening
**Why**: Protect user data and provide proper onboarding

**Tasks:**
- [ ] Re-enable auth check in `mobile/app/index.tsx`
- [ ] Test complete auth flow: OTP → email verify → username → home
- [ ] Add rate limiting to OTP requests (prevent abuse)
- [ ] Implement session expiration handling (refresh tokens)
- [ ] Add email validation (prevent typos)
- [ ] Test auth edge cases (expired OTP, duplicate username, etc.)
- [ ] Audit all RLS policies for correctness
- [ ] Add service role key rotation process

**Files to Modify:**
- `mobile/app/index.tsx` (uncomment auth logic)
- `mobile/hooks/useAuth.ts` (add session refresh, rate limiting)
- `mobile/app/(auth)/sign-in.tsx` (add email validation)
- `supabase/migrations/20250101000001_rls_policies.sql` (audit)

**Security Checklist:**
- [ ] RLS enabled on all tables
- [ ] Service role key not exposed in mobile app
- [ ] User data properly isolated
- [ ] No SQL injection vectors
- [ ] No XSS vulnerabilities in user-generated content (usernames)

**Estimated Impact**: Essential for production, prevents security incidents

#### 0.4 App Store Deployment
**Why**: Make app available to real users

**Tasks:**
- [ ] Set up Expo Application Services (EAS) account
- [ ] Configure EAS Build for iOS and Android
- [ ] Create app store listings (screenshots, descriptions, keywords)
- [ ] Design app icon and splash screen (already in assets)
- [ ] Build iOS production app via EAS
- [ ] Build Android production app via EAS
- [ ] Submit iOS app to TestFlight
- [ ] Submit Android app to Google Play Internal Testing
- [ ] Recruit 10-20 beta testers
- [ ] Collect and triage beta feedback
- [ ] Fix P0/P1 bugs from beta
- [ ] Submit to App Store and Google Play for review

**Files to Create:**
- `mobile/eas.json` (build configuration)
- `mobile/app-store-assets/` (screenshots, descriptions)
- `BETA_TESTING_GUIDE.md`

**App Store Metadata:**
- **Name**: UFC Picks Tracker
- **Tagline**: Track Your UFC Prediction Accuracy
- **Description**: Make picks for UFC events and see how well you predict fight outcomes. Pure accuracy tracking with automatic grading from official UFC stats.
- **Keywords**: UFC, MMA, picks, predictions, accuracy, statistics, fight tracking
- **Category**: Sports
- **Age Rating**: 12+ (sports violence)

**Estimated Impact**: Required for public launch

#### 0.5 Performance Optimization
**Why**: Ensure smooth experience on mid-range devices

**Tasks:**
- [ ] Profile app performance on iOS simulator and Android emulator
- [ ] Optimize large components (pick.tsx = 440 lines)
- [ ] Add React.memo to prevent unnecessary re-renders
- [ ] Optimize image loading (lazy load fighter images when added)
- [ ] Reduce bundle size (analyze with Expo bundle analyzer)
- [ ] Test on physical devices (iPhone SE, mid-range Android)
- [ ] Optimize database queries (add EXPLAIN ANALYZE to slow queries)
- [ ] Add pagination to stats screen (if >100 events)

**Performance Targets:**
- App launch: <3s (cold start)
- Pick screen load: <1s
- Stats screen load: <2s
- Pick selection response: <100ms
- Bundle size: <10MB

**Estimated Impact**: Better user experience, lower churn

---

### Phase 1: Enhanced MVP (Post-Launch)

#### 1.1 Push Notifications
**Why**: #1 requested feature for engagement

**User Story**: As a user, I want to be reminded when an event is starting and when my picks are graded, so I don't miss deadlines and can celebrate my accuracy.

**Technical Approach:**
- Use Expo Notifications API
- Store notification tokens in `profiles` table
- Create Edge Function to send notifications via Expo Push Service
- Trigger notifications from GitHub Actions CRON jobs

**Notification Types:**
1. **24h Before Event**: "UFC 300 starts tomorrow! Make your picks now."
2. **2h Before Lock**: "Picks lock in 2 hours for UFC 300!"
3. **Event Graded**: "Your picks for UFC 300 have been graded. You went 8/12 (67%)!"
4. **New Streak**: "You're on a 5-event win streak! 🔥"

**Tasks:**
- [ ] Add `expo-notifications` dependency
- [ ] Add push notification permission request on first launch
- [ ] Create `notification_tokens` table in database
- [ ] Store token on permission grant
- [ ] Create Edge Function `send-notifications`
- [ ] Add notification scheduling to GitHub Actions
- [ ] Implement notification preferences (settings screen)
- [ ] Test on physical devices (push notifications don't work in simulator)

**Files to Create:**
- `mobile/hooks/useNotifications.ts`
- `mobile/lib/notifications.ts`
- `supabase/functions/send-notifications/index.ts`
- `supabase/migrations/20250105000000_add_notification_tokens.sql`

**Database Schema:**
```sql
CREATE TABLE notification_tokens (
  user_id UUID REFERENCES auth.users PRIMARY KEY,
  expo_push_token TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  preferences JSONB DEFAULT '{"event_reminder": true, "grade_complete": true, "streak_milestone": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Estimated Impact**: 30% increase in pick completion rate, 25% increase in retention

#### 1.2 Pick History & Detailed Results
**Why**: Users want to see their past predictions and learn from mistakes

**User Story**: As a user, I want to see all my past picks for an event, including which fighters I picked and whether I was right, so I can analyze my performance.

**Features:**
- View all past events with picks
- See correct vs incorrect picks with visual indicators
- Show fight results (winner, method, round)
- Filter by event, date range, accuracy
- Share results to social media

**UI Design:**
- Add "History" tab to bottom navigation
- List events in reverse chronological order
- Tap event to see detailed bout-by-bout breakdown
- Green checkmark for correct picks, red X for incorrect
- Show actual result below each bout

**Tasks:**
- [ ] Create new tab route: `mobile/app/(tabs)/history.tsx`
- [ ] Update tab layout to include History icon
- [ ] Create `usePickHistory` hook to fetch past events with picks
- [ ] Create `EventHistoryCard` component
- [ ] Create `DetailedResultsView` component
- [ ] Add filtering UI (date range, accuracy threshold)
- [ ] Add social sharing (Expo Sharing API)

**Files to Create:**
- `mobile/app/(tabs)/history.tsx`
- `mobile/hooks/usePickHistory.ts`
- `mobile/components/EventHistoryCard.tsx`
- `mobile/components/DetailedResultsView.tsx`

**Database Query:**
```sql
SELECT
  e.name,
  e.event_date,
  COUNT(p.id) as total_picks,
  COUNT(CASE WHEN p.score = 1 THEN 1 END) as correct_picks
FROM events e
JOIN picks p ON e.id = p.event_id
WHERE p.user_id = $1 AND e.status = 'completed'
GROUP BY e.id
ORDER BY e.event_date DESC;
```

**Estimated Impact**: 50% of users view history regularly, 15% share results

#### 1.3 Edit Picks Before Lock
**Why**: Users make mistakes or change their mind

**User Story**: As a user, I want to change my pick for a fight before the event starts, so I can correct mistakes or update based on new information.

**Current Limitation**: Picks can only be made once (UNIQUE constraint on user_id + bout_id)

**Solution**: Allow updates to `picked_corner` as long as event hasn't started

**Technical Changes:**
- Modify pick submission logic to UPSERT instead of INSERT
- Add "Change Pick" button on selected fighter
- Show visual indicator that pick was updated
- Track pick changes in `pick_history` table (optional, for analytics)

**Tasks:**
- [ ] Update `useQueries.ts` mutation to use UPSERT
- [ ] Add edit mode UI to Pick screen
- [ ] Show confirmation modal before changing pick
- [ ] Add "Last updated" timestamp to pick display
- [ ] (Optional) Create `pick_history` audit table

**Files to Modify:**
- `mobile/hooks/useQueries.ts` (change INSERT to UPSERT)
- `mobile/app/(tabs)/pick.tsx` (add edit UI)

**Database Change:**
```sql
ALTER TABLE picks ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();

CREATE TRIGGER update_picks_updated_at
BEFORE UPDATE ON picks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

**Estimated Impact**: Reduce user frustration, 20% of users edit at least 1 pick

#### 1.4 Fighter Statistics & Insights
**Why**: Help users make informed predictions

**User Story**: As a user, I want to see fighter statistics and recent performance when making picks, so I can make better predictions.

**Data to Display:**
- Fighter record (wins-losses-draws)
- Recent fight history (last 5 fights)
- Finish rate (KO/Sub %)
- Average fight time
- Win streak
- Ranking (if applicable)

**Data Source**: UFCStats.com (requires additional scraping)

**Technical Approach:**
- Create `fighters` table to store fighter profiles
- Add scraping function to fetch fighter details
- Show expandable fighter card on Pick screen
- Cache fighter data for 30 days

**Tasks:**
- [ ] Create `fighters` table schema
- [ ] Create Edge Function `sync-fighters` to scrape fighter profiles
- [ ] Update scraper to extract fighter IDs from bout pages
- [ ] Create `FighterStatsCard` component
- [ ] Add expand/collapse UI to Pick screen
- [ ] Implement caching strategy

**Files to Create:**
- `supabase/migrations/20250110000000_create_fighters_table.sql`
- `supabase/functions/sync-fighters/index.ts`
- `mobile/components/FighterStatsCard.tsx`

**Database Schema:**
```sql
CREATE TABLE fighters (
  ufcstats_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  record_wins INT,
  record_losses INT,
  record_draws INT,
  record_nc INT,
  height_cm INT,
  weight_lbs INT,
  reach_cm INT,
  stance TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE fighter_bouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fighter_id TEXT REFERENCES fighters,
  opponent_name TEXT,
  result TEXT, -- W, L, D, NC
  method TEXT,
  round INT,
  time TEXT,
  event_name TEXT,
  event_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Estimated Impact**: 40% of users expand fighter stats, 10% improvement in accuracy

#### 1.5 Improved Statistics Visualization
**Why**: Current stats are basic, users want more insights

**Features:**
- Accuracy by weight class (are you better at heavyweight or flyweight?)
- Accuracy by fight type (main card vs prelims)
- Monthly accuracy trend chart
- Head-to-head comparison with friends
- "You vs Community" average accuracy

**Visualizations:**
- Bar chart for accuracy by weight class
- Line chart for accuracy trend over time
- Comparison bars for you vs friends/community

**Technical Approach:**
- Use `react-native-chart-kit` or `victory-native` for charts
- Pre-calculate stats in `user_stats` table
- Add new database queries for segmented stats

**Tasks:**
- [ ] Add charting library dependency
- [ ] Create new stats queries (by weight class, by month)
- [ ] Create `AccuracyByWeightClass` component
- [ ] Create `AccuracyTrendChart` component
- [ ] Update Stats screen layout to include new charts
- [ ] Add filters and toggles

**Files to Create:**
- `mobile/components/AccuracyByWeightClass.tsx`
- `mobile/components/AccuracyTrendChart.tsx`
- `mobile/hooks/useAdvancedStats.ts`

**Estimated Impact**: Increased time spent on Stats screen, 15% increase in engagement

---

### Phase 2: Social & Engagement

#### 2.1 Friend System
**Why**: Core requirement for social competition

**User Story**: As a user, I want to add my friends who also use the app, so I can compare my accuracy with theirs.

**Features:**
- Add friend by username search
- Accept/decline friend requests
- View friends list
- Remove friends
- See friends' public stats (accuracy, streaks)

**Technical Approach:**
- Create `friendships` table (many-to-many with pending/accepted status)
- Create `friend_requests` table for pending invitations
- Add Friends tab or section in Profile screen

**Tasks:**
- [ ] Create `friendships` and `friend_requests` tables
- [ ] Create Edge Functions for friend operations
- [ ] Create Friends UI screen
- [ ] Add username search functionality
- [ ] Create friend request notification system
- [ ] Add RLS policies for friend data visibility

**Files to Create:**
- `supabase/migrations/20250115000000_create_friendships.sql`
- `mobile/app/(tabs)/friends.tsx` (or modal in profile)
- `mobile/hooks/useFriends.ts`
- `mobile/components/FriendRequestCard.tsx`
- `mobile/components/FriendsList.tsx`

**Database Schema:**
```sql
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  friend_id UUID REFERENCES auth.users NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

CREATE INDEX idx_friendships_user ON friendships(user_id, status);
CREATE INDEX idx_friendships_friend ON friendships(friend_id, status);
```

**Estimated Impact**: 40% of users add at least 1 friend, foundation for leagues

#### 2.2 Private Leagues
**Why**: Compete with specific groups (work, gym, family)

**User Story**: As a user, I want to create a private league and invite friends, so we can compete for the best accuracy in our group.

**Features:**
- Create league with name and description
- Generate invite code
- Join league via code
- View league leaderboard
- Leave league
- Admin can remove members

**League Types:**
- **Open**: Anyone can join via code
- **Invite-Only**: Admin must approve

**Technical Approach:**
- Create `leagues` table
- Create `league_memberships` junction table
- Create leaderboard view that ranks members by accuracy
- Generate unique 6-character invite codes

**Tasks:**
- [ ] Create `leagues` and `league_memberships` tables
- [ ] Create league management UI
- [ ] Generate and validate invite codes
- [ ] Create league leaderboard view
- [ ] Add league stats queries
- [ ] Implement admin controls

**Files to Create:**
- `supabase/migrations/20250120000000_create_leagues.sql`
- `mobile/app/league/[id].tsx` (dynamic route for league detail)
- `mobile/app/league/create.tsx`
- `mobile/app/league/join.tsx`
- `mobile/hooks/useLeagues.ts`
- `mobile/components/LeagueLeaderboard.tsx`

**Database Schema:**
```sql
CREATE TABLE leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  invite_code TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE league_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(league_id, user_id)
);

CREATE INDEX idx_league_memberships_league ON league_memberships(league_id);
CREATE INDEX idx_league_memberships_user ON league_memberships(user_id);
```

**Leaderboard Query:**
```sql
SELECT
  p.username,
  us.accuracy_pct,
  us.total_picks,
  us.current_streak,
  lm.joined_at
FROM league_memberships lm
JOIN profiles p ON lm.user_id = p.user_id
JOIN user_stats us ON lm.user_id = us.user_id
WHERE lm.league_id = $1
ORDER BY us.accuracy_pct DESC, us.total_picks DESC;
```

**Estimated Impact**: 25% of users create or join a league, 3x engagement increase

#### 2.3 Global Leaderboards
**Why**: Showcase top performers, drive competition

**User Story**: As a user, I want to see the global leaderboard to compare my accuracy with the best predictors.

**Leaderboard Types:**
- **Global**: All users, ranked by accuracy (min 50 picks)
- **Monthly**: Best accuracy in the last 30 days
- **Current Streak**: Longest active win streak
- **Friends**: Just your friends

**Technical Approach:**
- Create materialized view for global stats (refresh hourly)
- Add pagination to handle large datasets
- Cache leaderboards in React Query (stale time 1 hour)

**Tasks:**
- [ ] Create global leaderboard query with pagination
- [ ] Create Leaderboards screen
- [ ] Add filters (global, monthly, friends)
- [ ] Highlight current user's position
- [ ] Add pull-to-refresh
- [ ] Implement virtualized list for performance

**Files to Create:**
- `mobile/app/(tabs)/leaderboards.tsx`
- `mobile/hooks/useLeaderboards.ts`
- `mobile/components/LeaderboardRow.tsx`
- `supabase/migrations/20250125000000_create_leaderboard_views.sql`

**Database View:**
```sql
CREATE MATERIALIZED VIEW global_leaderboard AS
SELECT
  p.username,
  us.accuracy_pct,
  us.total_picks,
  us.current_streak,
  us.best_streak,
  RANK() OVER (ORDER BY us.accuracy_pct DESC, us.total_picks DESC) as rank
FROM user_stats us
JOIN profiles p ON us.user_id = p.user_id
WHERE us.total_picks >= 50
ORDER BY us.accuracy_pct DESC, us.total_picks DESC
LIMIT 1000;

CREATE INDEX idx_global_leaderboard_rank ON global_leaderboard(rank);

-- Refresh hourly via CRON
```

**Privacy Consideration**: Users can opt out of leaderboards in settings

**Estimated Impact**: 60% of users view leaderboards, increased competitive motivation

#### 2.4 Social Sharing
**Why**: Organic growth through user sharing

**User Story**: As a user, I want to share my accuracy stats or a great prediction streak to my social media, so I can brag to friends.

**Shareable Content:**
- "I went 10/12 (83%) on UFC 300!"
- "I'm on a 7-event win streak! 🔥"
- "I predicted every fight correctly on UFC 300! (rare badge)"
- League standings: "I'm #1 in the [League Name] league!"

**Share Formats:**
- Instagram Story (image with stats + app branding)
- Twitter/X (text + link)
- WhatsApp/iMessage (text)
- Custom share image with QR code to download app

**Technical Approach:**
- Use Expo Sharing API
- Generate share images dynamically with Canvas API
- Include app download link in share text
- Track shares via analytics

**Tasks:**
- [ ] Create share image generator (Canvas/SVG)
- [ ] Add share buttons to Stats, History, and Profile screens
- [ ] Implement Expo Sharing API
- [ ] Design share templates (Figma → React Native)
- [ ] Add referral tracking (optional)

**Files to Create:**
- `mobile/lib/shareImage.ts`
- `mobile/components/ShareButton.tsx`
- `mobile/assets/share-templates/` (design assets)

**Share Text Examples:**
```
I went 10/12 (83%) on UFC 300! Think you can beat me? Track your UFC picks with UFC Picks Tracker 🥊
[App Store Link]

🔥 7-event win streak! My UFC predictions are on fire.
Download UFC Picks Tracker to track your accuracy:
[App Store Link]
```

**Estimated Impact**: 10% of users share at least once, 5% user acquisition from shares

#### 2.5 Achievement System
**Why**: Gamification drives engagement and provides goals

**User Story**: As a user, I want to earn badges and achievements for hitting milestones, so I have goals to work toward beyond just accuracy.

**Achievement Categories:**

**Accuracy Achievements:**
- **Perfect Card**: Predict every fight correctly on a single event
- **Accuracy Tiers**: 50%, 60%, 70%, 80%, 90% lifetime accuracy
- **Volume Tiers**: 100 picks, 500 picks, 1000 picks, 5000 picks

**Streak Achievements:**
- **Hot Streak**: 3, 5, 10, 20, 50 event win streak
- **Comeback**: Go from negative streak to 5+ wins

**Engagement Achievements:**
- **Early Bird**: Make picks >24h before event
- **Completionist**: Make picks on every fight for 10 events
- **Year One**: Use app for 365 days

**Social Achievements:**
- **Social Butterfly**: Add 10 friends
- **League Leader**: #1 in a league for a month
- **Rivalry**: Beat a specific friend 5 events in a row

**Technical Approach:**
- Create `achievements` and `user_achievements` tables
- Check for achievement unlocks in grading Edge Function
- Show badge notification on unlock
- Display badges on Profile screen

**Tasks:**
- [ ] Define full achievement list (30-50 achievements)
- [ ] Create achievement system tables
- [ ] Implement achievement checking logic
- [ ] Design badge graphics
- [ ] Create achievement unlock animation
- [ ] Add achievements section to Profile screen

**Files to Create:**
- `supabase/migrations/20250130000000_create_achievements.sql`
- `supabase/functions/_shared/achievementChecker.ts`
- `mobile/app/achievements.tsx`
- `mobile/components/AchievementBadge.tsx`
- `mobile/components/AchievementUnlockModal.tsx`

**Database Schema:**
```sql
CREATE TABLE achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT CHECK (category IN ('accuracy', 'streak', 'engagement', 'social')),
  rarity TEXT CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  icon_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE user_achievements (
  user_id UUID REFERENCES auth.users,
  achievement_id TEXT REFERENCES achievements,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);
```

**Estimated Impact**: 70% of users unlock at least 1 achievement, 20% increase in retention

---

### Phase 3: Advanced Features

#### 3.1 Method & Round Prediction Scoring
**Why**: Add depth for advanced users

**User Story**: As an experienced user, I want to predict not just the winner but also the method and round, so I can prove I really know MMA.

**Prediction Types:**
- **Winner Only**: 1 point (current system)
- **Winner + Method**: 3 points (KO/TKO, Submission, Decision)
- **Winner + Method + Round**: 5 points (exact round)

**Scoring System:**
- Correct winner only: 1 point
- Correct winner + method: 3 points total
- Correct winner + method + round: 5 points total

**UI Changes:**
- Optional method/round selectors on Pick screen
- Show bonus points in stats
- New stat: "Perfect Picks" (method + round correct)

**Technical Changes:**
- Update `picks` table to use method/round fields
- Modify grading logic to check method and round
- Update stats calculation to include weighted scoring
- Add user preference to enable/disable advanced scoring

**Tasks:**
- [ ] Update database schema (method/round already in picks table)
- [ ] Add method/round UI to Pick screen
- [ ] Update grading Edge Function
- [ ] Add weighted scoring to stats calculation
- [ ] Create advanced stats view
- [ ] Add toggle in Settings for scoring mode

**Files to Modify:**
- `mobile/app/(tabs)/pick.tsx` (add method/round selectors)
- `supabase/functions/sync-recent-results-and-grade/index.ts`
- `mobile/hooks/useQueries.ts`

**Estimated Impact**: 40% of users enable advanced scoring, increased engagement

#### 3.2 Confidence-Weighted Picks
**Why**: Allow users to express pick confidence, adds strategy

**User Story**: As a user, I want to assign confidence levels to my picks, so I can score more points on the fights I'm most confident about.

**Confidence Levels:**
- **1x**: Normal confidence (1 point)
- **2x**: High confidence (2 points if correct, -1 if wrong)
- **3x**: Max confidence (3 points if correct, -2 if wrong)

**Rules:**
- Users get limited number of 2x and 3x picks per event
- Example: One 3x pick and two 2x picks per event

**UI Design:**
- Confidence slider or badge selector on Pick screen
- Visual indicator showing remaining multipliers
- Stats show "Confidence Accuracy" (did you use multipliers wisely?)

**Technical Approach:**
- Add `confidence_multiplier` column to picks table
- Add constraints to limit multiplier usage per event
- Update scoring logic
- Add new stats: confidence_correct, confidence_wrong

**Tasks:**
- [ ] Update picks table schema
- [ ] Add database constraints for multiplier limits
- [ ] Create confidence selector UI
- [ ] Update grading logic for weighted scoring
- [ ] Add confidence stats to Stats screen
- [ ] Add toggle to enable confidence mode

**Files to Create:**
- `supabase/migrations/20250205000000_add_confidence_picks.sql`
- `mobile/components/ConfidenceSelector.tsx`

**Database Schema:**
```sql
ALTER TABLE picks ADD COLUMN confidence_multiplier INT DEFAULT 1 CHECK (confidence_multiplier IN (1, 2, 3));

-- Constraint: Max one 3x and two 2x picks per event
CREATE OR REPLACE FUNCTION check_confidence_limits()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.confidence_multiplier = 3 THEN
    IF (SELECT COUNT(*) FROM picks WHERE user_id = NEW.user_id AND event_id = NEW.event_id AND confidence_multiplier = 3) >= 1 THEN
      RAISE EXCEPTION 'Maximum one 3x confidence pick per event';
    END IF;
  ELSIF NEW.confidence_multiplier = 2 THEN
    IF (SELECT COUNT(*) FROM picks WHERE user_id = NEW.user_id AND event_id = NEW.event_id AND confidence_multiplier = 2) >= 2 THEN
      RAISE EXCEPTION 'Maximum two 2x confidence picks per event';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER confidence_limit_check
BEFORE INSERT OR UPDATE ON picks
FOR EACH ROW
EXECUTE FUNCTION check_confidence_limits();
```

**Estimated Impact**: 35% of users try confidence picks, adds strategic depth

#### 3.3 Multi-Organization Support
**Why**: Expand to other MMA promotions (Bellator, PFL, ONE Championship)

**User Story**: As a hardcore MMA fan, I want to track my predictions for Bellator and PFL events, not just UFC.

**Organizations to Add:**
1. **Bellator MMA** (bellator.com stats)
2. **PFL** (Professional Fighters League)
3. **ONE Championship**

**Technical Challenges:**
- Different stats websites with different HTML structures
- Different event schedules
- Different weight classes
- Parsing variations

**Technical Approach:**
- Create organization-agnostic data model
- Add `organization` column to events/bouts
- Create separate scrapers for each organization
- Add organization filter to Home/Pick screens

**Tasks:**
- [ ] Add `organization` enum to database
- [ ] Update database schema to support multiple orgs
- [ ] Research Bellator/PFL/ONE stats websites
- [ ] Create Bellator scraper
- [ ] Create PFL scraper
- [ ] Create ONE Championship scraper
- [ ] Add organization filter UI
- [ ] Update Edge Functions for multi-org support
- [ ] Add organization icons and branding

**Files to Create:**
- `supabase/functions/_shared/bellator-scraper.ts`
- `supabase/functions/_shared/pfl-scraper.ts`
- `supabase/functions/_shared/one-scraper.ts`
- `mobile/components/OrganizationFilter.tsx`

**Database Schema:**
```sql
ALTER TABLE events ADD COLUMN organization TEXT DEFAULT 'UFC' CHECK (organization IN ('UFC', 'Bellator', 'PFL', 'ONE'));

CREATE INDEX idx_events_organization_date ON events(organization, event_date DESC);
```

**Estimated Impact**: 15% of users enable non-UFC orgs, differentiation from competitors

#### 3.4 Pick Insights & Fighter Analytics
**Why**: Help users make informed decisions with data

**User Story**: As a user, I want to see detailed fighter statistics and AI-generated insights, so I can make better picks.

**Insights to Provide:**
- **Fighter Head-to-Head**: Historical matchups (if exists)
- **Recent Form**: Last 5 fights, win/loss trend
- **Style Matchup**: Striker vs Grappler analysis
- **Tale of the Tape**: Height, reach, age comparison
- **Finish Rate**: % of wins by KO/Sub vs Decision
- **Home/Away Performance**: Performance in specific locations
- **AI Pick Suggestion**: "Based on stats, Red Corner favored 65%"

**Data Sources:**
- UFCStats.com (already scraped)
- Sherdog.com (optional secondary source)
- Community pick trends (what % picked red vs blue)

**Technical Approach:**
- Expand fighter scraping to include detailed stats
- Use simple heuristics for pick suggestions (no ML needed initially)
- Show community pick percentages
- Create detailed insight cards

**Tasks:**
- [ ] Expand fighter data model
- [ ] Scrape fighter fight history and stats
- [ ] Create heuristic-based pick suggestion algorithm
- [ ] Track community pick trends
- [ ] Create FighterInsightCard component
- [ ] Add toggle to show/hide insights

**Files to Create:**
- `mobile/components/FighterInsightCard.tsx`
- `mobile/components/CommunityPickTrend.tsx`
- `supabase/functions/_shared/pickSuggestions.ts`

**Algorithm Example (Simple):**
```typescript
function calculateFightFavorite(fighter1: Fighter, fighter2: Fighter): number {
  let score = 0;

  // Win rate
  const f1WinRate = fighter1.wins / (fighter1.wins + fighter1.losses);
  const f2WinRate = fighter2.wins / (fighter2.wins + fighter2.losses);
  score += (f1WinRate - f2WinRate) * 40;

  // Recent form (last 3 fights)
  score += (fighter1.recentWins - fighter2.recentWins) * 10;

  // Finish rate
  score += (fighter1.finishRate - fighter2.finishRate) * 20;

  // Normalize to 0-100 (50 = toss-up)
  return Math.max(0, Math.min(100, 50 + score));
}
```

**Estimated Impact**: 50% of users view insights, 8% improvement in accuracy

#### 3.5 Parlay Challenges
**Why**: Add high-risk, high-reward challenges

**User Story**: As a user, I want to attempt to predict an entire event card perfectly, so I can earn special achievements and bragging rights.

**Challenge Types:**
- **Perfect Card**: Predict every fight correctly (extremely rare)
- **Main Card Perfect**: Predict all main card fights correctly
- **Underdog Parlay**: Pick 3 underdogs and get them all right

**Rewards:**
- Legendary badges
- Leaderboard placement
- Social share templates
- In-app celebration animation

**Technical Approach:**
- Track parlay attempts in separate table
- Check for completion after grading
- Award special achievements
- Create parlay leaderboard

**Tasks:**
- [ ] Create `parlay_challenges` table
- [ ] Add parlay tracking logic to grading function
- [ ] Create parlay achievement badges
- [ ] Add parlay stats to Profile screen
- [ ] Create Parlay Leaderboard

**Files to Create:**
- `supabase/migrations/20250215000000_create_parlay_challenges.sql`
- `mobile/app/parlays.tsx`
- `mobile/components/ParlayCard.tsx`

**Estimated Impact**: 5% of users complete a parlay, viral sharing potential

---

### Phase 4: Growth & Scale

#### 4.1 Referral Program
**Why**: User acquisition through word-of-mouth

**Features:**
- Unique referral code per user
- Reward for referrer and referee (premium features, badges)
- Track referral stats
- Leaderboard for most referrals

**Rewards:**
- Referrer: 1 month of premium features
- Referee: Welcome bonus (e.g., 2x confidence picks unlocked early)

**Tasks:**
- [ ] Generate unique referral codes
- [ ] Create referral tracking system
- [ ] Implement reward distribution
- [ ] Add referral section to Profile screen

**Estimated Impact**: 15% organic growth rate

#### 4.2 Premium Subscription (Optional)
**Why**: Monetization to support development

**Premium Features ($2.99/month):**
- Unlimited confidence picks
- Advanced stats and insights
- AI pick suggestions
- Ad-free experience
- Custom profile themes
- Early access to new features

**Technical Approach:**
- Integrate RevenueCat for subscription management
- Add feature flags for premium users
- Paywall for premium features

**Tasks:**
- [ ] Integrate RevenueCat SDK
- [ ] Create subscription UI
- [ ] Implement feature gates
- [ ] Add App Store/Play Store subscriptions

**Estimated Impact**: 5-10% conversion to premium

#### 4.3 Web App
**Why**: Reach desktop users and improve SEO

**Features:**
- Responsive web version at ufcpickstracker.com
- Same functionality as mobile app
- Better for viewing stats and history on desktop

**Technical Approach:**
- Expo supports web builds
- Deploy to Vercel or Netlify
- Share codebase with mobile app

**Tasks:**
- [ ] Configure Expo for web
- [ ] Optimize UI for desktop/tablet
- [ ] Deploy to custom domain
- [ ] Add SEO metadata

**Estimated Impact**: 30% more users, better discoverability

#### 4.4 Community Features
**Why**: Build engaged community

**Features:**
- Discussion forum for fight predictions
- Event watch parties (virtual or local)
- User-generated content (fight breakdowns, tips)
- Weekly pick challenges

**Technical Approach:**
- Integrate with existing community platforms (Discord, Reddit)
- Or build in-app forum

**Tasks:**
- [ ] Research community platform options
- [ ] Create Discord server or in-app forum
- [ ] Moderate community
- [ ] Host weekly challenges

**Estimated Impact**: Stronger community, increased retention

---

## Technical Debt to Address

### High Priority 🔴

1. **Authentication Flow**
   - Re-enable auth check in index.tsx
   - Fix: 1 file modification, 15 minutes

2. **Testing Coverage**
   - Add unit tests for critical paths
   - Fix: 2-3 days for comprehensive suite

3. **Error Tracking**
   - Integrate Sentry
   - Fix: 1 day setup + configuration

4. **Monitoring & Analytics**
   - Add custom event tracking
   - Fix: 1-2 days

5. **Database Query Optimization**
   - Add EXPLAIN ANALYZE to identify slow queries
   - Add missing indexes
   - Fix: 1 day

### Medium Priority 🟡

1. **Code Organization**
   - Split large components (pick.tsx = 440 lines)
   - Extract reusable utilities
   - Fix: 2 days refactoring

2. **Offline Detection**
   - Fix false positives in simulator
   - Re-enable OfflineBanner
   - Fix: 4 hours

3. **Edge Case Handling**
   - Fighter name changes
   - Event rescheduling
   - Bout replacements
   - Fix: 2 days

4. **Logging**
   - Replace console.log with structured logging
   - Fix: 1 day

### Low Priority 🟢

1. **Documentation**
   - Add JSDoc comments to all functions
   - Create API documentation
   - Fix: 3 days

2. **Linting & Pre-commit Hooks**
   - Add ESLint configuration
   - Add Prettier
   - Add Husky pre-commit hooks
   - Fix: 1 day

3. **Accessibility**
   - Add screen reader support
   - Add accessibility labels
   - Fix: 2 days

---

## Success Metrics & KPIs

### User Acquisition
- **Target**: 1,000 users in first 3 months
- **Target**: 10,000 users in first year
- **Metric**: Daily new sign-ups
- **Source**: Analytics dashboard

### Engagement
- **Target**: 60% of users make picks on each event
- **Target**: 40% weekly active users (WAU)
- **Target**: 3+ picks per user per event
- **Metric**: Pick completion rate, WAU/MAU ratio
- **Source**: Database queries

### Retention
- **Target**: 40% Day 7 retention
- **Target**: 25% Day 30 retention
- **Target**: 60% Month 2 retention
- **Metric**: Cohort retention analysis
- **Source**: Analytics platform

### Social
- **Target**: 30% of users add friends
- **Target**: 20% of users join leagues
- **Target**: 10% of users share to social media
- **Metric**: Friend connections, league memberships, shares
- **Source**: Database + analytics

### Quality
- **Target**: <1% crash rate
- **Target**: 99.5% API success rate
- **Target**: <3s app launch time (p95)
- **Metric**: Crash-free sessions, API error rate, performance monitoring
- **Source**: Sentry, Supabase logs

### Data Pipeline
- **Target**: 99% scraper success rate
- **Target**: 95% of events graded within 6 hours
- **Target**: Zero data loss incidents
- **Metric**: Edge Function logs, grading latency
- **Source**: GitHub Actions logs, database audits

---

## Risk Assessment & Mitigation

### Technical Risks

**1. UFCStats.com Scraper Breakage (High Probability, High Impact)**
- **Risk**: HTML structure changes break scraper
- **Mitigation**:
  - Add automated scraper health checks
  - Alert on scraping failures
  - Maintain backup data source
  - Add HTML structure tests
  - Keep UFCSTATS_DATA_STRUCTURE.md updated

**2. Database Performance Degradation (Medium Probability, High Impact)**
- **Risk**: Slow queries as data grows
- **Mitigation**:
  - Add indexes proactively
  - Use materialized views for leaderboards
  - Implement query monitoring
  - Paginate large datasets

**3. Expo/React Native Breaking Changes (Low Probability, Medium Impact)**
- **Risk**: SDK updates break app
- **Mitigation**:
  - Pin dependency versions
  - Test updates in staging environment
  - Gradual rollout of updates

**4. Third-Party Service Outages (Medium Probability, Medium Impact)**
- **Risk**: Supabase, Expo services down
- **Mitigation**:
  - Monitor service status
  - Implement graceful degradation
  - Cache data locally
  - Have incident response plan

### Product Risks

**1. Low User Adoption (Medium Probability, High Impact)**
- **Risk**: Not enough users to sustain engagement
- **Mitigation**:
  - Focus on quality over quantity
  - Build referral program
  - Partner with MMA communities
  - Content marketing strategy

**2. Competing Apps (High Probability, Medium Impact)**
- **Risk**: Existing or new competitors
- **Mitigation**:
  - Differentiate with unique features
  - Focus on UX excellence
  - Build community moat
  - Move fast on feature development

**3. User Churn (Medium Probability, High Impact)**
- **Risk**: Users stop using app after initial try
- **Mitigation**:
  - Push notifications for re-engagement
  - Social features (friends, leagues)
  - Achievement system for goals
  - Regular content updates

### Legal/Compliance Risks

**1. Data Privacy (Low Probability, High Impact)**
- **Risk**: GDPR/CCPA compliance issues
- **Mitigation**:
  - Privacy policy drafted
  - Data deletion on request
  - Transparent data usage
  - Audit data handling

**2. Terms of Service from UFCStats (Low Probability, Medium Impact)**
- **Risk**: Scraping disallowed by TOS
- **Mitigation**:
  - Review TOS carefully
  - Respect robots.txt
  - Rate limit requests
  - Have alternative data source ready

**3. Trademark Issues (Low Probability, Low Impact)**
- **Risk**: "UFC" trademark concerns
- **Mitigation**:
  - App clearly marked as unofficial
  - Not using UFC logo
  - Educational/fan use defense

---

## Resource Requirements

### Development Team (Current: Solo Developer)

**Phase 0 (Production Launch):**
- 1 developer (current)
- Consider: 1 QA/tester for beta

**Phase 1 (Enhanced MVP):**
- 1 developer (current)
- Consider: 1 designer for graphics/badges

**Phase 2 (Social Features):**
- 1 developer (current)
- Consider: 1 backend specialist for scaling

**Phase 3+ (Advanced Features):**
- 1-2 developers
- 1 designer
- 1 community manager (part-time)

### Infrastructure Costs

**Current Costs:**
- Supabase Free Tier: $0/month (500MB database, 2GB storage)
- GitHub Free Tier: $0/month
- Expo Free Tier: $0/month

**Estimated Costs at 1,000 Users:**
- Supabase Pro: $25/month (8GB database, 100GB storage)
- Sentry Free Tier: $0/month (5K errors/month)
- Total: ~$25/month

**Estimated Costs at 10,000 Users:**
- Supabase Pro: $25/month (may need Team at $599/month)
- Sentry Team: $26/month (50K errors/month)
- Domain + Hosting: $10/month
- Total: ~$60-$635/month

**Estimated Costs at 100,000 Users:**
- Supabase Team/Enterprise: $599+/month
- Sentry Business: $80+/month
- CDN: $50+/month
- Total: ~$730+/month

### App Store Fees

- Apple Developer Program: $99/year
- Google Play Developer: $25 one-time
- Total: $124 first year, $99/year after

---

## Decision Framework

### Feature Prioritization Matrix

**Score = (User Value × Engagement Impact) / (Development Effort × Risk)**

| Feature | User Value (1-10) | Engagement Impact (1-10) | Dev Effort (1-10) | Risk (1-10) | Score | Priority |
|---------|-------------------|--------------------------|-------------------|-------------|-------|----------|
| Push Notifications | 9 | 10 | 4 | 3 | 7.5 | HIGH |
| Pick History | 8 | 6 | 3 | 2 | 8.0 | HIGH |
| Friends System | 7 | 9 | 6 | 4 | 2.6 | MEDIUM |
| Leagues | 8 | 10 | 7 | 5 | 2.3 | MEDIUM |
| Fighter Stats | 7 | 5 | 8 | 6 | 0.7 | LOW |
| Method/Round Scoring | 6 | 7 | 5 | 3 | 2.8 | MEDIUM |
| Multi-Org Support | 5 | 4 | 9 | 8 | 0.3 | LOW |
| Web App | 6 | 3 | 7 | 4 | 0.6 | LOW |

### When to Build vs When to Wait

**Build Now If:**
- ✅ Required for production launch (auth, testing, monitoring)
- ✅ High user value + low effort (push notifications, pick history)
- ✅ Foundation for future features (friends → leagues → leaderboards)
- ✅ Competitive differentiation (unique to this app)

**Wait If:**
- ❌ High effort with unclear user demand (multi-org support)
- ❌ Can be validated cheaply first (manual community before in-app forum)
- ❌ Depends on user scale (leaderboards need users first)
- ❌ Nice-to-have vs must-have (profile themes, custom badges)

---

## Recommended Execution Order

### Sprint 0: Production Launch (Critical)
1. Re-enable auth flow
2. Add testing suite (critical paths only)
3. Integrate Sentry and analytics
4. Build iOS/Android apps via EAS
5. Beta test with 10-20 users
6. Fix critical bugs
7. Submit to app stores
8. Launch! 🚀

### Sprint 1: Post-Launch Improvements
1. Push notifications
2. Pick history and detailed results
3. Edit picks before lock
4. Performance optimizations
5. Bug fixes from user feedback

### Sprint 2: Social Foundation
1. Friend system
2. Basic leaderboards (global, friends)
3. Social sharing

### Sprint 3: Engagement Boost
1. Private leagues
2. Achievement system
3. Improved stats visualization

### Sprint 4+: Advanced Features (Prioritize Based on User Feedback)
1. Method/round scoring
2. Confidence picks
3. Fighter statistics
4. Pick insights

### Future: Scale & Monetization
1. Web app
2. Premium subscription
3. Multi-organization support
4. Referral program

---

## Conclusion

The UFC Picks Tracker is in an excellent position to launch. The MVP is feature-complete with solid technical foundations. The immediate focus should be on **production readiness** (testing, monitoring, auth), followed by **high-value engagement features** (push notifications, pick history, social features).

The roadmap balances quick wins (push notifications, pick history) with long-term strategic features (leagues, achievements) while maintaining technical excellence (testing, monitoring, performance).

**Next Immediate Actions:**
1. Re-enable auth flow and test thoroughly
2. Set up Sentry and analytics tracking
3. Add critical path tests
4. Build beta apps and recruit testers
5. Fix bugs and prepare for app store submission

The app has strong potential in the MMA fan community. Success depends on consistent execution, user feedback incorporation, and maintaining the core value proposition: **simple, accurate UFC prediction tracking**.

---

**Document Version**: 1.0
**Last Updated**: 2025-12-30
**Owner**: Development Team
**Next Review**: After Production Launch
