# Production Setup Guide

Complete guide for deploying Upset to production on iOS App Store and Google Play Store.

## Prerequisites

- **Expo Account** - Free at [expo.dev](https://expo.dev)
- **Apple Developer Account** - $99/year for App Store distribution
- **Google Play Console Account** - $25 one-time fee
- **Sentry Account** - Free tier for error tracking

## 1. EAS Project Setup

### Install and Configure EAS CLI

```bash
cd mobile

# Install EAS CLI globally
npm install -g eas-cli

# Login to your Expo account
eas login

# Initialize EAS project (if not already done)
eas init
```

### Configure EAS Secrets

Set production environment variables:

```bash
# Required: Supabase configuration
eas env:create --scope project --environment production \
  --name EXPO_PUBLIC_SUPABASE_URL \
  --value "https://your-project.supabase.co"

eas env:create --scope project --environment production \
  --name EXPO_PUBLIC_SUPABASE_ANON_KEY \
  --value "your-anon-key"

# Optional: OAuth (Google Sign-In)
eas env:create --scope project --environment production \
  --name EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS \
  --value "your-google-client-id.apps.googleusercontent.com"

# Optional: Error tracking
eas env:create --scope project --environment production \
  --name EXPO_PUBLIC_SENTRY_DSN \
  --value "https://your-dsn@sentry.io/project-id"
```

## 2. Build Profiles

The app uses three build profiles defined in `eas.json`:

### Development Build
For local testing with development features:
```bash
eas build --profile development --platform ios
eas build --profile development --platform android
```

### Preview Build
For TestFlight/internal testing:
```bash
eas build --profile preview --platform ios
eas build --profile preview --platform android
```

### Production Build
For App Store/Play Store submission:
```bash
eas build --profile production --platform ios
eas build --profile production --platform android
```

## 3. iOS App Store Setup

### Create App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click "+" → "New App"
3. Fill in app information:
   - Platform: iOS
   - Name: Upset
   - Primary Language: English
   - Bundle ID: `com.getupset.app`
   - SKU: `upset-ios`

### Configure Signing

EAS handles signing automatically. On first build, you'll be prompted to:
1. Log in with your Apple ID
2. Select your Apple Developer team
3. EAS will create and manage certificates/provisioning profiles

### Required App Store Assets

| Asset | Size | Notes |
|-------|------|-------|
| App Icon | 1024x1024 | PNG, no transparency |
| iPhone Screenshots | 1290x2796 | 6.7" display |
| iPhone Screenshots | 1284x2778 | 6.5" display |
| iPad Screenshots | 2048x2732 | 12.9" Pro |

### App Store Information

Prepare the following:
- **App Name**: Upset - UFC Picks Tracker
- **Subtitle**: Predict. Track. Compete.
- **Description**: Full app description (4000 chars max)
- **Keywords**: UFC, MMA, predictions, picks, tracker
- **Privacy Policy URL**: Required
- **Support URL**: Required
- **Category**: Sports

## 4. Android Play Store Setup

### Create App in Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Click "Create app"
3. Fill in app details:
   - App name: Upset
   - Default language: English
   - App or game: App
   - Free or paid: Free

### Configure Service Account (for automated submission)

1. Go to Google Cloud Console
2. Create a service account with Play Console API access
3. Download the JSON key file
4. Add to project: `android/google-play-key.json` (gitignored)

### Required Play Store Assets

| Asset | Size | Notes |
|-------|------|-------|
| App Icon | 512x512 | PNG |
| Feature Graphic | 1024x500 | PNG |
| Phone Screenshots | Min 1080x1920 | 2-8 required |
| Tablet Screenshots | Min 1920x1200 | Optional |

## 5. Building and Submitting

### iOS Build + Submit

```bash
# Build and auto-submit to TestFlight
eas build --profile production --platform ios --auto-submit

# Or build first, then submit
eas build --profile production --platform ios
eas submit --platform ios --latest
```

### Android Build + Submit

```bash
# Build and auto-submit to internal track
eas build --profile production --platform android --auto-submit

# Or build first, then submit
eas build --profile production --platform android
eas submit --platform android --latest
```

## 6. Over-the-Air Updates

EAS Update allows pushing JavaScript updates without app store review.

### Push an Update

```bash
# Update production users
eas update --branch production --message "Bug fix: follow functionality"

# Update TestFlight/internal testers
eas update --branch preview --message "New feature: fighter comparison"
```

### Update Channels

- `production` - Live App Store / Play Store users
- `preview` - TestFlight / Internal testing track
- `development` - Development builds

## 7. Monitoring

### Sentry Error Tracking

Sentry is pre-configured in `lib/sentry.ts`. Errors are automatically captured in production builds.

Dashboard: [sentry.io](https://sentry.io) → Your Project

### EAS Build Dashboard

Monitor builds at: [expo.dev](https://expo.dev) → Your Project → Builds

## 8. Pre-Launch Checklist

### Code Quality
- [ ] TypeScript compiles without errors (`npx tsc --noEmit`)
- [ ] Tests pass (`npm test`)
- [ ] No hardcoded secrets in code
- [ ] Console logs removed from production paths

### App Configuration
- [ ] `app.json` has correct `bundleIdentifier` and `package`
- [ ] `app.json` has `projectId` from EAS
- [ ] Version number is correct
- [ ] EAS secrets are configured

### App Store Preparation
- [ ] App icon (1024x1024) ready
- [ ] Screenshots for all required sizes
- [ ] App description written
- [ ] Privacy policy URL live
- [ ] Support email configured
- [ ] Age rating questionnaire completed

### Testing
- [ ] Tested on real iOS device
- [ ] Tested on real Android device
- [ ] All auth methods work (Email, Apple, Google)
- [ ] Deep links work
- [ ] Push notifications configured (if applicable)
- [ ] Error tracking verified

## 9. Post-Launch

### Monitor
- Check Sentry dashboard daily for new errors
- Monitor app store reviews and ratings
- Track crash-free user rate

### Updates
- **Minor fixes**: Use `eas update` for instant deployment
- **Native changes**: Requires new build + store review

### Version Management
```bash
# Bump version in app.json, then:
eas build --profile production --platform ios

# Build number auto-increments per platform
```

## Troubleshooting

### Build Fails with Signing Error
```bash
# Clear EAS credentials cache
eas credentials --platform ios
# Select "Remove" to clear, then rebuild
```

### App Crashes on Launch
- Check Sentry for crash reports
- Verify environment variables are set correctly
- Test with `eas build --profile preview` first

### Update Not Appearing
- Ensure correct branch: `eas update --branch production`
- Updates apply on next app cold start
- Check EAS dashboard for update status
