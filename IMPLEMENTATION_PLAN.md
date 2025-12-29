# UFC Picks Accuracy Tracker - Implementation Plan

## Project Overview
Building a production-grade MVP for tracking UFC pick accuracy using Expo React Native + Supabase + UFCStats data sync.

## Architecture Decisions

### Project Structure
```
Upset/
├── mobile/                 # Expo React Native app
│   ├── app/               # Expo Router screens
│   │   ├── (auth)/       # Auth flow
│   │   ├── (tabs)/       # Main app tabs
│   │   └── _layout.tsx
│   ├── components/        # Reusable UI components
│   ├── lib/              # Supabase client, utilities
│   ├── hooks/            # React Query hooks
│   └── types/            # TypeScript types
│
├── supabase/
│   ├── migrations/        # SQL schema migrations
│   ├── functions/         # Edge Functions (Deno)
│   │   ├── sync-events/
│   │   ├── sync-next-event-card/
│   │   └── sync-recent-results-and-grade/
│   └── seed.sql          # Optional seed data
│
├── .github/
│   └── workflows/         # Scheduled sync jobs
│       └── sync-cron.yml
│
└── README.md
```

### Technology Stack
- **Mobile**: Expo SDK 50+, TypeScript, Expo Router (file-based routing), React Query (data fetching/caching)
- **Backend**: Supabase (Postgres + Auth + Edge Functions)
- **Data Source**: UFCStats.com (web scraping with Cheerio in Edge Functions)
- **Scheduling**: GitHub Actions (more reliable than experimental Supabase pg_cron)

### Key Design Decisions

1. **Data Sync Strategy**
   - All scraping happens in Edge Functions (never in mobile app)
   - Service role key used in Edge Functions to bypass RLS
   - Idempotent upserts based on ufcstats_* IDs
   - Defensive parsing: never overwrite if parse returns 0 results

2. **Pick Locking**
   - Backend validation: reject updates if `now() >= events.event_date`
   - Frontend: disable UI + show countdown
   - Lock time = event start time (simple MVP approach)

3. **Grading Logic**
   - MVP: Winner only (1 point correct, 0 incorrect)
   - Method/round fields stored but not scored
   - Draws/NC = voided picks (score = null, status = 'voided')
   - Immutable after grading

4. **Bout Changes**
   - If ufcstats_fight_id disappears: mark bout.status='canceled', void picks
   - No fancy reconciliation in MVP
   - UI shows "Voided" banner

5. **Stats Computation**
   - Recompute from picks table on each grade (avoid drift)
   - Optimize later with incremental updates if needed

## Implementation Phases

### Phase 1: Foundation (Supabase Backend)
**Goal**: Set up database schema, RLS, and test with seed data

1. Initialize Supabase project locally (supabase init)
2. Create migration files for:
   - Tables: profiles, events, bouts, results, picks, user_stats
   - Indexes for performance
   - RLS policies (public read for events/bouts/results, user-owned picks/profiles)
3. Create helper functions/triggers:
   - Auto-lock picks at event_date
   - User stats recalculation function
4. Test locally with supabase start

**Deliverables**:
- `supabase/migrations/20250101000000_initial_schema.sql`
- `supabase/migrations/20250101000001_rls_policies.sql`

### Phase 2: Data Sync (Edge Functions)
**Goal**: Build UFCStats scraping and grading logic

1. **sync-events** Edge Function
   - Fetch UFCStats upcoming/past events
   - Parse: event ID, name, date, location
   - Upsert into events table
   - Set status (upcoming vs completed heuristic)

2. **sync-next-event-card** Edge Function
   - Find next upcoming event
   - Fetch event page → parse fight links
   - For each fight: fetch fight page → parse fighters
   - Upsert bouts with order_index
   - Handle cancellations (missing fights)

3. **sync-recent-results-and-grade** Edge Function
   - Find recent events (event_date <= now, status != completed)
   - Parse fight results from UFCStats
   - Upsert results table
   - Grade picks: compare picked_corner vs winner_corner
   - Update user_stats (recompute from picks)
   - Mark event as completed

**Technical Notes**:
- Use Cheerio for HTML parsing
- Implement rate limiting (sleep 500ms-1s between requests)
- Retry with exponential backoff (3 retries max)
- Structured logging: { function, event_id, counts, errors }

**Deliverables**:
- `supabase/functions/sync-events/index.ts`
- `supabase/functions/sync-next-event-card/index.ts`
- `supabase/functions/sync-recent-results-and-grade/index.ts`
- `supabase/functions/_shared/ufcstats-scraper.ts` (shared scraping utilities)

### Phase 3: Scheduling
**Goal**: Automate data syncs

**Approach**: GitHub Actions cron jobs
- Daily: sync-events (6am UTC)
- Daily: sync-next-event-card (12pm UTC)
- Every 6 hours: sync-recent-results-and-grade

**Authentication**:
- Store Supabase service role key + function URLs in GitHub secrets
- Call Edge Functions via HTTP with Authorization header

**Deliverables**:
- `.github/workflows/sync-cron.yml`

### Phase 4: Mobile App Foundation
**Goal**: Expo app with navigation and Supabase integration

1. Initialize Expo app with TypeScript template
2. Install dependencies:
   - @supabase/supabase-js
   - @tanstack/react-query
   - expo-router
3. Configure Expo Router:
   - (auth) stack: sign-in, create-username
   - (tabs) stack: home, pick, stats, profile
4. Set up Supabase client with AsyncStorage for session
5. Create React Query provider with cache config

**Deliverables**:
- `mobile/` directory with Expo app
- `mobile/lib/supabase.ts` (client config)
- `mobile/app/_layout.tsx` (root layout with providers)

### Phase 5: Authentication Flow
**Goal**: Email OTP sign-in + username creation

1. **Sign In Screen** (`app/(auth)/sign-in.tsx`)
   - Email input
   - Send OTP via Supabase Auth
   - Verify OTP
   - Redirect to username creation if new user

2. **Create Username Screen** (`app/(auth)/create-username.tsx`)
   - Username input with validation
   - Check uniqueness via RPC or query
   - Insert into profiles table
   - Redirect to main app

3. **Auth Context**
   - Track session state
   - Check if profile exists
   - Route guards

**Deliverables**:
- Auth screens with OTP flow
- Profile creation with uniqueness enforcement

### Phase 6: Core Screens
**Goal**: Implement main app functionality

1. **Home Screen** (`app/(tabs)/index.tsx`)
   - Fetch next event (React Query)
   - Show event name, date, countdown
   - Show picks progress (X/Y)
   - Last event summary
   - CTA button to Pick screen

2. **Pick Screen** (`app/(tabs)/pick.tsx`)
   - List bouts for next event
   - Fighter selection UI (tap to pick)
   - Auto-save pick on selection (upsert)
   - Lock countdown timer
   - Disable after lock (read-only)
   - Show voided bouts

3. **Stats Screen** (`app/(tabs)/stats.tsx`)
   - Fetch user_stats
   - Display accuracy %, total picks, streaks
   - Last 5 events summary (query picks + results)

4. **Profile Screen** (`app/(tabs)/profile.tsx`)
   - Show username
   - Core stats summary
   - Logout button

**React Query Hooks**:
- `useNextEvent()` - fetch next event
- `useBoutsForEvent(eventId)` - fetch bouts
- `useUserPicks(eventId)` - fetch user's picks
- `useUserStats()` - fetch stats
- `useUpsertPick()` - mutation for saving picks

**Deliverables**:
- 4 main screens fully functional
- React Query hooks for data fetching
- Reusable components (BoutCard, StatsCard, CountdownTimer)

### Phase 7: UX Polish
**Goal**: Dark mode, offline support, error states

1. Dark mode theme (Expo config + stylesheet)
2. React Query offline caching (staleTime, cacheTime)
3. Loading states (skeletons)
4. Error states (retry buttons)
5. Empty states (no events, no picks)
6. Locked picks UI (grayed out, "Locked" badge)

**Deliverables**:
- Polished UI with dark theme
- Offline tolerance
- Comprehensive error handling

### Phase 8: Backend Validation & Business Rules
**Goal**: Enforce pick locking and grading rules

1. **Postgres Function**: `validate_pick_not_locked()`
   - Called by RLS policy on picks INSERT/UPDATE
   - Reject if `now() >= event.event_date`

2. **Grading Logic** (in sync-recent-results-and-grade)
   - Winner-only scoring: 1 or 0
   - Void on draw/NC
   - Set pick.status = 'graded'
   - Immutability check

3. **User Stats Recalculation**
   - Function: `recalculate_user_stats(user_id)`
   - Called after grading
   - Compute accuracy, streaks from picks

**Deliverables**:
- SQL functions for validation and stats
- Integration in Edge Functions

### Phase 9: Testing & Documentation
**Goal**: Validate acceptance criteria and document setup

**Acceptance Tests** (manual verification):
1. New user onboarding
2. Make picks and persist
3. Lock enforcement
4. Results sync and grading
5. Bout canceled/changed

**Documentation**:
- README.md with:
  - Project overview
  - Prerequisites (Node, Expo CLI, Supabase CLI)
  - Local setup steps
  - Environment variables
  - Running Edge Functions locally
  - Deploying to Supabase
  - Running mobile app (Expo Go / dev build)

**Deliverables**:
- Comprehensive README.md
- `.env.example` files
- Testing checklist

## Dependencies & Setup Order

1. **Supabase CLI** → Initialize project, run migrations
2. **Edge Functions** → Test scraping logic locally
3. **Expo App** → Build UI against local Supabase
4. **GitHub Actions** → Set up after Edge Functions deployed

## Risk Mitigation

### UFCStats Changes
- Defensive parsing with try-catch
- Log failures without crashing
- Manual fallback: admin can trigger sync with event ID override

### Rate Limiting / Blocking
- Sleep between requests (500ms-1s)
- User-agent rotation if needed
- Fallback: manual data entry (post-MVP)

### Bout Changes
- MVP approach: void picks, show banner
- No silent rewrites
- Acceptable UX trade-off for MVP

## Timeline Estimate
- **Phase 1-2**: Backend foundation (2-3 days)
- **Phase 3**: Scheduling (1 day)
- **Phase 4-6**: Mobile app (3-4 days)
- **Phase 7-9**: Polish + testing (2 days)

**Total**: ~8-10 days of focused development

## Open Questions

1. **Supabase Project**: Do you have an existing Supabase project, or should I include setup instructions?
2. **UFCStats Parsing**: Should I implement a mock/stub for testing before live scraping?
3. **Deployment Target**: Expo Go for MVP, or EAS Build for production?
4. **GitHub Actions**: Do you have access to GitHub Actions on your repo?

## Next Steps

After plan approval:
1. Initialize Expo app structure
2. Set up Supabase migrations
3. Implement Edge Functions
4. Build mobile screens
5. Integrate and test end-to-end

---

**Ready to proceed?** Let me know if you want to adjust any architectural decisions or if you have answers to the open questions!
