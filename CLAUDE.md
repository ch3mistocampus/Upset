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

## UI Components
- **SurfaceCard**: Premium card with shadow, optional `heroGlow`, `animatedBorder`
- **FighterPickRow**: Fighter selection row with corner color indicator (red/blue), checkmark animation
- **SubmitFooter**: Sticky bottom submit button (BebasNeue font)
- **TopProgressBar**: 4px progress line under header

## Design Tokens (`lib/tokens.ts`)
- **Accent**: `#B0443F` (muted maroon red)
- **Display Font**: BebasNeue (UFC-style, uppercase)
- **Body Font**: System (SF Pro)
- **Shadows**: Deep card shadows for floating effect
- **Corner Colors**: Red `#943538`, Blue `#1E3A5F`

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

## Data Source
**UFCStats.com**: Fighter stats, events, fight cards, results
- Detailed career stats (SLpM, str_acc, stance, rankings)
- Historical fight records
- Synced via Edge Functions (`sync-events`, `sync-results`)

## Landing Page (upset-landing)
Separate repo: `ch3mistocampus/upset-landing`
- **URL**: https://upsetmma.app
- **Stack**: Next.js 16, Tailwind CSS v4, Framer Motion
- **Hosting**: Vercel
- **Theme**: High-Contrast Light Mode (white bg, red accents #D20A0A)

### Email Setup
- **Inbox**: Zoho Mail → hello@upsetmma.app
- **Transactional**: Resend (welcome emails, notifications)
- **DNS**: Vercel (MX → Zoho, DKIM/SPF → Resend)

### Waitlist
- **Table**: `waitlist` (email, source, created_at)
- **Edge Function**: `waitlist-signup`
  - Saves email to database
  - Sends welcome email to user via Resend
  - Sends notification to hello@upsetmma.app
- **Env vars** (Vercel): `NEXT_PUBLIC_SUPABASE_URL`
- **Secrets** (Supabase): `RESEND_API_KEY`

## Production Checklist
- [x] Landing page live at upsetmma.app
- [x] Waitlist form working with email notifications
- [x] Privacy policy URL (/privacy)
- [x] Terms of service URL (/terms)
- [x] Domain configured (upsetmma.app)
- [x] TestFlight builds (internal + external testers on build 5)
- [x] Test OAuth on real iOS device (native Google Sign-In implemented, pending build)
- [x] Verify deep links for auth callbacks (deep link handler added to useAuth)
- [x] Add Android OAuth client ID
- [ ] App Store assets (see `mobile/app-store-assets/APP_STORE_CHECKLIST.md`)

## Admin Portal
Access via Settings (admin users only):
- **Dashboard**: Overview stats (users, picks, events, pending reports)
- **Reports**: Review and action user reports
- **Users**: Search users, view stats, ban accounts
- **Posts**: Moderate reported posts/comments

Admin users are stored in `admin_users` table with roles: `moderator`, `admin`, `super_admin`

## Promo Video (`promo-video/`)
Built with Remotion (React video framework). 16-second portrait video for TikTok/Reels/Stories.

```bash
cd promo-video
npm install
npm start              # Preview in browser
npx remotion render UpsetPromoPortrait out/promo-portrait.mp4
```

**Scenes:** Hook → Fight Card → Fighter Stats → App Showcase (4 screens) → CTA

**Effects:** 3D phone tilt, dynamic shadows, screen glow, shimmer sweep, floating particles, staggered text reveal, confetti burst

See `promo-video/README.md` for full documentation.

## Post-Launch TODO
- [ ] **Superwall Integration** - Paywall and subscription management
  - See `mobile/docs/MONETIZATION_PLAN.md` for options
  - Decide on free vs premium features
  - Configure pricing (monthly/yearly/lifetime)
- [ ] **Payment Processing** - App Store in-app purchases
- [ ] **Subscription Database** - Track user entitlements

## Permissions
YOLO mode enabled via `.claude/settings.json` - Claude executes all tools without confirmation prompts.
