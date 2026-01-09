# UFC Picks Tracker

MMA fan app for predicting UFC fight outcomes. Track pick accuracy, discuss fights, compete on leaderboards.

## Current Priority
**App Store production launch** - all features working, compliant data source, polished UI.

## Stack
- **Mobile**: Expo 54, React Native, TypeScript, Expo Router
- **Data**: React Query, Supabase (Postgres + Edge Functions + Auth)
- **Scraping**: Deno Edge Functions + Cheerio (UFCStats.com)

## Structure
```
mobile/
  app/          # Screens (file-based routing)
  components/   # UI components
  hooks/        # React Query hooks (useAuth, useQueries, useFighterStats)
  lib/          # supabase.ts, theme.tsx, tokens.ts
  types/        # database.ts (auto-generated)
supabase/
  functions/    # Edge Functions (sync-events, sync-results)
  migrations/   # SQL schema
```

## Commands
```bash
cd mobile && npm start      # Dev server
npm test                    # Run tests (always run before committing)
supabase functions serve    # Local Edge Functions
```

## Code Standards
- TypeScript strict, explicit return types
- React Query for all data fetching (staleTime: 5min default)
- No nested ternaries - use if/else or helper functions
- Always write tests for new code
- RLS policies on all tables

## Key Patterns
- Loading: `<SkeletonCard />`
- Errors: `<ErrorState message="..." onRetry={refetch} />`
- Empty: `<EmptyState icon="..." title="..." message="..." />`

## Data Source Status
UFCStats.com scraping works but needs App Store compliant alternative. Evaluating official APIs.

## Dangerous Settings
This project runs with `dangerouslySkipPermissions: true` - Claude executes without confirmation prompts.
