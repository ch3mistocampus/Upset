# Global Scorecard - Architecture Findings

## Overview

This document captures the architectural findings from analyzing the UFC Picks Tracker codebase to inform the Global Scorecard feature implementation.

---

## 1. Frontend Stack

### Technology
- **Framework**: Expo v54.0.30 with React Native
- **React Version**: 19.1.0
- **Navigation**: Expo Router (file-based routing)
- **UI**: Custom components with theme support (dark/light mode)

### State Management
- **Primary**: React Query v5.90.15 (`@tanstack/react-query`)
- **Local State**: React hooks (useState, useReducer)
- **Persistent Storage**: AsyncStorage for auth tokens and guest data

### Key Patterns
```typescript
// Query key pattern for cache management
const queryKeys = {
  all: ['resource'] as const,
  list: () => [...queryKeys.all, 'list'] as const,
  detail: (id: string) => [...queryKeys.all, 'detail', id] as const,
};

// Typical hook pattern
export function useResource(id: string) {
  return useQuery({
    queryKey: queryKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_resource', { id });
      if (error) throw error;
      return data;
    },
    staleTime: 60000, // 1 minute
  });
}
```

---

## 2. Backend Stack

### Database
- **Platform**: Supabase (hosted PostgreSQL)
- **Version**: PostgreSQL 15+
- **ORM**: Direct SQL via Supabase client + RPC functions

### API Layer
- **Primary**: Supabase RPC functions (PL/pgSQL)
- **Edge Functions**: Deno-based serverless for external integrations
- **Auth**: Supabase Auth with Row Level Security (RLS)

### Data Flow
```
Mobile App → Supabase Client → RPC Function → PostgreSQL
                              ↓
                    Row Level Security (RLS)
```

---

## 3. Authentication & User Identity

### Approach
- Supabase Auth with email/password
- Guest mode support with AsyncStorage fallback
- Migration path from guest → authenticated user

### Key Tables
- `auth.users` - Supabase managed
- `profiles` - User display info (username, bio, avatar)
- `privacy_settings` - Stats visibility controls
- `user_stats` - Denormalized accuracy/pick stats

### User ID Access
```typescript
const { user } = useAuth();
const userId = user?.id; // UUID from auth.users
```

---

## 4. Realtime/Polling Patterns

### Current Approach: Polling (No WebSockets)

The app uses React Query's polling capabilities rather than Supabase Realtime:

| Data Type | Stale Time | Refresh Interval |
|-----------|------------|------------------|
| Events/Bouts | 5 minutes | Manual pull-to-refresh |
| Community Pick % | 30 seconds | On demand |
| Leaderboard | 1 minute | Manual refresh |
| Activity Feed | 30 seconds | 30s refetchInterval |
| Admin Reports | 30 seconds | 30s refetchInterval |

### Recommendation for Global Scorecard
- Use 5-10 second polling during active fights
- Longer intervals (30s-1min) when fight is not live
- Optimistic updates for submission feedback

---

## 5. Fight Cards & Fights Data Model

### Events (Fight Cards)
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY,
  ufcstats_event_id TEXT UNIQUE NOT NULL,  -- External provider ID
  name TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  status TEXT CHECK (status IN ('upcoming', 'in_progress', 'completed')),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Bouts (Individual Fights)
```sql
CREATE TABLE bouts (
  id UUID PRIMARY KEY,
  ufcstats_fight_id TEXT UNIQUE NOT NULL,  -- External provider ID
  event_id UUID REFERENCES events(id),
  order_index INT NOT NULL,                 -- 0 = main event
  weight_class TEXT,
  red_fighter_ufcstats_id TEXT NOT NULL,
  blue_fighter_ufcstats_id TEXT NOT NULL,
  red_name TEXT NOT NULL,
  blue_name TEXT NOT NULL,
  status TEXT CHECK (status IN ('scheduled', 'completed', 'canceled', 'replaced')),
  card_snapshot INT DEFAULT 1,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_event_fight_order UNIQUE(event_id, order_index)
);
```

### Results (Fight Outcomes)
```sql
CREATE TABLE results (
  bout_id UUID PRIMARY KEY REFERENCES bouts(id),
  winner_corner TEXT CHECK (winner_corner IN ('red', 'blue', 'draw', 'nc')),
  method TEXT,           -- KO/TKO, Submission, Decision, etc.
  round INT,
  time TEXT,
  details TEXT,
  synced_at TIMESTAMPTZ NOT NULL
);
```

### Key Relationships
- Event 1:N Bouts (via `event_id`)
- Bout 1:1 Result (via `bout_id`)
- Bout 1:N Picks (via `bout_id`)

---

## 6. Existing Admin Patterns

### Admin Role Check
```typescript
// Hook: useIsAdmin()
export function useIsAdmin() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['admin', 'isAdmin'],
    queryFn: async () => {
      const { data } = await supabase.rpc('is_admin');
      return data === true;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

### Admin Route Protection
```typescript
// _layout.tsx pattern
const { data: isAdmin, isLoading } = useIsAdmin();

if (isLoading) return <LoadingScreen />;
if (!isAdmin) {
  router.replace('/');
  return null;
}
return <Slot />;
```

### Admin RPC Functions
- `is_admin()` - Returns boolean
- `get_admin_users_with_stats()` - User management
- `get_pending_reports()` - Content moderation
- `review_report()` - Action on reports

---

## 7. Integration Recommendations

### Database Schema Strategy
- Add new tables alongside existing structure
- Use foreign keys to `bouts` table for fight reference
- Maintain provider-agnostic IDs (allow future external ID mapping)

### API Strategy
- Create Supabase RPC functions for all operations
- Use transactions for atomic score submission + aggregation
- Implement RLS for user-specific data

### Frontend Strategy
- Create dedicated hook: `useGlobalScorecard.ts`
- Add types to `types/scorecard.ts`
- New screen: `app/event/[id]/scorecard.tsx` or `app/bout/[id]/scorecard.tsx`
- Admin screen: `app/admin/fight-ops.tsx`

### Polling Strategy
```typescript
// During active fight - aggressive polling
refetchInterval: roundState.phase === 'ROUND_BREAK' ? 5000 : 15000,

// When not live - conservative polling
refetchInterval: isLive ? 5000 : 60000,
```

---

## 8. Type Definitions Location

### Existing Types
- `/mobile/types/database.ts` - Core domain types (Event, Bout, Pick, etc.)
- `/mobile/types/posts.ts` - Forum feature types
- `/mobile/types/social.ts` - Friendship/social types

### Recommendation
Create `/mobile/types/scorecard.ts` for:
- `RoundState`
- `RoundScore`
- `RoundAggregate`
- `ScorecardSubmission`
- `ScoreBucket`

---

## 9. External Provider Abstraction

### Current State
- `ufcstats_event_id` and `ufcstats_fight_id` stored but loosely coupled
- Sync happens via Edge Functions, not direct API calls from mobile

### Future Provider Integration Points
1. **Round State Source**: Currently manual, will be provider-driven
2. **Fight Status**: `bouts.status` field
3. **Event Status**: `events.status` field

### Recommendation
```typescript
// Provider interface for future integration
interface RoundStateProvider {
  source: 'MANUAL' | 'SPORTRADAR' | 'SPORTSDATA_IO' | 'ESPN';
  startRound(fightId: string, round: number): Promise<void>;
  endRound(fightId: string, round: number): Promise<void>;
  endFight(fightId: string): Promise<void>;
  subscribeToUpdates(fightId: string, callback: (state: RoundState) => void): () => void;
}
```

---

## 10. Summary

| Aspect | Current State | Scorecard Approach |
|--------|---------------|-------------------|
| Data Layer | Supabase + RPC | Same pattern |
| State Management | React Query | Same pattern |
| Realtime | Polling | 5-15s polling for live fights |
| Auth | Supabase Auth | Use existing `user.id` |
| Admin | Role-based RPC | Same pattern |
| Types | TypeScript | New `scorecard.ts` file |

### Minimal Integration Path
1. Add 3 new tables (round_state, round_scores, round_aggregates)
2. Create 3-4 RPC functions (get_scorecard, submit_score, update_round_state)
3. Add `useGlobalScorecard` hook following existing patterns
4. Build UI using existing component library
5. Add admin screen following existing admin patterns
