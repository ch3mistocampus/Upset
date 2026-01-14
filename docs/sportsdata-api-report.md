# SportsData.io MMA API Feasibility Report

**Date:** January 13, 2026
**API Key:** `d3e269ed0b4747629bd4259b46252b5e` (Trial)

---

## Executive Summary

SportsData.io provides a comprehensive MMA API that could replace UFCStats.com scraping. However, **the trial key has significant limitations** that block access to critical endpoints. A paid subscription would be required for production use.

**Verdict: FEASIBLE but requires paid subscription (~$200-500/month based on typical sports data pricing)**

---

## API Overview

### Base URLs
- **Scores:** `https://api.sportsdata.io/v3/mma/scores`
- **Stats:** `https://api.sportsdata.io/v3/mma/stats`
- **Odds:** `https://api.sportsdata.io/v3/mma/odds`

### Authentication
- API key via query param: `?key={api_key}`
- Or header: `Ocp-Apim-Subscription-Key: {api_key}`

---

## Data Availability Matrix

### Available with Trial Key

| Endpoint | Status | Data Quality |
|----------|--------|--------------|
| `/Leagues` | ✅ Works | Full data |
| `/Schedule/UFC/{year}` | ✅ Works | Full data (2019-2026) |
| `/FightersBasic` | ✅ Works | Full data |
| `/Event/{id}` | ⚠️ Partial | Some fields "Scrambled" |
| `/FightFinal/{id}` | ⚠️ Partial | Stats scrambled/randomized |

### Requires Paid Subscription (401 Unauthorized)

| Endpoint | Purpose |
|----------|---------|
| `/Fighter/{id}` | Full fighter profile |
| `/Fighters` | Complete fighter roster |
| `/EventOdds/{id}` | Betting odds |
| `/BettingFighterPropsByEvent/{id}` | Prop bets |
| All `/odds/` endpoints | Betting data |

---

## Data Field Comparison

### Fighters - What SportsData.io Provides

```json
{
  "FighterId": 140000004,
  "FirstName": "Belal",
  "LastName": "Muhammad",
  "Nickname": "Remember the Name",
  "WeightClass": "Welterweight",
  "BirthDate": "1988-07-09T00:00:00",
  "Height": 71.00,       // inches
  "Weight": 171.00,      // lbs
  "Reach": 72.00,        // inches
  "Wins": 24,
  "Losses": 5,
  "Draws": 0,
  "NoContests": 1,
  "TechnicalKnockouts": 5,
  "TechnicalKnockoutLosses": 1,
  "Submissions": 1,
  "SubmissionLosses": 0,
  "TitleWins": 2,
  "TitleLosses": 1,
  "TitleDraws": 0
}
```

### Your Current `ufc_fighters` Table

| Your Field | SportsData.io Equivalent | Status |
|------------|--------------------------|--------|
| `fighter_id` | `FighterId` | ✅ Available |
| `first_name` | `FirstName` | ✅ Available |
| `last_name` | `LastName` | ✅ Available |
| `full_name` | Concatenate First+Last | ✅ Derivable |
| `nickname` | `Nickname` | ✅ Available |
| `dob` | `BirthDate` | ✅ Available |
| `height_inches` | `Height` | ✅ Available |
| `weight_lbs` | `Weight` | ✅ Available |
| `reach_inches` | `Reach` | ✅ Available |
| `stance` | ❌ Not provided | ❌ MISSING |
| `record_wins` | `Wins` | ✅ Available |
| `record_losses` | `Losses` | ✅ Available |
| `record_draws` | `Draws` | ✅ Available |
| `record_nc` | `NoContests` | ✅ Available |
| `slpm` | ❌ Not provided | ❌ MISSING |
| `sapm` | ❌ Not provided | ❌ MISSING |
| `str_acc` | ❌ Not provided | ❌ MISSING |
| `str_def` | ❌ Not provided | ❌ MISSING |
| `td_avg` | ❌ Not provided | ❌ MISSING |
| `td_acc` | ❌ Not provided | ❌ MISSING |
| `td_def` | ❌ Not provided | ❌ MISSING |
| `sub_avg` | ❌ Not provided | ❌ MISSING |
| `ko_tko_wins` | `TechnicalKnockouts` | ✅ Available |
| `submission_wins` | `Submissions` | ✅ Available |
| `decision_wins` | Derivable (Wins - KO - Sub) | ✅ Derivable |
| `ranking` | ❌ Not provided | ❌ MISSING |

### Events - What SportsData.io Provides

```json
{
  "EventId": 891,
  "LeagueId": 1,
  "Name": "UFC 324: Gaethje vs. Pimblett",
  "ShortName": "UFC 324",
  "Season": 2026,
  "Day": "2026-01-24T00:00:00",
  "DateTime": "2026-01-24T17:00:00",
  "Status": "Scheduled",
  "Active": true
}
```

### Your Current `events` Table

| Your Field | SportsData.io Equivalent | Status |
|------------|--------------------------|--------|
| `id` | Internal UUID | Your ID |
| `ufcstats_event_id` | `EventId` | ✅ Can map |
| `name` | `Name` | ✅ Available |
| `event_date` | `DateTime` | ✅ Available |
| `location` | ❌ Not in basic endpoint | ❌ MISSING |
| `status` | `Status` | ✅ Available (different values) |

### Fight Stats - What SportsData.io Provides (Scrambled in Trial)

```json
{
  "FighterId": 140000026,
  "Winner": true,
  "FantasyPoints": 71.6,
  "Knockdowns": 0.4,
  "TotalStrikesAttempted": 15.4,
  "TotalStrikesLanded": 12.0,
  "SigStrikesAttempted": 15.4,
  "SigStrikesLanded": 12.0,
  "TakedownsAttempted": 0.0,
  "TakedownsLanded": 0.0,
  "Reversals": 0.0,
  "Submissions": 0.0,
  "TimeInControl": 0.0,
  "FirstRoundWin": true
}
```

### Your Current `ufc_fight_stats` Table

| Your Field | SportsData.io Equivalent | Status |
|------------|--------------------------|--------|
| `knockdowns` | `Knockdowns` | ✅ Available |
| `sig_str_landed` | `SigStrikesLanded` | ✅ Available |
| `sig_str_attempted` | `SigStrikesAttempted` | ✅ Available |
| `total_str_landed` | `TotalStrikesLanded` | ✅ Available |
| `total_str_attempted` | `TotalStrikesAttempted` | ✅ Available |
| `td_landed` | `TakedownsLanded` | ✅ Available |
| `td_attempted` | `TakedownsAttempted` | ✅ Available |
| `sub_attempts` | `Submissions` | ✅ Available |
| `reversals` | `Reversals` | ✅ Available |
| `ctrl_time_seconds` | `TimeInControl` | ✅ Available |
| `head_landed/attempted` | ❌ Not provided | ❌ MISSING |
| `body_landed/attempted` | ❌ Not provided | ❌ MISSING |
| `leg_landed/attempted` | ❌ Not provided | ❌ MISSING |
| `distance_landed/attempted` | ❌ Not provided | ❌ MISSING |
| `clinch_landed/attempted` | ❌ Not provided | ❌ MISSING |
| `ground_landed/attempted` | ❌ Not provided | ❌ MISSING |
| Round-by-round breakdown | ❌ Only totals | ❌ MISSING |

---

## Critical Missing Data

### 1. Career Statistics (MAJOR GAP)
SportsData.io does **NOT** provide:
- `slpm` (Significant Strikes Landed Per Minute)
- `sapm` (Significant Strikes Absorbed Per Minute)
- `str_acc` (Striking Accuracy)
- `str_def` (Striking Defense)
- `td_avg` (Takedown Average)
- `td_acc` (Takedown Accuracy)
- `td_def` (Takedown Defense)
- `sub_avg` (Submission Average)

**Impact:** These are key stats shown on fighter profiles. You'd need to calculate them from historical fight data.

### 2. Fighter Stance
Not provided by any endpoint. Would need a secondary data source.

### 3. UFC Rankings
Not provided. Would need to scrape or find another source.

### 4. Granular Strike Location Data
No breakdown of:
- Head/Body/Leg strikes
- Distance/Clinch/Ground strikes

**Impact:** Less detailed fight analysis than UFCStats provides.

### 5. Round-by-Round Stats
Only fight totals available, not per-round breakdowns.

### 6. Event Location/Venue
Not in basic schedule endpoint. May be in paid tier.

---

## API Strengths (vs UFCStats Scraping)

| Feature | SportsData.io | UFCStats Scraping |
|---------|---------------|-------------------|
| **Reliability** | ✅ Stable API | ⚠️ Can break with HTML changes |
| **Rate Limits** | Clear limits (30s-1hr) | Unknown/risky |
| **Legal/TOS** | ✅ Licensed data | ⚠️ Potentially violates TOS |
| **App Store Compliance** | ✅ Commercial license | ⚠️ May cause rejection |
| **Live Updates** | ✅ 10-second refresh | ❌ Not feasible |
| **Betting Odds** | ✅ 20+ sportsbooks | ❌ Not available |
| **Historical Data** | ✅ Back to 2019 | ✅ Full history |
| **Support** | ✅ Paid support | ❌ None |

---

## Pricing Estimate

Based on typical sports data API pricing:

| Tier | Typical Price | Includes |
|------|---------------|----------|
| **Trial** | Free | Schedules, basic fighters (scrambled details) |
| **Basic** | ~$50-100/mo | Full schedules, fighter profiles |
| **Standard** | ~$200-300/mo | + Fight stats, event details |
| **Premium** | ~$400-500/mo | + Odds, live data, props |
| **Enterprise** | Custom | Everything + SLA |

Contact: sales@sportsdata.io for actual pricing.

---

## Implementation Recommendations

### Option A: SportsData.io + Supplemental Source (Recommended)
1. Use SportsData.io for:
   - Events schedule (real-time updates)
   - Bout lineups
   - Fight results
   - Basic fighter info
   - Betting odds (premium)

2. Keep UFCStats scraping (or find alternative) for:
   - Career statistics (slpm, str_acc, etc.)
   - Fighter stance
   - Rankings
   - Detailed strike breakdown

**Pros:** Best of both worlds, App Store compliant for core features
**Cons:** Two data sources to maintain

### Option B: SportsData.io Only
1. Use SportsData.io for everything
2. Calculate career stats from historical fight data
3. Drop features requiring missing data (stance, rankings, strike breakdown)

**Pros:** Single source, fully licensed
**Cons:** Missing key features, requires significant data processing

### Option C: Continue UFCStats Scraping
1. Keep current approach
2. Add proxy/rate limiting
3. Risk App Store rejection

**Pros:** Full data, no cost
**Cons:** Legal risk, maintenance burden, potential rejection

---

## Next Steps

1. **Contact SportsData.io sales** for actual pricing and full endpoint access
2. **Request trial extension** with full data access to validate
3. **Test ID mapping** between your UFCStats IDs and SportsData FighterIds
4. **Decide on data strategy** based on pricing and feature priorities

---

## API Integration Files Created

The following files have been created for integration:

```
mobile/lib/sportsdata/
├── client.ts         # API client with typed responses
├── types.ts          # TypeScript types for API responses
├── mappers.ts        # Functions to map API data to your schema
└── hooks.ts          # React Query hooks for the API
```

See these files for implementation details.
