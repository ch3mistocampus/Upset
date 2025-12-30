# Deploying Edge Functions to Supabase

## Prerequisites
- Supabase project: https://qcvsioaokjjqjhxxxvbm.supabase.co

## Method 1: Supabase Dashboard (Recommended)

### Step 1: Navigate to Edge Functions
1. Go to https://supabase.com/dashboard/project/qcvsioaokjjqjhxxxvbm/functions
2. Click "Deploy a new function"

### Step 2: Deploy Each Function

#### Function 1: sync-events
1. Function name: `sync-events`
2. Copy the code from: `supabase/functions/sync-events/index.ts`
3. Also need to include: `supabase/functions/_shared/ufcstats-scraper.ts`
4. Deploy

#### Function 2: sync-next-event-card
1. Function name: `sync-next-event-card`
2. Copy the code from: `supabase/functions/sync-next-event-card/index.ts`
3. Also need to include: `supabase/functions/_shared/ufcstats-scraper.ts`
4. Deploy

#### Function 3: sync-recent-results-and-grade
1. Function name: `sync-recent-results-and-grade`
2. Copy the code from: `supabase/functions/sync-recent-results-and-grade/index.ts`
3. Also need to include: `supabase/functions/_shared/ufcstats-scraper.ts`
4. Deploy

### Step 3: Run Functions in Order

Once deployed, run them in this sequence:

1. **First**: `sync-events` - Populates events table with UFC events
   ```bash
   curl -X POST https://qcvsioaokjjqjhxxxvbm.supabase.co/functions/v1/sync-events \
     -H "Authorization: Bearer YOUR_ANON_KEY"
   ```

2. **Second**: `sync-next-event-card` - Populates bouts for next event
   ```bash
   curl -X POST https://qcvsioaokjjqjhxxxvbm.supabase.co/functions/v1/sync-next-event-card \
     -H "Authorization: Bearer YOUR_ANON_KEY"
   ```

3. **Third**: `sync-recent-results-and-grade` - Gets results and grades picks
   ```bash
   curl -X POST https://qcvsioaokjjqjhxxxvbm.supabase.co/functions/v1/sync-recent-results-and-grade \
     -H "Authorization: Bearer YOUR_ANON_KEY"
   ```

## Method 2: Using Supabase CLI (Alternative)

If you update your Command Line Tools:

```bash
# Install CLI
brew install supabase/tap/supabase

# Login
supabase login

# Link project
supabase link --project-ref qcvsioaokjjqjhxxxvbm

# Deploy all functions
supabase functions deploy sync-events
supabase functions deploy sync-next-event-card
supabase functions deploy sync-recent-results-and-grade
```

## Verification

After running the functions, check your Supabase database:
- `events` table should have UFC events
- `bouts` table should have fights for the next event
- `results` table should have fight outcomes

Then the mobile app should load data successfully!
