# UFCStats.com Data Structure

## Overview
UFCStats is the official UFC statistics website that provides comprehensive fight data.

## Key URLs
- Events List: `http://ufcstats.com/statistics/events/completed?page=all`
- Event Details: `http://ufcstats.com/event-details/{event_id}`
- Fight Details: `http://ufcstats.com/fight-details/{fight_id}`

## Data Structure

### Events List Page
**URL**: `http://ufcstats.com/statistics/events/completed?page=all`

**Scraping Target**: `table.b-statistics__table tbody tr`

**Fields**:
```typescript
{
  ufcstats_event_id: string,     // Extracted from event URL
  event_url: string,              // Full URL to event page
  name: string,                   // e.g., "UFC 300: Pereira vs. Hill"
  date_text: string,              // e.g., "April 13, 2024"
  location: string | null         // e.g., "Las Vegas, Nevada, USA"
}
```

### Event Card Page
**URL**: `http://ufcstats.com/event-details/{event_id}`

**Scraping Target**: `table.b-fight-details__table tbody tr`

**Fields**:
```typescript
{
  ufcstats_fight_id: string,      // Extracted from fight URL
  fight_url: string,               // Full URL to fight details
  order_index: number,             // 0-based index (0 = main event)
  red_fighter_id: string,          // Extracted from fighter URL
  blue_fighter_id: string,         // Extracted from fighter URL
  red_name: string,                // Fighter name
  blue_name: string,               // Fighter name
  weight_class: string | null,     // e.g., "Lightweight", "Catchweight"
  method: string | null,           // If fight completed: e.g., "KO/TKO"
  round: number | null,            // Round number (1-5)
  time: string | null              // Time in round: "4:32"
}
```

**Notes**:
- If `method` is present, the fight has completed
- If `method` is null/empty, the fight is upcoming
- Order appears with main event first (index 0)

### Fight Details Page
**URL**: `http://ufcstats.com/fight-details/{fight_id}`

**Scraping Targets**:
- Winner: `div.b-fight-details__person` with `i.b-fight-details__person-status` = "W"
- Details: `p.b-fight-details__text` sections

**Fields**:
```typescript
{
  winner_corner: "red" | "blue" | "draw" | "nc" | null,
  method: string | null,           // e.g., "KO/TKO", "Submission", "Decision - Unanimous"
  round: number | null,            // Round number
  time: string | null,             // Time in round
  details: string | null           // Additional details (e.g., "Punches")
}
```

**Winner Detection**:
- `<i>` tag with text "W" = winner
- "D" = draw
- "NC" = no contest
- Check first `div.b-fight-details__person` for red corner, second for blue

## Database Schema Mapping

### events table
```
ufcstats_event_id → unique identifier from URL
name → event name
event_date → parse date_text to timestamptz
location → location string
status → derive from event_date and results availability
```

### bouts table
```
ufcstats_fight_id → unique identifier from URL
event_id → FK to events
order_index → preserve fight order from event card
red_fighter_ufcstats_id → fighter ID from URL
blue_fighter_ufcstats_id → fighter ID from URL
red_name → fighter name
blue_name → fighter name
weight_class → weight class
status → "scheduled" | "completed" | "canceled" | "replaced"
```

### results table
```
bout_id → FK to bouts (one-to-one)
winner_corner → "red" | "blue" | "draw" | "nc"
method → method string
round → round number
time → time string
details → additional details
```

## Scraping Strategy

### Rate Limiting
- 500-1000ms delay between requests
- Exponential backoff on failures
- Max 3 retries

### User Agent
```
Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36
```

### Defensive Parsing
- Always check if elements exist before accessing
- Return null for missing data (don't throw)
- Log warnings for unexpected structures
- Never overwrite existing data if parse returns 0 results

## Sync Timing

### sync_events (Daily)
- Fetches all events from completed page
- Upserts by ufcstats_event_id
- Updates status based on event_date

### sync_next_event_card (Daily, more frequent near fight day)
- Finds next upcoming event (event_date >= now())
- Fetches event card
- Upserts bouts by ufcstats_fight_id
- Detects cancelled fights (missing from new fetch)

### sync_recent_results_and_grade (Every 6 hours)
- Finds events with event_date <= now() and status != 'completed'
- Fetches fight details for each bout
- Upserts results
- Grades picks
- Updates user_stats
- Marks event as completed when all fights have results

## Edge Cases

### Cancelled Fights
- Fight disappears from event card → mark bout.status = 'canceled', void picks

### Changed Fighters
- Fighter changes detected by ufcstats_fight_id mismatch → treat as new fight, void old picks

### Draws/No Contests
- winner_corner = "draw" or "nc" → void picks (score = null)

### Preliminary Card Changes
- Use card_snapshot field to track major card changes
- Increment on significant changes (main card restructure)

## Testing Notes
- Scraper tested against real UFCStats structure
- Will validate in Supabase Edge Functions environment (has network access)
- Local environment may block external HTTP requests
