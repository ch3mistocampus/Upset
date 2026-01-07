# UFC Data Pipeline

One-time data import pipeline for UFC fighter statistics. Downloads CSV data from
the [Greco1899/scrape_ufc_stats](https://github.com/Greco1899/scrape_ufc_stats)
GitHub repository and imports it into Supabase.

## Overview

This pipeline:
1. **Downloads** CSV files from GitHub (fighter details, events, fights, stats)
2. **Validates** required columns and data integrity
3. **Transforms** raw CSV data into normalized database records
4. **Imports** data into Supabase with idempotent upserts

## Prerequisites

- [Deno](https://deno.land/) runtime (v1.40+)
- Supabase project with migrations applied
- Service role key for bypassing RLS during import

## Environment Setup

Set these environment variables before running the import:

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

You can find these in your Supabase project settings under API.

## Usage

### Via npm scripts (recommended)

```bash
# Download latest data from GitHub
npm run ufc:data:pull

# Import a downloaded snapshot
npm run ufc:data:import -- 20260108143022_a1b2

# Full pipeline: download and import
npm run ufc:data:pull-and-import

# List available snapshots
npm run ufc:data:list
```

### Direct Deno commands

```bash
cd scripts/ufc-data

# Download
deno run --allow-net --allow-read --allow-write main.ts pull

# Import
deno run --allow-net --allow-env --allow-read --allow-write main.ts import <snapshot_id>

# Full pipeline
deno run --allow-net --allow-env --allow-read --allow-write main.ts pull-and-import

# List snapshots
deno run --allow-read main.ts list

# Help
deno run main.ts help
```

### Options

- `--branch, -b <branch>` - Git branch to download from (default: `main`)

## Data Flow

```
GitHub (Greco1899/scrape_ufc_stats)
         |
         v
  [1] Download CSVs
         |
         v
   data/ufc/snapshots/{id}/raw/
         |
         v
  [2] Validate columns
         |
         v
  [3] Transform & normalize
         |
         v
  [4] Upsert to Supabase
         |
         v
   ufc_fighters, ufc_events,
   ufc_fights, ufc_fight_stats
```

## Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `ufc_source_snapshots` | Tracks import runs for auditing |
| `ufc_fighters` | Fighter profiles and career stats |
| `ufc_events` | UFC event information |
| `ufc_fights` | Individual fights with results |
| `ufc_fight_stats` | Per-round and total fight statistics |

### RPC Functions

- `search_ufc_fighters(query, limit)` - Search fighters by name
- `get_fighter_profile_and_history(fighter_id)` - Get fighter profile with fight history

## Source Files

| File | Description |
|------|-------------|
| `config.ts` | Configuration, URLs, parsing utilities |
| `downloader.ts` | Downloads CSVs from GitHub |
| `validator.ts` | Validates column structure |
| `transformer.ts` | Transforms CSV to database records |
| `importer.ts` | Upserts data into Supabase |
| `main.ts` | CLI entry point |

## CSV Files

The pipeline processes these files from the source repository:

| File | Description |
|------|-------------|
| `ufc_fighter_details.csv` | Fighter names and profile URLs |
| `ufc_fighter_tott.csv` | "Tale of the tape" - physical stats |
| `ufc_event_details.csv` | Event dates and locations |
| `ufc_fight_details.csv` | Event-to-fight mappings |
| `ufc_fight_results.csv` | Fight outcomes and methods |
| `ufc_fight_stats.csv` | Per-round strike/grappling stats |

## Snapshots

Each download creates a timestamped snapshot:

```
data/ufc/snapshots/
  20260108143022_a1b2/
    metadata.json       # Download info
    raw/                # Original CSV files
      ufc_fighter_details.csv
      ufc_fighter_tott.csv
      ...
    report.json         # Import results (after import)
```

Snapshots are preserved for debugging and auditing.

## Troubleshooting

### "Missing environment variables"

Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` before importing.

### "Validation failed"

Check the error messages for missing columns. The source CSV format may have changed.

### "Foreign key violation"

Ensure you're importing in order: fighters and events before fights, fights before stats.
The pipeline handles this automatically.

### Network errors during download

Retry the download. The pipeline will create a new snapshot.

### Duplicate key errors

The pipeline uses upserts, so duplicates are updated rather than causing errors.
If you see persistent issues, check the snapshot's `report.json` for details.

## ID Stability

Fighter, event, and fight IDs are extracted from UFCStats URLs:

```
http://ufcstats.com/fighter-details/93fe7332d16c6ad9
                                   ^^^^^^^^^^^^^^^^
                                   This becomes the fighter_id
```

This ensures stable IDs across imports.

## Notes

- This is a **one-time import** pipeline for historical data
- Re-running is safe (idempotent upserts)
- No ongoing sync or scheduled updates
- Source data comes from UFCStats.com via the Greco1899 scraper
