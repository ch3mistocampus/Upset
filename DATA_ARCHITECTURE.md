# UFC Picks Tracker - Data Architecture Documentation

**Document Purpose**: Apple App Store Compliance Review
**App Name**: Upset (UFC Picks Tracker)
**Version**: 1.0.0
**Date**: January 2026

---

## Executive Summary

Upset uses **UFCStats.com** as its data source for UFC fighter statistics, events, and fight results. This is a publicly available statistics database that provides comprehensive MMA data.

| Source | Purpose | Type |
|--------|---------|------|
| **UFCStats.com** | Fighter stats, events, fight cards, results | Public Reference Data |

---

## Table of Contents

1. [Data Source Overview](#1-data-source-overview)
2. [Database Schema](#2-database-schema)
3. [Edge Functions & Sync Operations](#3-edge-functions--sync-operations)
4. [Mobile App Data Layer](#4-mobile-app-data-layer)
5. [Data Flow Architecture](#5-data-flow-architecture)
6. [Compliance & Attribution](#6-compliance--attribution)
7. [Production Verification](#7-production-verification)

---

## 1. Data Source Overview

### UFCStats.com

**Type**: Public UFC statistics database
**Attribution**: Data sourced from UFCStats.com, processed via Greco1899 scrape_ufc_stats project (GitHub)
**Usage**: Primary data source for all fighter and event information

**What We Store**:
- Fighter biographical data (name, nickname, height, weight, reach, stance)
- Detailed career statistics (SLpM, strike accuracy, TD defense, etc.)
- UFC rankings by weight class
- Historical fight records with round-by-round stats
- Event schedules and fight cards
- Fight results and methods

**Data Characteristics**:
- Publicly available statistics
- Comprehensive historical data
- Versioned snapshots for audit trail
- No API key required

---

## 2. Database Schema

### 2.1 Core Application Tables

#### `events` - Event Registry
```sql
CREATE TABLE events (
    id UUID PRIMARY KEY,
    ufcstats_event_id TEXT UNIQUE,      -- External identifier
    name TEXT NOT NULL,
    event_date DATE NOT NULL,
    location TEXT,
    status TEXT DEFAULT 'upcoming',      -- upcoming, in_progress, completed
    last_synced_at TIMESTAMPTZ
);
-- RLS: Public read access
```

#### `bouts` - Individual Fights
```sql
CREATE TABLE bouts (
    id UUID PRIMARY KEY,
    ufcstats_fight_id TEXT UNIQUE,
    event_id UUID REFERENCES events(id),
    order_index INTEGER NOT NULL,        -- Position on card
    red_fighter_ufcstats_id TEXT,
    blue_fighter_ufcstats_id TEXT,
    red_name TEXT,
    blue_name TEXT,
    status TEXT DEFAULT 'scheduled',     -- scheduled, completed, canceled
    card_snapshot INTEGER DEFAULT 1      -- Incremented on card changes
);
-- Trigger: enforce_pick_lock (prevents modifications after event start)
```

#### `results` - Fight Outcomes
```sql
CREATE TABLE results (
    bout_id UUID PRIMARY KEY REFERENCES bouts(id),
    winner_corner TEXT,                  -- red, blue, draw, nc
    method TEXT,
    round INTEGER,
    time TEXT,
    details TEXT,
    synced_at TIMESTAMPTZ
);
```

#### `picks` - User Predictions
```sql
CREATE TABLE picks (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    bout_id UUID REFERENCES bouts(id),
    picked_corner TEXT NOT NULL,         -- red, blue
    created_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending',       -- pending, graded
    score INTEGER                        -- 0 or 1 after grading
);
-- RLS: Users can only access their own picks
-- Unique: (user_id, bout_id)
```

### 2.2 UFCStats Reference Tables

#### `ufc_fighters` - Fighter Statistics
```sql
CREATE TABLE ufc_fighters (
    fighter_id TEXT PRIMARY KEY,         -- UFCStats identifier
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    nickname TEXT,
    dob DATE,
    height_inches INTEGER,
    weight_lbs INTEGER,
    reach_inches INTEGER,
    stance TEXT,
    -- Career Record
    record_wins INTEGER,
    record_losses INTEGER,
    record_draws INTEGER,
    record_nc INTEGER,
    -- Career Statistics
    slpm DECIMAL,                        -- Significant strikes per minute
    sapm DECIMAL,                        -- Strikes absorbed per minute
    str_acc DECIMAL,                     -- Strike accuracy %
    str_def DECIMAL,                     -- Strike defense %
    td_avg DECIMAL,                      -- Takedowns per 15 min
    td_acc DECIMAL,                      -- Takedown accuracy %
    td_def DECIMAL,                      -- Takedown defense %
    sub_avg DECIMAL,                     -- Submissions per 15 min
    -- Rankings
    ranking INTEGER,                     -- 0=Champion, 1-15=ranked
    weight_class TEXT,
    source_snapshot_id TEXT              -- Version tracking
);
-- RLS: Public read access
```

#### `ufc_events` - Event History
```sql
CREATE TABLE ufc_events (
    event_id TEXT PRIMARY KEY,
    name TEXT,
    event_date DATE,
    location TEXT,
    ufcstats_url TEXT,
    source_snapshot_id TEXT
);
```

#### `ufc_fights` - Historical Fight Records
```sql
CREATE TABLE ufc_fights (
    fight_id TEXT PRIMARY KEY,
    event_id TEXT REFERENCES ufc_events(event_id),
    bout_order INTEGER,
    weight_class TEXT,
    is_title_fight BOOLEAN,
    red_fighter_id TEXT REFERENCES ufc_fighters(fighter_id),
    blue_fighter_id TEXT REFERENCES ufc_fighters(fighter_id),
    winner_fighter_id TEXT,
    loser_fighter_id TEXT,
    result_method TEXT,
    result_method_details TEXT,
    result_round INTEGER,
    result_time_seconds INTEGER,
    referee TEXT
);
```

#### `ufc_fight_stats` - Detailed Fight Statistics
```sql
CREATE TABLE ufc_fight_stats (
    id TEXT PRIMARY KEY,
    fight_id TEXT,
    fighter_id TEXT,
    opponent_id TEXT,
    round INTEGER,                       -- NULL for totals
    is_total BOOLEAN,
    -- Striking
    knockdowns INTEGER,
    sig_str_landed INTEGER,
    sig_str_attempted INTEGER,
    total_str_landed INTEGER,
    total_str_attempted INTEGER,
    -- Target Breakdown
    head_landed INTEGER,
    head_attempted INTEGER,
    body_landed INTEGER,
    body_attempted INTEGER,
    leg_landed INTEGER,
    leg_attempted INTEGER,
    -- Position Breakdown
    distance_landed INTEGER,
    clinch_landed INTEGER,
    ground_landed INTEGER,
    -- Grappling
    td_landed INTEGER,
    td_attempted INTEGER,
    sub_attempts INTEGER,
    reversals INTEGER,
    ctrl_time_seconds INTEGER
);
```

#### `ufc_source_snapshots` - Import Tracking
```sql
CREATE TABLE ufc_source_snapshots (
    snapshot_id TEXT PRIMARY KEY,
    source TEXT,                         -- "greco1899"
    fetched_at TIMESTAMPTZ,
    git_ref TEXT,                        -- commit/tag reference
    notes TEXT,
    row_counts JSONB
);
```

---

## 3. Edge Functions & Sync Operations

### 3.1 sync-events

**Purpose**: Syncs UFC events from UFCStats.com

**Endpoints**:
```
POST /sync-events              # Full sync
POST /sync-events?force=true   # Bypass cache check
GET  /sync-events?health=true  # Health check
```

**Workflow**:
1. Health check on provider
2. Cache validation check
3. Fetch upcoming + completed events
4. Upsert to events table
5. Update sync timestamp

**Security**:
- Authentication: Service role (bypasses RLS)
- Sanity checks prevent accidental data wipe

### 3.2 sync-results

**Purpose**: Syncs fight results after events complete

**Workflow**:
1. Fetch completed event results
2. Update results table
3. Trigger grade_picks() function
4. Update user statistics

---

## 4. Mobile App Data Layer

### 4.1 Supabase Client

```typescript
// lib/supabase.ts
export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
    },
  }
);
```

### 4.2 Fighter Data Hooks

| Hook | Purpose | Cache TTL |
|------|---------|-----------|
| `useSearchFighters(query)` | Search by name | 10 min |
| `useFighter(id)` | Single fighter | 10 min |
| `useFighterProfile(id)` | Profile + history | 10 min |
| `useRankedFighters(class)` | Ranked fighters | 10 min |
| `useTopFighters(limit)` | Top by wins | 10 min |

### 4.3 Event & Bout Hooks

| Hook | Purpose | Cache TTL |
|------|---------|-----------|
| `useNextEvent()` | Upcoming event | 5 min |
| `useRecentEvents(limit)` | Completed events | 5 min |
| `useUpcomingEvents()` | All upcoming | 5 min |
| `useBoutsForEvent(id)` | Fights + picks | 2 min |

### 4.4 Pick Management

| Hook | Purpose | Notes |
|------|---------|-------|
| `useUpsertPick()` | Create/update pick | Optimistic updates |
| `useDeletePick()` | Remove pick | Rollback support |
| `useUserStats(userId)` | Pick accuracy | 5 min cache |

---

## 5. Data Flow Architecture

### 5.1 System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    MOBILE APP (Expo)                        │
│                  React Query + Supabase                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    PUBLIC ANON KEY
                           │
              ┌────────────▼────────────┐
              │   UFCStats Data         │
              │   (Public Reference)    │
              ├─────────────────────────┤
              │ • ufc_fighters          │
              │ • ufc_fights            │
              │ • ufc_events            │
              │ • ufc_fight_stats       │
              └────────────┬────────────┘
                           │
              ┌────────────▼────────────┐
              │   Core App Tables       │
              │ • events                │
              │ • bouts                 │
              │ • picks                 │
              │ • results               │
              └─────────────────────────┘
```

### 5.2 Sync Schedule

| Operation | Frequency | Trigger |
|-----------|-----------|---------|
| Event sync | Nightly | Cron / Manual |
| Fighter sync | Weekly | Manual |
| Results sync | Post-event | Manual |

### 5.3 User Pick Flow

```
1. User views event → useBoutsForEvent()
   └─ Fetches: bouts + results + user picks

2. User makes pick → useUpsertPick()
   └─ Validates: event not locked
   └─ Upserts: picks table
   └─ Optimistic: cache update

3. Event completes → sync-results
   └─ Updates: results table
   └─ Triggers: grade_picks()
   └─ Updates: user_stats
```

---

## 6. Compliance & Attribution

### 6.1 Data Source Compliance

| Source | Type | Compliance Status |
|--------|------|-------------------|
| UFCStats.com | Public Data | ✅ Properly Attributed |
| User Picks | User Generated | ✅ Protected by RLS |

### 6.2 UFCStats.com Attribution

- **Source**: UFCStats.com (public UFC statistics database)
- **Processing**: Greco1899 scrape_ufc_stats project (GitHub)
- **Usage**: Fighter statistics and event data
- **Attribution**: Source credited in app and documentation
- **Versioning**: All imports tracked via `source_snapshot_id`

### 6.3 User Data Protection

| Protection | Implementation |
|------------|----------------|
| Row Level Security | Users only access own picks |
| Authentication | Supabase Auth with JWT |
| No Sensitive Data | No betting/payment info stored |
| Pick Locking | Cannot modify after event start |

### 6.4 Privacy Considerations

- No gambling or wagering functionality
- No real money transactions
- No third-party data sharing
- User picks are private by default
- Leaderboard data is opt-in (username only)

---

## 7. Production Verification

### 7.1 Verify Event Data

```sql
-- Check recent events
SELECT name, event_date, status, last_synced_at
FROM events
ORDER BY event_date DESC
LIMIT 10;
```

### 7.2 Verify Fighter Data

```sql
-- Check fighter count by weight class
SELECT weight_class, COUNT(*) as fighter_count
FROM ufc_fighters
WHERE weight_class IS NOT NULL
GROUP BY weight_class
ORDER BY fighter_count DESC;
```

### 7.3 Verify Data Currency

```sql
-- Latest sync times
SELECT
  MAX(last_synced_at) AS last_event_sync,
  NOW() - MAX(last_synced_at) AS age
FROM events;
```

---

## Summary

The Upset app maintains **data compliance** through:

1. **Public Data Source**: UFCStats.com for fighter and event data
2. **Proper Attribution**: Source credited in documentation
3. **User Data Protection**: RLS policies restrict access to own data
4. **No Gambling Features**: Pick predictions only, no wagering
5. **Version Tracking**: All data imports tracked via snapshots

---

**Document prepared for Apple App Store Review**
**Contact**: [Developer Contact Info]
**Last Updated**: January 2026
