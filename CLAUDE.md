# UFC Picks Tracker

MMA fan app for predicting UFC fight outcomes. Track pick accuracy, discuss fights, compete on leaderboards.

## Current Priority
**App Store production launch** - all features working, compliant data source, polished UI.

## Stack
- **Mobile**: Expo 54, React Native, TypeScript, Expo Router
- **Data**: React Query, Supabase (Postgres + Edge Functions + Auth)
- **Monitoring**: Sentry (error tracking, crash reporting)
- **Scraping**: Deno Edge Functions + Cheerio (UFCStats.com)

## Structure
```
mobile/
  app/              # Screens (file-based routing)
  components/       # UI components
  hooks/            # React Query hooks (useAuth, useQueries, useFighterStats)
  lib/              # supabase.ts, theme.tsx, tokens.ts, sentry.ts
  types/            # database.ts (auto-generated)
supabase/
  functions/        # Edge Functions (sync-events, sync-results)
  migrations/       # SQL schema
```

## Commands
```bash
cd mobile && npm start          # Dev server (Expo Go)
npx expo run:ios                # Native iOS build (required for Sentry/Apple Sign-In)
npm test                        # Run tests
supabase functions serve        # Local Edge Functions
eas build --platform ios        # Production build
```

## Authentication
- **Email/Password**: Full support with validation
- **Google OAuth**: Configured for iOS/Web (needs Android client ID)
- **Apple Sign-In**: Configured (requires native build, not Expo Go)
- **Guest Mode**: Browse-only access without account

## Error Tracking (Sentry)
- Configured in `lib/sentry.ts`
- Only active in production builds (`enabled: !__DEV__`)
- Test button in Settings (dev mode only)
- Dashboard: sentry.io → Project: react-native

## Code Standards
- TypeScript strict, explicit return types
- React Query for all data fetching (staleTime: 5min default)
- No nested ternaries - use if/else or helper functions
- Always write tests for new code
- RLS policies on all tables

## Key Patterns
- **Loading**: `<SkeletonCard />`
- **Errors**: `<ErrorState message="..." onRetry={refetch} />`
- **Empty**: `<EmptyState icon="..." title="..." message="..." />`
- **Toast**: `useToast()` → `showSuccess()`, `showError()`, `showInfo()`
- **Navigation**: `GlobalTabBar` on all detail screens

## Environment Variables
```bash
# Required
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=

# OAuth (optional for dev)
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=
EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=

# Monitoring
EXPO_PUBLIC_SENTRY_DSN=
```

## EAS Configuration
- Project: @chemistoncampusx/upset
- Secrets: Use `eas env:create` for production secrets
- Build profiles in `eas.json`: development, preview, production

## Data Source Status
**Hybrid approach implemented:**
- **UFCStats.com**: Detailed fighter stats (SLpM, str_acc, stance, rankings)
- **SportsData.io**: Live events, schedules, fight cards (App Store compliant)

### SportsData.io Integration
```
supabase/functions/
├── sync-sportsdata/     # Syncs events, fighters, fights
├── map-fighter-ids/     # Auto-maps SportsData ↔ UFCStats IDs

Database tables (sportsdata_*):
├── sportsdata_events    # Events from SportsData.io
├── sportsdata_fighters  # Fighter profiles
├── sportsdata_fights    # Fight cards
├── sportsdata_fight_fighters  # Fight participants
├── sportsdata_fight_stats     # Fight statistics
├── fighter_id_mappings  # ID mapping between sources
└── event_id_mappings    # Event ID mapping
```

**Setup:**
```bash
# Set API key
supabase secrets set SPORTSDATA_API_KEY=your_key

# Sync data
curl -X POST https://your-project.supabase.co/functions/v1/sync-sportsdata

# Map fighter IDs
curl -X POST https://your-project.supabase.co/functions/v1/map-fighter-ids
```

## Production Checklist
- [ ] Enable leaked password protection (Supabase Auth dashboard)
- [ ] Test OAuth on real iOS device
- [ ] Verify deep links for auth callbacks
- [ ] Add Android OAuth client ID
- [ ] App Store assets (screenshots, description)
- [ ] Privacy policy URL
- [ ] Terms of service URL

## Permissions
YOLO mode enabled via `.claude/settings.json` - Claude executes all tools without confirmation prompts.
