# UFC Picks Tracker MVP

A mobile app for tracking your UFC pick accuracy over time. Make picks for upcoming UFC events, lock them before the event starts, then automatically grade them after results are synced from UFCStats.com.

## Features

### Core Functionality
- ✅ **Make Picks**: Tap to select winners for upcoming UFC fights
- ✅ **Auto-Lock**: Picks automatically lock at event start time
- ✅ **Auto-Grade**: Results synced from UFCStats and picks graded automatically
- ✅ **Track Stats**: View accuracy %, current streak, best streak
- ✅ **Recent History**: See how you performed on recent events

### User Experience
- 🌑 Dark mode by default
- 📱 Built with Expo (works on iOS, Android, Web)
- ⚡ Offline-first with React Query caching
- 🔒 Secure with Supabase Auth (email OTP)
- 🎯 No betting odds, money, or leaderboards (pure accuracy tracking)

## Tech Stack

### Frontend (Mobile)
- **Expo** - React Native framework
- **TypeScript** - Type safety
- **Expo Router** - File-based navigation
- **React Query** - Data fetching and caching
- **Supabase JS Client** - Database and auth

### Backend
- **Supabase** - Postgres database + Auth + Edge Functions
- **Postgres** - 6 tables with RLS policies
- **Edge Functions** (Deno) - UFCStats scraping and pick grading
- **GitHub Actions** - Scheduled data syncs

### Data Source
- **UFCStats.com** - Official UFC statistics (scraped via Edge Functions)

## Project Structure

```
Upset/
├── mobile/                      # Expo React Native app
│   ├── app/                    # Expo Router screens
│   │   ├── (auth)/            # Auth flow
│   │   │   ├── sign-in.tsx    # Email OTP sign in
│   │   │   └── create-username.tsx
│   │   ├── (tabs)/            # Main app tabs
│   │   │   ├── home.tsx       # Next event + countdown
│   │   │   ├── pick.tsx       # Make picks
│   │   │   ├── stats.tsx      # Accuracy + streaks
│   │   │   └── profile.tsx    # User info + logout
│   │   ├── _layout.tsx        # Root layout + providers
│   │   └── index.tsx          # Auth routing
│   ├── hooks/                 # React Query hooks
│   │   ├── useAuth.ts         # Auth state + methods
│   │   └── useQueries.ts      # Data fetching hooks
│   ├── lib/                   # Configuration
│   │   └── supabase.ts        # Supabase client
│   ├── types/                 # TypeScript types
│   │   └── database.ts        # DB schema types
│   └── package.json
│
├── supabase/                   # Backend
│   ├── functions/             # Edge Functions (Deno)
│   │   ├── _shared/
│   │   │   └── ufcstats-scraper.ts  # Scraping utilities
│   │   ├── sync-events/       # Daily: sync events
│   │   ├── sync-next-event-card/    # Daily: sync bouts
│   │   └── sync-recent-results-and-grade/  # Every 6h: grade picks
│   └── migrations/            # SQL migrations
│       ├── 20250101000000_initial_schema.sql
│       └── 20250101000001_rls_policies.sql
│
├── .github/
│   └── workflows/
│       └── sync-ufcstats.yml  # Scheduled syncs
│
└── README.md                   # This file
```

## Database Schema

### Tables

1. **profiles** - User profiles with unique usernames
2. **events** - UFC events from UFCStats
3. **bouts** - Individual fights with fighter details
4. **results** - Fight outcomes (winner, method, round, time)
5. **picks** - User predictions with locking/grading status
6. **user_stats** - Denormalized stats (accuracy, streaks)

### Key Features
- **RLS Policies**: Secure row-level access control
- **Pick Locking**: Trigger prevents changes after event starts
- **Stats Calculation**: Function recomputes accuracy + streaks from picks
- **Bout Cancellation**: Automatically voids picks when fights are canceled

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- Supabase account (free tier works)
- GitHub account (for scheduled syncs)

### 1. Supabase Setup

#### Create Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and keys:
   - Project URL: `https://[PROJECT-ID].supabase.co`
   - Anon key: Public key for client
   - Service role key: Secret key for Edge Functions

#### Run Migrations
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref [YOUR-PROJECT-ID]

# Run migrations
supabase db push
```

#### Deploy Edge Functions
```bash
# Deploy all functions
supabase functions deploy sync-events
supabase functions deploy sync-next-event-card
supabase functions deploy sync-recent-results-and-grade

# Set environment variables for functions
supabase secrets set SUPABASE_URL=https://[PROJECT-ID].supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]
```

#### Test Edge Functions
```bash
# Test events sync
curl -X POST "https://[PROJECT-ID].supabase.co/functions/v1/sync-events" \
  -H "Authorization: Bearer [SERVICE-ROLE-KEY]"

# Test event card sync
curl -X POST "https://[PROJECT-ID].supabase.co/functions/v1/sync-next-event-card" \
  -H "Authorization: Bearer [SERVICE-ROLE-KEY]"

# Test results sync
curl -X POST "https://[PROJECT-ID].supabase.co/functions/v1/sync-recent-results-and-grade" \
  -H "Authorization: Bearer [SERVICE-ROLE-KEY]"
```

### 2. Mobile App Setup

#### Update Supabase Config
Edit `mobile/lib/supabase.ts`:
```typescript
const supabaseUrl = 'YOUR_PROJECT_URL';
const supabaseAnonKey = 'YOUR_ANON_KEY';
```

#### Install Dependencies
```bash
cd mobile
npm install
```

#### Run App
```bash
# Start Expo dev server
npm start

# Or specific platform
npm run ios
npm run android
```

#### Test with Expo Go
1. Install Expo Go app on your phone
2. Scan QR code from terminal
3. App will load on your device

### 3. GitHub Actions Setup

#### Add Secrets
Go to your GitHub repo → Settings → Secrets and variables → Actions

Add these secrets:
- `SUPABASE_FUNCTION_URL`: `https://[PROJECT-ID].supabase.co/functions/v1`
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key

#### Enable Workflows
1. Go to Actions tab in GitHub
2. Enable workflows if prompted
3. Workflows will run on schedule:
   - **Daily 6am UTC**: Sync events
   - **Daily 12pm UTC**: Sync next event card
   - **Every 6 hours**: Sync results and grade picks

#### Manual Trigger
Go to Actions → Sync UFC Stats Data → Run workflow
- Choose which function to run (or "all")

### 4. Initial Data Load

Run the Edge Functions manually to populate initial data:

```bash
# 1. Sync events (will populate ~100+ UFC events)
curl -X POST "https://[PROJECT-ID].supabase.co/functions/v1/sync-events" \
  -H "Authorization: Bearer [SERVICE-ROLE-KEY]"

# 2. Sync next event card (will populate fights for next event)
curl -X POST "https://[PROJECT-ID].supabase.co/functions/v1/sync-next-event-card" \
  -H "Authorization: Bearer [SERVICE-ROLE-KEY]"

# 3. Sync recent results (will grade any completed events)
curl -X POST "https://[PROJECT-ID].supabase.co/functions/v1/sync-recent-results-and-grade" \
  -H "Authorization: Bearer [SERVICE-ROLE-KEY]"
```

Check your Supabase dashboard to confirm data was loaded.

## Usage

### User Flow

1. **Sign Up**
   - Enter email → receive OTP code
   - Verify code → create username
   - Auto-redirect to Home screen

2. **Make Picks**
   - Home screen shows next event + countdown
   - Tap "Start Picking" → goes to Pick screen
   - Tap fighter to select winner
   - Picks auto-save (no confirmation needed)
   - Progress shows "X / Y picks made"

3. **Lock Time**
   - Picks lock at event start time
   - Countdown shows time remaining
   - After lock, UI becomes read-only

4. **Auto-Grading**
   - After event completes, results sync runs
   - Picks are graded: 1 point (correct) or 0 (incorrect)
   - Draws/NC are voided (no points)
   - User stats updated automatically

5. **View Stats**
   - Stats tab shows overall accuracy %
   - Current streak (consecutive correct picks)
   - Best streak (personal record)
   - Last 5 events breakdown

## Development

### Local Development

#### Backend (Supabase)
```bash
# Start local Supabase
supabase start

# Apply migrations
supabase db reset

# Test functions locally
supabase functions serve

# Call function
curl http://localhost:54321/functions/v1/sync-events
```

#### Mobile App
```bash
cd mobile
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android
```

### Database Access
```bash
# Open Supabase Studio (GUI)
supabase studio

# Or connect with psql
psql "postgresql://postgres:postgres@localhost:54322/postgres"
```

### Debugging

#### Edge Functions
- Check logs in Supabase Dashboard → Edge Functions
- Or use `supabase functions logs <function-name>`

#### Mobile App
- Errors show in Expo dev tools
- Use React DevTools for component inspection
- Check Supabase logs for query errors

## Business Rules

### Pick Locking
- Picks lock at `events.event_date` (event start time)
- Backend enforces via trigger (rejects INSERT/UPDATE after lock)
- Frontend shows countdown and disables UI after lock

### Grading Logic
- **Correct winner** = 1 point
- **Incorrect winner** = 0 points
- **Draw or NC** = voided (no points, doesn't count in stats)
- Method/round predictions stored but not scored in MVP

### Bout Cancellations
- If fight disappears from UFCStats → `bout.status = 'canceled'`
- Existing picks for that bout → `pick.status = 'voided'`
- UI shows "Fight Canceled - Pick Voided" banner

### Stats Calculation
- Recalculated from `picks` table after grading (no drift)
- **Accuracy** = (correct_winner / total_picks) * 100
- **Current Streak** = consecutive correct picks from most recent
- **Best Streak** = longest sequence of correct picks ever

## Deployment

### Production Checklist

#### Supabase
- [ ] Run all migrations on production database
- [ ] Deploy all Edge Functions
- [ ] Set environment variables (secrets)
- [ ] Enable RLS on all tables
- [ ] Configure email templates for OTP

#### Mobile App
- [ ] Update `supabase.ts` with production URL/keys
- [ ] Build with EAS: `eas build`
- [ ] Submit to app stores

#### GitHub Actions
- [ ] Add production secrets
- [ ] Test workflow with manual trigger
- [ ] Confirm scheduled runs work

### Monitoring

#### Supabase Dashboard
- Monitor function execution (logs, errors)
- Check database size and query performance
- Review auth metrics

#### GitHub Actions
- Check workflow runs (Actions tab)
- Confirm syncs complete successfully
- Review failure notifications

## Troubleshooting

### "No upcoming events"
- Run `sync-events` function manually
- Check Supabase logs for scraping errors
- UFCStats may have changed HTML structure (update scraper)

### "Picks are locked" error
- Event start time may be incorrect (check `events.event_date`)
- Clock drift between client/server (rare)
- Manually adjust event date in database if needed

### Picks not grading
- Run `sync-recent-results-and-grade` manually
- Check if event status is still "upcoming" (should be "completed")
- Verify results exist in `results` table

### App crashes on startup
- Clear Expo cache: `expo start -c`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check Supabase client configuration

## Future Enhancements (Post-MVP)

- [ ] Friends/Leagues (compare with other users)
- [ ] Push notifications (event reminders, results ready)
- [ ] Method/round scoring (advanced grading)
- [ ] Historical fighter stats
- [ ] Pick confidence levels
- [ ] Social sharing
- [ ] Multi-promotion support (Bellator, PFL, etc.)

## License

MIT

## Support

For issues or questions, please open a GitHub issue.

---

Built with ❤️ for UFC fans who want to track their prediction accuracy
