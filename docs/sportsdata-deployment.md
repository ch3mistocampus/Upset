# SportsData.io Integration Deployment Guide

## Overview

This guide covers deploying and testing the SportsData.io integration. The integration creates a parallel dataset alongside UFCStats data, allowing you to:
- Use SportsData.io for live events and fight cards (App Store compliant)
- Keep UFCStats data for detailed fighter statistics
- Compare data quality between sources

## Prerequisites

1. SportsData.io API key (trial or paid)
2. Supabase CLI installed and linked to your project
3. Database migrations applied

## Step 1: Apply Database Migration

```bash
# Link to your project (if not already linked)
supabase link --project-ref qcvsioaokjjqjhxxxvbm

# Apply the migration
supabase db push
```

This creates the following tables:
- `sportsdata_events` - Events from SportsData.io
- `sportsdata_fighters` - Fighter profiles
- `sportsdata_fights` - Fight cards
- `sportsdata_fight_fighters` - Fight participants
- `sportsdata_fight_stats` - Fight statistics
- `fighter_id_mappings` - Maps SportsData IDs to UFCStats IDs
- `event_id_mappings` - Maps event IDs between sources
- `sportsdata_sync_log` - Sync operation history

## Step 2: Set API Key

```bash
# Set the SportsData.io API key as a secret (trial key)
supabase secrets set SPORTSDATA_API_KEY=d3e269ed0b4747629bd4259b46252b5e
```

**Trial Key:** `d3e269ed0b4747629bd4259b46252b5e`

Note: This trial key has limitations (see table below). For production, contact sales@sportsdata.io for pricing.

## Step 3: Deploy Edge Functions

```bash
# Deploy the sync function
supabase functions deploy sync-sportsdata

# Deploy the ID mapping function
supabase functions deploy map-fighter-ids
```

## Step 4: Run Initial Sync

### Health Check
```bash
curl "https://qcvsioaokjjqjhxxxvbm.supabase.co/functions/v1/sync-sportsdata?health=true" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Sync Events (2026 schedule)
```bash
curl -X POST "https://qcvsioaokjjqjhxxxvbm.supabase.co/functions/v1/sync-sportsdata?type=events" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Sync Fighters
```bash
curl -X POST "https://qcvsioaokjjqjhxxxvbm.supabase.co/functions/v1/sync-sportsdata?type=fighters" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Sync Specific Event with Fights
```bash
# Get UFC 324 (Event ID 891) with all fights
curl -X POST "https://qcvsioaokjjqjhxxxvbm.supabase.co/functions/v1/sync-sportsdata?type=event&id=891" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Full Sync (events + fighters)
```bash
curl -X POST "https://qcvsioaokjjqjhxxxvbm.supabase.co/functions/v1/sync-sportsdata" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## Step 5: Map Fighter IDs

After syncing, run the ID mapping to link SportsData fighters to UFCStats fighters:

```bash
# Get mapping statistics
curl "https://qcvsioaokjjqjhxxxvbm.supabase.co/functions/v1/map-fighter-ids?stats=true" \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Run auto-mapping (creates high-confidence matches)
curl -X POST "https://qcvsioaokjjqjhxxxvbm.supabase.co/functions/v1/map-fighter-ids" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"

# Run with verification mode (only 95%+ confidence)
curl -X POST "https://qcvsioaokjjqjhxxxvbm.supabase.co/functions/v1/map-fighter-ids?verify=true" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## Verifying Data

### Check synced events
```sql
SELECT sportsdata_event_id, name, event_datetime, status
FROM sportsdata_events
WHERE event_datetime > now()
ORDER BY event_datetime
LIMIT 10;
```

### Check synced fighters
```sql
SELECT sportsdata_fighter_id, full_name, wins, losses, weight_class
FROM sportsdata_fighters
ORDER BY wins DESC
LIMIT 20;
```

### Check fighter mappings
```sql
SELECT
  fm.sportsdata_name,
  fm.ufcstats_name,
  fm.match_method,
  fm.match_confidence,
  fm.is_verified
FROM fighter_id_mappings fm
ORDER BY fm.match_confidence DESC
LIMIT 20;
```

### Compare records between sources
```sql
SELECT * FROM compare_fighter_records(20);
```

### Check sync history
```sql
SELECT sync_type, status, items_fetched, items_created, items_updated, started_at
FROM sportsdata_sync_log
ORDER BY started_at DESC
LIMIT 10;
```

## Data Comparison Queries

### Find fighters in SportsData but not UFCStats
```sql
SELECT sf.full_name, sf.wins, sf.losses, sf.weight_class
FROM sportsdata_fighters sf
LEFT JOIN fighter_id_mappings fm ON fm.sportsdata_fighter_id = sf.sportsdata_fighter_id
WHERE fm.id IS NULL
ORDER BY sf.wins DESC
LIMIT 20;
```

### Find record discrepancies
```sql
SELECT
  sf.full_name AS sportsdata_name,
  sf.wins AS sd_wins, sf.losses AS sd_losses,
  uf.full_name AS ufcstats_name,
  uf.record_wins AS ufc_wins, uf.record_losses AS ufc_losses
FROM sportsdata_fighters sf
JOIN fighter_id_mappings fm ON fm.sportsdata_fighter_id = sf.sportsdata_fighter_id
JOIN ufc_fighters uf ON uf.fighter_id = fm.ufcstats_fighter_id
WHERE sf.wins != uf.record_wins OR sf.losses != uf.record_losses
ORDER BY sf.wins DESC;
```

## Trial Key Limitations

The trial API key (`d3e269ed0b4747629bd4259b46252b5e`) has these limitations:

| Endpoint | Status | Notes |
|----------|--------|-------|
| `/Leagues` | ✅ Works | Full data |
| `/Schedule/UFC/{year}` | ✅ Works | Full data |
| `/FightersBasic` | ✅ Works | Full data |
| `/Event/{id}` | ⚠️ Partial | Some fields "Scrambled" |
| `/Fighters` | ❌ 401 | Requires paid subscription |
| `/Fighter/{id}` | ❌ 401 | Requires paid subscription |
| `/FightFinal/{id}` | ⚠️ Partial | Stats may be scrambled |
| `/odds/*` | ❌ 401 | Requires paid subscription |

## Production Recommendations

1. **Contact SportsData.io** for actual pricing: sales@sportsdata.io
2. **Set up scheduled syncs** using Supabase CRON or external scheduler
3. **Monitor sync logs** for failures
4. **Verify ID mappings** manually for important fighters

## Scheduled Sync (Optional)

Add to Supabase Dashboard → Database → Extensions → pg_cron:

```sql
-- Sync events daily at 6 AM UTC
SELECT cron.schedule(
  'sync-sportsdata-events',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://qcvsioaokjjqjhxxxvbm.supabase.co/functions/v1/sync-sportsdata?type=events',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);

-- Sync specific event with fights on event day
-- (Run manually or trigger based on event schedule)
```

## Troubleshooting

### "API key requires paid subscription"
The endpoint you're trying to access needs a paid API key. Check the limitations table above.

### "Failed to fetch from SportsData.io"
- Check network connectivity
- Verify API key is set correctly
- Check rate limits (trial: limited requests)

### "No fighters mapped"
Run sync-sportsdata first to populate sportsdata_fighters, then run map-fighter-ids.

### Low mapping coverage
Some fighters may have different name spellings. Review the `low_confidence_sample` in the mapping response and manually verify/update mappings.
