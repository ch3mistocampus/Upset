# Upset - UFC Picks Tracker

A social mobile app for UFC fans to predict fight outcomes, track accuracy, and compete with friends. Make picks for upcoming events, see how you stack up on the leaderboard, and discuss fights with the community.

## Features

### Pick Tracking
- **Make Picks**: Select winners for upcoming UFC fights with optional method and round predictions
- **Auto-Lock**: Picks automatically lock at event start time
- **Auto-Grade**: Results synced from UFCStats.com and picks graded automatically
- **Track Stats**: View accuracy %, current streak, best streak, method/round accuracy

### Social Features
- **Follow Users**: Follow other predictors and see their picks
- **User Suggestions**: Discover new users based on mutual follows, accuracy, and activity
- **Leaderboards**: Global and friends-only rankings by accuracy
- **Activity Feed**: See what the community is picking

### Forum & Discussion
- **Posts**: Create discussion posts about fights, events, or MMA topics
- **Comments**: Threaded comments with likes and replies
- **Trending**: See what's popular in the community
- **Fight Threads**: Auto-generated discussion threads for upcoming bouts

### Fighter Database
- **Fighter Profiles**: Detailed stats from UFCStats.com (striking, grappling, records)
- **Fight History**: Complete UFC fight history with round-by-round stats
- **Fighter Comparison**: Compare two fighters head-to-head
- **Rankings**: Current UFC rankings by weight class

### User Experience
- **Dark Mode**: Beautiful dark theme optimized for OLED
- **Guest Mode**: Browse the app without creating an account
- **Push Notifications**: Event reminders and pick grading alerts
- **Profile Customization**: Avatar and banner uploads

## Tech Stack

### Mobile App
- **Expo 54** - React Native framework with Expo Router
- **TypeScript** - Full type safety
- **React Query** - Data fetching, caching, and state management
- **Supabase JS** - Database client and authentication

### Backend
- **Supabase** - PostgreSQL database with Row Level Security
- **Edge Functions** (Deno) - Data sync and business logic
- **Supabase Auth** - Email/password, Apple Sign-In, Google OAuth
- **Supabase Storage** - Avatar and image uploads

### Monitoring
- **Sentry** - Error tracking and crash reporting

### Data Source
- **UFCStats.com** - Fighter statistics, events, and results

## Project Structure

```
Upset/
├── mobile/                    # Expo React Native app
│   ├── app/                   # Expo Router screens
│   │   ├── (auth)/           # Authentication flow
│   │   ├── (tabs)/           # Main tab navigation
│   │   ├── event/            # Event detail screens
│   │   ├── fighter/          # Fighter profiles
│   │   ├── post/             # Forum and posts
│   │   └── user/             # User profiles
│   ├── components/           # Reusable UI components
│   ├── hooks/                # React Query hooks
│   ├── lib/                  # Configuration and utilities
│   └── types/                # TypeScript definitions
│
├── supabase/
│   ├── functions/            # Edge Functions
│   │   ├── sync-events/      # Sync UFC events
│   │   ├── sync-next-event-card/  # Sync fight cards
│   │   └── sync-recent-results-and-grade/  # Grade picks
│   └── migrations/           # SQL schema migrations
│
└── .github/workflows/        # CI/CD pipelines
```

## Quick Start

### Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Supabase account
- iOS: Xcode (for simulator) or Expo Go app
- Android: Android Studio or Expo Go app

### Development Setup

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/your-org/upset.git
   cd upset/mobile
   npm install
   ```

2. **Configure environment**
   ```bash
   # Copy example env file
   cp .env.example .env

   # Edit with your Supabase credentials
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Start development server**
   ```bash
   npm start
   ```

4. **Run on device/simulator**
   - Scan QR code with Expo Go (iOS/Android)
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator

### Native Build (Required for Apple Sign-In)

```bash
# iOS
npx expo run:ios

# Android
npx expo run:android
```

## Authentication

The app supports multiple authentication methods:

- **Email/Password**: Traditional sign-up with email verification
- **Apple Sign-In**: Native iOS integration (requires native build)
- **Google OAuth**: Available on iOS and web
- **Guest Mode**: Browse without an account (picks saved locally until sign-up)

## Database Schema

### Core Tables
- `profiles` - User profiles with usernames and avatars
- `events` - UFC events from UFCStats
- `bouts` - Individual fights with fighter details
- `results` - Fight outcomes (winner, method, round)
- `picks` - User predictions with grading status
- `user_stats` - Denormalized accuracy and streak stats

### Social Tables
- `friendships` - Follow relationships between users
- `posts` - Forum posts and discussions
- `post_comments` - Threaded comments
- `post_likes` / `comment_likes` - Engagement tracking
- `blocks` - User blocking for safety

### Fighter Data Tables
- `ufc_fighters` - Fighter biographical and career stats
- `ufc_events` - Historical UFC events
- `ufc_fights` - Fight records with results
- `ufc_fight_stats` - Round-by-round statistics

## Deployment

### Mobile App (EAS Build)

```bash
# Development build
eas build --profile development --platform ios

# Production build
eas build --profile production --platform ios

# Submit to App Store
eas submit --platform ios
```

### Backend (Supabase)

```bash
# Link to project
supabase link --project-ref your-project-id

# Apply migrations
supabase db push

# Deploy Edge Functions
supabase functions deploy
```

See [PRODUCTION_SETUP.md](mobile/PRODUCTION_SETUP.md) for detailed deployment instructions.

## Environment Variables

### Required
```bash
EXPO_PUBLIC_SUPABASE_URL=         # Supabase project URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=    # Supabase anon/public key
```

### Optional
```bash
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=  # Google OAuth (iOS)
EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=  # Google OAuth (Web)
EXPO_PUBLIC_SENTRY_DSN=            # Sentry error tracking
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT

## Support

For issues or feature requests, please open a GitHub issue.

---

Built for UFC fans who want to prove their prediction skills.
