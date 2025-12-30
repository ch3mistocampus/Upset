# Production Readiness Checklist

**Status**: Pre-Production
**Last Updated**: 2025-12-30
**Target**: Technical Production Ready (not app store launch)

---

## Current Features Implementation Status

### ✅ Core Features (Fully Implemented)

#### Mobile App Features
- **Home Screen**
  - ✅ Display next upcoming event with countdown
  - ✅ Show picks progress (X/Y fights)
  - ✅ Last event summary card
  - ✅ Pull-to-refresh functionality
  - ✅ Loading states with skeleton screens
  - ✅ Error handling with retry

- **Pick Screen**
  - ✅ List all bouts for upcoming event
  - ✅ Interactive fighter selection with animations
  - ✅ Haptic feedback on selection
  - ✅ Visual indicators (checkmarks, corner colors)
  - ✅ Auto-save picks (no confirmation needed)
  - ✅ Lock countdown timer
  - ✅ Read-only mode after event start
  - ✅ Show canceled/voided fights

- **Stats Screen**
  - ✅ Circular accuracy percentage visualization
  - ✅ Total picks and correct picks counters
  - ✅ Current win streak display
  - ✅ Best streak (personal record)
  - ✅ Last 5 events breakdown with mini charts
  - ✅ Pull-to-refresh

- **Profile Screen**
  - ✅ Username and email display
  - ✅ Quick stats summary
  - ✅ Sign out functionality
  - ✅ Settings navigation

- **Settings Screen**
  - ✅ Sign out button
  - ✅ Push notifications toggle (UI only, not functional)
  - ✅ Privacy policy link placeholder
  - ✅ About section

- **Authentication**
  - ✅ Email OTP sign-in flow
  - ✅ Email verification
  - ✅ Username creation with validation
  - ✅ Unique username enforcement
  - ✅ Session persistence via AsyncStorage
  - ⚠️ **Currently bypassed in development** (see below)

#### Backend Features
- **Database Schema**
  - ✅ 6 tables: profiles, events, bouts, results, picks, user_stats
  - ✅ Row-Level Security (RLS) policies
  - ✅ Pick locking via database trigger
  - ✅ Automated stats calculation
  - ✅ Foreign key constraints and cascades
  - ✅ Indexes on frequently queried columns

- **Edge Functions (Supabase Deno)**
  - ✅ `sync-events`: Scrape all UFC events daily
  - ✅ `sync-next-event-card`: Scrape upcoming event fights daily
  - ✅ `sync-recent-results-and-grade`: Grade picks every 6 hours
  - ✅ Rate limiting and retry logic
  - ✅ Defensive parsing (never overwrite on parse failure)
  - ✅ Error logging

- **Data Pipeline**
  - ✅ GitHub Actions CRON jobs scheduled
  - ✅ UFCStats.com web scraping with Cheerio
  - ✅ Automatic pick grading
  - ✅ Stats recalculation on grading

- **UX/UI Polish**
  - ✅ Dark theme with UFC red accents
  - ✅ Spring animations and transitions
  - ✅ Loading skeletons
  - ✅ Error states with retry buttons
  - ✅ Empty states
  - ✅ Toast notifications

---

## ⚠️ Critical Production Gaps

### 1. Authentication (CRITICAL)

**Current State**: Auth flow is completely bypassed in `mobile/app/index.tsx`

**Issues**:
- Line 12 in `index.tsx`: `return <Redirect href="/(tabs)/home" />;` skips all auth
- Anyone can access the app without signing in
- No user isolation in current development mode
- Production database has RLS but app isn't using it

**What's Needed**:
- [ ] Uncomment auth flow in `index.tsx` (lines 14-34)
- [ ] Test complete flow: OTP → email verify → username → home
- [ ] Add session refresh logic for token expiration
- [ ] Add email validation (prevent typos like "test@gmial.com")
- [ ] Add rate limiting to OTP requests (prevent abuse)
- [ ] Test auth edge cases:
  - Expired OTP codes
  - Duplicate username attempts
  - Network failures during auth
  - Session expiration handling

**Files to Modify**:
- `mobile/app/index.tsx` (uncomment existing code)
- `mobile/hooks/useAuth.ts` (add session refresh)
- `mobile/app/(auth)/sign-in.tsx` (add email validation)

---

### 2. Testing (CRITICAL)

**Current State**: Zero tests. No testing infrastructure.

**Issues**:
- No Jest configuration
- No React Native Testing Library
- No test files anywhere (checked: 0 .test.ts or .spec.ts files)
- Cannot verify code works after changes
- High risk of regressions

**What's Needed**:

#### Testing Infrastructure
- [ ] Install Jest and React Native Testing Library
- [ ] Create `mobile/jest.config.js`
- [ ] Create `mobile/jest.setup.js`
- [ ] Add test scripts to `package.json`
- [ ] Configure TypeScript for tests

#### Unit Tests (High Priority)
- [ ] `mobile/__tests__/hooks/useAuth.test.ts`
  - Test OTP sign-in flow
  - Test OTP verification
  - Test profile creation
  - Test sign out
  - Test session loading

- [ ] `mobile/__tests__/hooks/useQueries.test.ts`
  - Test data fetching hooks
  - Test mutation hooks (makePick)
  - Test error handling
  - Test loading states

#### Component Tests (Medium Priority)
- [ ] `mobile/__tests__/screens/pick.test.tsx`
  - Test fighter selection
  - Test pick saving
  - Test locked state (after event start)
  - Test loading and error states

- [ ] `mobile/__tests__/components/AccuracyRing.test.tsx`
- [ ] `mobile/__tests__/components/Toast.test.tsx`

#### Integration Tests (High Priority)
- [ ] `mobile/__tests__/integration/auth-flow.test.ts`
  - Full auth flow from OTP to home screen
  - Test auth persistence

- [ ] `mobile/__tests__/integration/pick-flow.test.ts`
  - Make pick → pick locks → pick graded → stats updated

#### CI/CD
- [ ] `.github/workflows/test.yml`
  - Run tests on every PR
  - Run tests on push to main
  - Fail build if tests don't pass
  - Report coverage

**Dependencies to Add**:
```json
"devDependencies": {
  "@testing-library/react-native": "^12.0.0",
  "@testing-library/jest-native": "^5.4.0",
  "jest": "^29.0.0",
  "jest-expo": "^51.0.0",
  "@types/jest": "^29.0.0"
}
```

**Target Coverage**: 60% minimum on critical paths (auth, picks, grading)

---

### 3. Monitoring & Observability (CRITICAL)

**Current State**: No error tracking, no structured logging, no analytics

**Issues**:
- 106 instances of `console.log/error/warn` across codebase
- No way to know if app crashes in production
- No visibility into Edge Function failures
- No user behavior tracking
- No performance metrics

**What's Needed**:

#### Error Tracking
- [ ] **Sentry for Mobile App**
  - Install `@sentry/react-native`
  - Configure DSN and environment
  - Create `mobile/lib/sentry.ts`
  - Wrap app with Sentry ErrorBoundary
  - Test error reporting

- [ ] **Sentry for Edge Functions**
  - Install `@sentry/deno` in Edge Functions
  - Create `supabase/functions/_shared/sentry.ts`
  - Add error capture to all Edge Functions
  - Test error reporting

#### Structured Logging
- [ ] **Replace console.log in Edge Functions**
  - Create `supabase/functions/_shared/logger.ts`
  - Structured JSON logs with levels (INFO, WARN, ERROR)
  - Include context (function name, event ID, user ID)
  - Replace all 31 console.log instances in Edge Functions

Example:
```typescript
// Before
console.log('Scraped events:', events.length);

// After
logger.info('events_scraped', { count: events.length, source: 'ufcstats' });
```

#### Analytics
- [ ] **Custom Event Tracking**
  - Create `mobile/lib/analytics.ts`
  - Track key events:
    - `user_signed_up`
    - `pick_made` (with event_id, bout_id)
    - `event_locked` (picks finalized)
    - `picks_graded` (event_id, accuracy)
    - `stats_viewed`
    - `profile_viewed`
  - Use simple analytics (Supabase table or PostHog/Amplitude)

- [ ] **User Funnels**
  - Sign-up → create username → make first pick
  - View event → make picks → view stats after grading
  - Track drop-off at each step

#### Monitoring Dashboard
- [ ] **Key Metrics to Track**
  - Daily Active Users (DAU)
  - Picks per event
  - Pick completion rate (% of users who pick on events)
  - Auth success rate
  - Scraper success rate (events, cards, results)
  - Grading success rate (% of picks graded)
  - App crash rate
  - API error rate by endpoint
  - Database query performance (p50, p95, p99)

- [ ] **Alerts**
  - Scraper fails 2+ times in a row → alert
  - Grading fails → alert
  - Crash rate >1% → alert
  - API error rate >5% → alert

**Tools to Consider**:
- Sentry (error tracking) - Free tier: 5K events/month
- PostHog (analytics) - Free tier: 1M events/month
- Supabase Dashboard (database metrics)
- Grafana + Prometheus (optional, advanced)

---

### 4. Edge Case Handling (HIGH PRIORITY)

**Current State**: Some edge cases not handled

**Issues**:

#### Fighter Name Changes
- **Problem**: Fighter legally changes name or UFC uses different name
- **Impact**: Picks might not match results
- **Solution Needed**:
  - Track fighter by `ufcstats_id` not name
  - Add `previous_names` array to fighters table (future)
  - Alert if name changes detected

#### Event Rescheduling
- **Problem**: Event postponed or moved to different date
- **Impact**: Picks might lock at wrong time
- **Current Behavior**: `event_date` is updated by scraper, but picks already made might be orphaned
- **Solution Needed**:
  - Detect date changes in scraper
  - Log warning if event_date changes >24 hours
  - Add `rescheduled` flag to events
  - Optionally: unlock picks if event rescheduled

#### Bout Replacements
- **Problem**: Fighter pulls out, replacement fighter steps in
- **Impact**: Users picked original fighter, now bout is different
- **Current Behavior**: `card_snapshot` increments, but picks aren't voided
- **Solution Needed**:
  - Detect fighter changes in scraper
  - Void picks for changed bouts
  - Notify users of card changes

#### Scraper Partial Failures
- **Problem**: Scraper gets 50% through event card, then fails
- **Impact**: Database has incomplete data
- **Current Behavior**: Defensive parsing prevents overwrite, but data is stale
- **Solution Needed**:
  - Use database transactions for scraper updates
  - Rollback on failure
  - Add `last_sync_status` (success, partial, failed)
  - Retry logic with exponential backoff

#### Network Failures During Pick Submission
- **Problem**: User picks fighter, network fails, pick not saved
- **Impact**: User thinks they picked, but didn't
- **Current Behavior**: React Query has retry logic
- **Solution Needed**:
  - Show clear error message
  - Add retry button
  - Add local optimistic updates with rollback

**Files to Modify**:
- `supabase/functions/sync-next-event-card/index.ts` (detect changes)
- `supabase/functions/sync-recent-results-and-grade/index.ts` (void changed bouts)
- `mobile/hooks/useQueries.ts` (optimistic updates)

---

### 5. Security Hardening (HIGH PRIORITY)

**Current State**: Basic security in place, needs hardening

**What's Needed**:

#### RLS Policy Audit
- [ ] Verify all tables have RLS enabled
- [ ] Test RLS policies with multiple users
- [ ] Ensure users can only read/write their own data
- [ ] Verify service role key is NEVER exposed in mobile app
- [ ] Check for SQL injection vectors (none expected with Supabase, but verify)

#### Auth Security
- [ ] Add rate limiting to OTP requests (prevent spam)
- [ ] Add CAPTCHA if needed (prevent bots)
- [ ] Implement session expiration (refresh tokens)
- [ ] Test session hijacking scenarios
- [ ] Ensure email verification works

#### Data Validation
- [ ] Validate username on client AND server (3-30 chars, alphanumeric + underscore)
- [ ] Prevent XSS in usernames (sanitize input)
- [ ] Validate bout_id and event_id on pick submission
- [ ] Prevent users from picking on locked events (database trigger exists, verify)

#### Service Role Key Security
- [ ] Verify service role key only used in Edge Functions (never mobile)
- [ ] Rotate service role key periodically
- [ ] Use GitHub Secrets for CI/CD (already done)
- [ ] Never log sensitive keys

**Security Checklist**:
```
✅ RLS enabled on all tables
✅ Service role key not in mobile app
❌ Rate limiting on auth endpoints
❌ Session refresh token logic
❌ Input validation on all user input
❌ Key rotation process documented
```

---

### 6. Performance Optimization (MEDIUM PRIORITY)

**Current State**: App works but performance not measured

**What's Needed**:

#### App Performance
- [ ] Profile app on iOS simulator (Instruments)
- [ ] Profile app on Android emulator (Android Profiler)
- [ ] Test on physical devices (iPhone SE, mid-range Android)
- [ ] Measure app launch time (target: <3s cold start)
- [ ] Measure Pick screen load time (target: <1s)
- [ ] Measure Stats screen load time (target: <2s)
- [ ] Optimize large components (pick.tsx = 440 lines)
  - Extract sub-components
  - Add React.memo to prevent re-renders
  - Use useCallback for event handlers

#### Database Performance
- [ ] Run EXPLAIN ANALYZE on common queries
- [ ] Add missing indexes (check query plans)
- [ ] Optimize stats calculation (currently recalculates all picks)
- [ ] Consider materialized views for leaderboards (future)
- [ ] Add pagination if >100 events (future)

#### Bundle Size
- [ ] Analyze bundle with Expo bundle analyzer
- [ ] Target: <10MB app size
- [ ] Remove unused dependencies
- [ ] Lazy load screens if needed

#### Network Performance
- [ ] Verify React Query cache settings (staleTime: 5min, gcTime: 10min)
- [ ] Test offline behavior
- [ ] Optimize image loading (when fighter images added)
- [ ] Compress API responses if needed

**Performance Targets**:
```
App Launch: <3s (cold start)
Pick Screen Load: <1s
Stats Screen Load: <2s
Pick Selection Response: <100ms
Bundle Size: <10MB
API Success Rate: >99%
Database Query Time: <100ms (p95)
```

---

### 7. Code Quality & Developer Experience (LOW PRIORITY)

**Current State**: Good TypeScript, but missing tooling

**What's Needed**:

#### Linting & Formatting
- [ ] Add ESLint configuration
  - Install `eslint` and `@typescript-eslint/parser`
  - Create `.eslintrc.js`
  - Add rules for React, React Native, TypeScript
  - Fix existing lint errors

- [ ] Add Prettier configuration
  - Install `prettier`
  - Create `.prettierrc`
  - Set consistent formatting rules
  - Format all existing files

- [ ] Add Pre-commit Hooks
  - Install Husky
  - Add `pre-commit` hook to run linter
  - Add `pre-commit` hook to run tests
  - Prevent committing bad code

#### Code Organization
- [ ] Refactor large components
  - `pick.tsx` (440 lines) → extract FightCard component
  - `home.tsx` (374 lines) → extract EventCard component
  - `stats.tsx` (338 lines) → extract StatCard component

- [ ] Create shared utilities
  - `mobile/lib/utils.ts` (common helpers)
  - `mobile/lib/constants.ts` (colors, sizes, etc.)
  - `mobile/lib/formatters.ts` (date, percentage formatting)

- [ ] Improve type organization
  - Move database types to separate files
  - Create UI component prop types
  - Add JSDoc comments to complex types

#### Documentation
- [ ] Add JSDoc comments to all exported functions
- [ ] Document complex algorithms (stats calculation, scraper logic)
- [ ] Create API documentation for Edge Functions
- [ ] Add inline comments for non-obvious code
- [ ] Update README with development setup

**Not Critical for Production, But Improves Developer Experience**

---

## Production Readiness Priority Matrix

### 🔴 Critical (Must Fix Before Production)
1. **Re-enable Authentication Flow** (15 minutes)
   - Uncomment code in `index.tsx`
   - Test auth flow end-to-end

2. **Add Error Tracking** (1 day)
   - Integrate Sentry for mobile + Edge Functions
   - Test error reporting

3. **Add Basic Testing** (2-3 days)
   - Set up Jest + React Native Testing Library
   - Write tests for critical paths (auth, picks)
   - Set up CI

4. **Security Audit** (1 day)
   - Verify RLS policies
   - Add rate limiting
   - Test auth security

### 🟡 High Priority (Fix in First Week of Production)
1. **Monitoring & Analytics** (2 days)
   - Add custom event tracking
   - Set up monitoring dashboard
   - Configure alerts

2. **Edge Case Handling** (2 days)
   - Handle fighter name changes
   - Handle event rescheduling
   - Improve scraper error recovery

3. **Structured Logging** (1 day)
   - Replace console.log in Edge Functions
   - Add structured logger

### 🟢 Medium Priority (Fix in First Month)
1. **Performance Optimization** (2-3 days)
   - Profile app performance
   - Optimize database queries
   - Refactor large components

2. **Offline Detection** (4 hours)
   - Fix false positives
   - Re-enable OfflineBanner

3. **Code Quality** (2-3 days)
   - Add ESLint and Prettier
   - Add pre-commit hooks
   - Refactor large components

### ⚪ Low Priority (Nice to Have)
1. **Documentation** (3 days)
   - JSDoc comments
   - API documentation
   - Developer guides

2. **Advanced Testing** (ongoing)
   - Increase test coverage to 80%+
   - Add E2E tests
   - Performance testing

---

## Estimated Time to Production Ready

**Minimum Viable Production**: 1 week (Critical items only)
**Recommended Production**: 2-3 weeks (Critical + High Priority)
**Fully Hardened Production**: 4-6 weeks (All items)

---

## Dependencies to Add

### Mobile App
```bash
cd mobile

# Testing
npm install --save-dev jest @testing-library/react-native @testing-library/jest-native jest-expo @types/jest

# Error Tracking
npm install @sentry/react-native

# Analytics (optional - can use Supabase tables)
npm install @segment/analytics-react-native
# or
npm install posthog-react-native

# Code Quality
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react eslint-plugin-react-native prettier husky lint-staged
```

### Edge Functions
```typescript
// supabase/functions/import_map.json
{
  "imports": {
    "sentry": "https://deno.land/x/sentry/index.ts"
  }
}
```

---

## Next Steps

### Step 1: Re-enable Auth (Start Here)
1. Uncomment lines 14-34 in `mobile/app/index.tsx`
2. Test complete auth flow on simulator
3. Test auth edge cases (wrong OTP, duplicate username)
4. Fix any bugs discovered

### Step 2: Add Error Tracking
1. Create Sentry account (free tier)
2. Install `@sentry/react-native`
3. Configure DSN in `mobile/lib/sentry.ts`
4. Test error reporting
5. Add Sentry to Edge Functions

### Step 3: Set Up Testing
1. Install Jest and React Native Testing Library
2. Create `jest.config.js` and `jest.setup.js`
3. Write first test: `useAuth.test.ts`
4. Add test script to `package.json`
5. Run tests: `npm test`
6. Set up GitHub Actions CI

### Step 4: Security Audit
1. Verify all RLS policies
2. Test with 2 different user accounts
3. Add rate limiting to auth endpoints
4. Review service role key usage

### Step 5: Monitoring
1. Add analytics tracking to key events
2. Set up monitoring dashboard
3. Configure alerts for critical failures
4. Test end-to-end

---

## Checklist Summary

**Authentication**: 0/6 ⚠️
- [ ] Re-enable auth flow
- [ ] Session refresh logic
- [ ] Email validation
- [ ] Rate limiting
- [ ] Test edge cases
- [ ] Security audit

**Testing**: 0/11 ❌
- [ ] Testing infrastructure (Jest, RTL)
- [ ] Unit tests (useAuth)
- [ ] Unit tests (useQueries)
- [ ] Component tests (Pick screen)
- [ ] Integration tests (auth flow)
- [ ] Integration tests (pick flow)
- [ ] GitHub Actions CI
- [ ] 60% code coverage
- [ ] E2E tests (optional)
- [ ] Performance tests (optional)
- [ ] Visual regression tests (optional)

**Monitoring**: 0/8 ❌
- [ ] Sentry (mobile)
- [ ] Sentry (Edge Functions)
- [ ] Structured logging
- [ ] Custom analytics
- [ ] Monitoring dashboard
- [ ] Alerts
- [ ] Performance monitoring
- [ ] User funnels

**Edge Cases**: 0/5 ❌
- [ ] Fighter name changes
- [ ] Event rescheduling
- [ ] Bout replacements
- [ ] Scraper partial failures
- [ ] Network failures

**Security**: 3/9 ⚠️
- [x] RLS enabled
- [x] Service role key not in mobile
- [x] Foreign key constraints
- [ ] RLS policy audit
- [ ] Rate limiting
- [ ] Session refresh
- [ ] Input validation
- [ ] Key rotation process
- [ ] Security testing

**Performance**: 0/8 ❌
- [ ] App profiling
- [ ] Database query optimization
- [ ] Component optimization
- [ ] Bundle size analysis
- [ ] Physical device testing
- [ ] Network optimization
- [ ] Loading time targets met
- [ ] Bundle size target met

**Code Quality**: 0/7 ❌
- [ ] ESLint
- [ ] Prettier
- [ ] Pre-commit hooks
- [ ] Refactor large components
- [ ] Shared utilities
- [ ] JSDoc comments
- [ ] API documentation

---

**Overall Production Readiness**: 20% ⚠️

**Critical Blockers**: 4
- Authentication disabled
- No testing
- No error tracking
- No monitoring

**Recommended Path**: Fix critical blockers first (1 week), then high priority items (1 week), then iteratively improve.
