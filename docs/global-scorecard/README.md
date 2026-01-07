# Global Scorecard Feature

Real-time round-by-round scoring for UFC fights with global aggregation.

## Overview

The Global Scorecard feature allows users to submit their round-by-round scores during live UFC fights. Scores are aggregated in real-time to show the "global scorecard" - how the community is scoring the fight.

### Key Features

- **Round-by-round scoring**: Users can submit scores (10-9, 10-8, etc.) during scoring windows
- **Real-time aggregation**: See how others are scoring each round
- **Score buckets**: Visual breakdown of scoring distribution (e.g., 60% scored 10-9 Red)
- **Consensus index**: Measure of agreement (0 = split, 1 = unanimous)
- **Admin controls**: Manual fight operations for MVP, future provider integration

---

## Data Model

### Tables

#### `round_state`
Server-authoritative state for each fight's round progression.

| Column | Type | Description |
|--------|------|-------------|
| `bout_id` | UUID | Primary key, references `bouts.id` |
| `current_round` | INT | Current round number (1-12) |
| `phase` | ENUM | Current phase (see below) |
| `scheduled_rounds` | INT | Total rounds (3 or 5) |
| `round_started_at` | TIMESTAMPTZ | When current round started |
| `round_ends_at` | TIMESTAMPTZ | Estimated round end time |
| `scoring_grace_seconds` | INT | Extra time for scoring after round ends |
| `source` | TEXT | 'MANUAL', 'PROVIDER', or 'HYBRID' |

#### `round_scores`
Individual user score submissions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `bout_id` | UUID | References `bouts.id` |
| `user_id` | UUID | References `auth.users.id` |
| `round_number` | INT | Round being scored |
| `score_red` | INT | Points for red corner (7-10) |
| `score_blue` | INT | Points for blue corner (7-10) |
| `submission_id` | UUID | Client-generated for idempotency |

**Constraint**: One submission per user per round per fight.

#### `round_aggregates`
Pre-computed aggregate statistics per round.

| Column | Type | Description |
|--------|------|-------------|
| `bout_id` | UUID | Part of composite PK |
| `round_number` | INT | Part of composite PK |
| `submission_count` | INT | Total submissions |
| `buckets` | JSONB | Score distribution (see below) |
| `mean_red` | NUMERIC | Average red corner score |
| `mean_blue` | NUMERIC | Average blue corner score |
| `consensus_index` | NUMERIC | Agreement measure (0-1) |

#### Score Buckets Format

```json
{
  "red_10_9": 45,
  "red_10_8": 12,
  "blue_10_9": 8,
  "even_10_10": 2
}
```

### Round Phases

```
PRE_FIGHT → ROUND_LIVE → ROUND_BREAK → ROUND_CLOSED → ... → FIGHT_ENDED
              ↑              ↓
              └──────────────┘ (repeats for each round)
```

| Phase | Description | Scoring Allowed |
|-------|-------------|-----------------|
| `PRE_FIGHT` | Fight hasn't started | No |
| `ROUND_LIVE` | Round in progress | No |
| `ROUND_BREAK` | Between rounds | **Yes** |
| `ROUND_CLOSED` | Scoring window closed | No |
| `FIGHT_ENDED` | Fight is over | No |

---

## How Scoring Windows Work

### The Scoring Window

Users can only submit scores during the `ROUND_BREAK` phase:

1. **Round ends** → Admin triggers "End Round"
2. **Scoring window opens** → Phase becomes `ROUND_BREAK`
3. **Users submit scores** → 30-90 second window
4. **Window closes** → Admin triggers "Start Round" or "Close Scoring"
5. **Next round begins** → Phase becomes `ROUND_LIVE`

### Grace Period

The `scoring_grace_seconds` field (default: 30s) provides buffer time for late submissions. Even if a round technically ends, users have extra time to submit.

### Idempotent Submissions

Submissions use client-generated UUIDs to prevent duplicates:

```typescript
const submissionId = crypto.randomUUID();

await submitScore({
  submission_id: submissionId,
  bout_id: boutId,
  round_number: currentRound,
  score_red: 10,
  score_blue: 9,
});

// Retry is safe - same submissionId won't create duplicate
```

If a user resubmits with a different `submission_id`, their previous score is replaced.

---

## Running Fight Ops Manually

### Accessing the Admin Panel

1. Navigate to the Admin section
2. Select "Fight Ops" from the menu
3. You'll see the Fight Operations dashboard

### Starting a Fight

1. **Select a bout** from the dropdown or search
2. Fight will be in `PRE_FIGHT` state
3. Click **"Start Round 1"** when the fight begins
4. Phase changes to `ROUND_LIVE`

### During a Round

- Phase shows `ROUND_LIVE`
- No scoring is allowed
- Monitor the fight and wait for round to end

### Between Rounds

1. Click **"End Round"** when the round ends
2. Phase changes to `ROUND_BREAK`
3. **Scoring window is now open**
4. Users have 30-90 seconds to submit scores
5. Watch submission count increase in real-time

### Closing Scoring

Option A: **Start next round**
- Click **"Start Round X"**
- Automatically closes previous scoring
- Phase → `ROUND_LIVE`

Option B: **Close scoring explicitly**
- Click **"Close Scoring"**
- Phase → `ROUND_CLOSED`
- Use if you need a pause before next round

### Ending the Fight

1. Click **"End Fight"** when fight concludes
2. Confirm the action (irreversible)
3. Phase → `FIGHT_ENDED`
4. No more scoring allowed

### Typical Flow

```
PRE_FIGHT
    ↓ [Start Round 1]
ROUND_LIVE (Round 1)
    ↓ [End Round]
ROUND_BREAK (Score Round 1)
    ↓ [Start Round 2]
ROUND_LIVE (Round 2)
    ↓ [End Round]
ROUND_BREAK (Score Round 2)
    ↓ [Start Round 3]
ROUND_LIVE (Round 3)
    ↓ [End Round]
ROUND_BREAK (Score Round 3)
    ↓ [End Fight]
FIGHT_ENDED
```

### Recovery Options

**Recompute Aggregates**: If aggregates get out of sync, use the "Recompute Aggregates" button to recalculate from raw scores.

---

## Integrating a Provider

The system is designed to be provider-agnostic. For MVP, admins control round state manually. In the future, external providers can drive state automatically.

### Provider Interface

```typescript
interface RoundStateProvider {
  source: 'SPORTRADAR' | 'SPORTSDATA_IO' | 'ESPN' | 'CUSTOM';

  // Subscribe to round state updates
  subscribe(
    boutId: string,
    externalFightId: string,
    callback: (event: ProviderEvent) => void
  ): () => void;

  // Event types from provider
  type ProviderEvent =
    | { type: 'ROUND_START'; round: number; timestamp: string }
    | { type: 'ROUND_END'; round: number; timestamp: string }
    | { type: 'FIGHT_END'; result?: FightResult }
    | { type: 'FIGHT_CANCELLED' };
}
```

### Integration Steps

#### 1. Create Provider Adapter

```typescript
// supabase/functions/provider-webhook/index.ts
import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req) => {
  const event = await req.json();
  const supabase = createClient(/* ... */);

  // Map provider event to round state
  if (event.type === 'ROUND_END') {
    await supabase.rpc('admin_update_round_state', {
      p_bout_id: mapToInternalId(event.fightId),
      p_action: 'END_ROUND',
      p_admin_user_id: SYSTEM_USER_ID, // Service account
      p_source: 'PROVIDER',
    });
  }
});
```

#### 2. Map External Fight IDs

The `bouts` table has `ufcstats_fight_id` for external mapping. Add similar fields for other providers:

```sql
ALTER TABLE bouts ADD COLUMN sportradar_id TEXT;
ALTER TABLE bouts ADD COLUMN sportsdata_id TEXT;
```

#### 3. Update Source Tracking

When provider drives state, set `source = 'PROVIDER'` in round_state:

```sql
UPDATE round_state
SET source = 'PROVIDER',
    updated_at = now()
WHERE bout_id = $1;
```

#### 4. Hybrid Mode

For reliability, use hybrid mode where provider updates state but admin can override:

```typescript
// Provider webhook
await supabase.rpc('admin_update_round_state', {
  p_source: 'HYBRID', // Allow manual override
  // ...
});
```

Admin controls remain active even with provider integration, allowing manual correction if provider data is delayed or incorrect.

### Recommended Providers

| Provider | Coverage | Real-time | Notes |
|----------|----------|-----------|-------|
| Sportradar | UFC, Bellator | Yes | Official UFC partner |
| SportsData.io | UFC | Yes | Good API, reasonable cost |
| ESPN API | UFC | Limited | May require scraping |

---

## API Reference

### RPC Functions

#### `get_fight_scorecard(p_bout_id UUID)`

Returns complete scorecard data for a fight.

**Returns:**
```typescript
{
  bout: {
    id: string;
    event_id: string;
    red_name: string;
    blue_name: string;
    weight_class: string | null;
    status: string;
  };
  round_state: {
    current_round: number;
    phase: RoundPhase;
    scheduled_rounds: number;
    is_scoring_open: boolean;
    // ...
  } | null;
  aggregates: RoundAggregate[];
  user_scores: RoundScore[];
}
```

#### `submit_round_score(...)`

Submit a score for a round. Idempotent.

**Parameters:**
- `p_submission_id`: UUID - Client-generated for idempotency
- `p_bout_id`: UUID - Fight ID
- `p_round_number`: INT - Round being scored
- `p_score_red`: INT - Red corner score (7-10)
- `p_score_blue`: INT - Blue corner score (7-10)

**Returns:**
```typescript
{
  success: boolean;
  message: string;
  idempotent?: boolean;  // True if duplicate submission
  score?: RoundScore;
  existing_score?: RoundScore;
}
```

#### `admin_update_round_state(...)`

Update fight state (admin only).

**Parameters:**
- `p_bout_id`: UUID - Fight ID
- `p_action`: TEXT - 'START_ROUND', 'END_ROUND', 'START_BREAK', 'CLOSE_SCORING', 'END_FIGHT'
- `p_scheduled_rounds`: INT (optional) - Set scheduled rounds
- `p_admin_user_id`: UUID (optional) - Override for service accounts

#### `get_event_scorecards(p_event_id UUID)`

Get scorecard summaries for all bouts in an event.

#### `admin_get_live_fights()`

Get all fights currently in progress (admin only).

#### `admin_recompute_aggregates(p_bout_id UUID)`

Recompute aggregates from raw scores (admin recovery tool).

---

## Frontend Integration

### Hooks

```typescript
import {
  useFightScorecard,
  useSubmitScore,
  useAdminUpdateRoundState,
  getScorecardPollingInterval,
} from '@/hooks/useScorecard';

// In component
const { data, isLoading } = useFightScorecard(boutId, {
  refetchInterval: getScorecardPollingInterval(data?.round_state?.phase),
});

const submitScore = useSubmitScore();
await submitScore.mutateAsync({
  bout_id: boutId,
  round_number: 1,
  score_red: 10,
  score_blue: 9,
});
```

### Screens

- `/bout/[id]/scorecard` - User scoring interface
- `/admin/fight-ops` - Admin fight operations

---

## Polling Strategy

| Phase | Polling Interval | Rationale |
|-------|-----------------|-----------|
| `ROUND_BREAK` | 5 seconds | Fast updates during scoring |
| `ROUND_LIVE` | 10 seconds | Monitor for phase change |
| `PRE_FIGHT` | 30 seconds | Waiting for fight to start |
| `FIGHT_ENDED` | Disabled | No more updates needed |

---

## Security

### Row Level Security (RLS)

- **round_state**: Viewable by all authenticated users, writable by admins
- **round_scores**: Users can only see/modify their own scores
- **round_aggregates**: Viewable by all authenticated users

### Admin Checks

All admin functions verify:
```sql
SELECT EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = auth.uid()
  AND role = 'admin'
)
```

---

## Troubleshooting

### Scores Not Appearing

1. Check phase is `ROUND_BREAK`
2. Verify user is authenticated
3. Check submission_id is unique
4. Look for errors in Supabase logs

### Aggregates Out of Sync

Run `admin_recompute_aggregates(bout_id)` to recalculate from raw scores.

### Phase Stuck

Admin can force transition using Fight Ops panel. Check `round_state_log` for history.

---

## Future Enhancements

- [ ] WebSocket/Realtime for instant updates
- [ ] Provider integration (Sportradar, SportsData.io)
- [ ] Historical scorecard viewing
- [ ] Scorecard sharing/export
- [ ] Prediction accuracy tracking
- [ ] Round-by-round predictions before scoring opens
