# Production Setup Guide

This guide covers everything needed to deploy the UFC Picks Tracker to production.

## Prerequisites

- Expo account (free tier)
- Apple Developer account ($99/year) for iOS
- Google Play Console account ($25 one-time) for Android
- Sentry account (free tier) for error tracking

## 1. EAS Project Setup

### Initialize EAS

```bash
cd mobile

# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Initialize EAS (creates project on expo.dev)
eas init

# This will:
# - Create a project on expo.dev
# - Update app.json with projectId
# - Update app.json with owner
```

After running `eas init`, update `app.json`:
- `extra.eas.projectId` will be filled automatically
- `owner` will be set to your Expo username
- `updates.url` will be set to your EAS Update URL

### Configure EAS Secrets

Set environment variables for production builds:

```bash
# Supabase configuration
eas secret:create EXPO_PUBLIC_SUPABASE_URL --value "https://your-project.supabase.co" --scope project
eas secret:create EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-anon-key" --scope project

# Sentry error tracking
eas secret:create EXPO_PUBLIC_SENTRY_DSN --value "https://your-sentry-dsn" --scope project
```

## 2. Build Profiles

The app has three build profiles configured in `eas.json`:

### Development Build
```bash
# iOS Simulator
eas build --profile development --platform ios

# Android APK
eas build --profile development --platform android
```

### Preview Build (Internal Testing)
```bash
# iOS (requires Apple Developer account)
eas build --profile preview --platform ios

# Android APK
eas build --profile preview --platform android
```

### Production Build
```bash
# iOS (App Store)
eas build --profile production --platform ios

# Android (Play Store)
eas build --profile production --platform android
```

## 3. App Store Setup

### iOS (App Store Connect)

1. **Create App Store Connect App**
   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - Create new iOS app
   - Note the App ID (ASC App ID)

2. **Update eas.json**
   ```json
   "submit": {
     "production": {
       "ios": {
         "appleId": "your-apple-id@email.com",
         "ascAppId": "1234567890",
         "appleTeamId": "TEAM123456"
       }
     }
   }
   ```

3. **Required Assets**
   - App Icon: 1024x1024 PNG (no alpha)
   - Screenshots for each device size
   - App description, keywords, privacy policy URL

### Android (Google Play Console)

1. **Create Google Play Console App**
   - Go to [Google Play Console](https://play.google.com/console)
   - Create new app
   - Complete store listing

2. **Create Service Account**
   - Go to Google Cloud Console
   - Create service account with Play Console access
   - Download JSON key file

3. **Update eas.json**
   ```json
   "submit": {
     "production": {
       "android": {
         "serviceAccountKeyPath": "./path/to/google-play-key.json",
         "track": "internal"
       }
     }
   }
   ```

4. **Required Assets**
   - Hi-res icon: 512x512 PNG
   - Feature graphic: 1024x500 PNG
   - Screenshots for phone and tablet
   - Short and full descriptions

## 4. OTA Updates

EAS Update allows pushing JavaScript updates without app store review.

### Enable Updates

Already configured in `app.json`:
```json
{
  "updates": {
    "enabled": true,
    "fallbackToCacheTimeout": 0,
    "url": "https://u.expo.dev/your-project-id"
  },
  "runtimeVersion": {
    "policy": "appVersion"
  }
}
```

### Push an Update

```bash
# Push update to production channel
eas update --branch production --message "Bug fix for..."

# Push update to preview channel
eas update --branch preview --message "New feature..."
```

### Channels

- `production` - Live users on App Store / Play Store
- `preview` - Internal testers
- `development` - Development builds

## 5. Sentry Error Tracking

### Create Sentry Project

1. Go to [sentry.io](https://sentry.io)
2. Create new React Native project
3. Copy DSN

### Configure Sentry

Already integrated in app via `@sentry/react-native/expo` plugin.

DSN is set via EAS Secret:
```bash
eas secret:create EXPO_PUBLIC_SENTRY_DSN --value "your-dsn"
```

### Source Maps (Optional)

For better stack traces, configure source map upload:

```bash
# Set Sentry auth token
eas secret:create SENTRY_AUTH_TOKEN --value "your-token"
```

Add to `app.json`:
```json
"plugins": [
  [
    "@sentry/react-native/expo",
    {
      "organization": "your-org",
      "project": "ufc-picks-tracker"
    }
  ]
]
```

## 6. App Store Assets

### iOS Screenshots Sizes
- iPhone 6.7" (1290 x 2796)
- iPhone 6.5" (1284 x 2778)
- iPhone 5.5" (1242 x 2208)
- iPad Pro 12.9" (2048 x 2732)

### Android Screenshot Sizes
- Phone: 1080 x 1920 minimum
- 7" Tablet: 1200 x 1920
- 10" Tablet: 1920 x 1200

### App Icon
- Place in `assets/icon.png` (1024x1024)
- No transparency for iOS
- Adaptive icon for Android in `assets/adaptive-icon.png`

## 7. Pre-Launch Checklist

### Code
- [ ] All tests passing (`npm test`)
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No console.log statements in production code

### Configuration
- [ ] EAS project initialized (`eas init`)
- [ ] EAS secrets configured
- [ ] app.json projectId filled
- [ ] app.json owner filled
- [ ] app.json updates.url filled

### App Store
- [ ] iOS bundle identifier registered
- [ ] Android package name registered
- [ ] Privacy policy URL ready
- [ ] Terms of service URL ready (optional)
- [ ] Support email configured

### Assets
- [ ] App icon (1024x1024)
- [ ] Splash screen
- [ ] App Store screenshots (all sizes)
- [ ] Feature graphic (Android)
- [ ] App descriptions written

### Testing
- [ ] Development build tested on device
- [ ] Preview build tested internally
- [ ] Deep links working
- [ ] Push notifications configured (if applicable)
- [ ] Error tracking verified (trigger test error)

## 8. Submit to Stores

### iOS
```bash
# Build and submit
eas build --profile production --platform ios --auto-submit

# Or submit existing build
eas submit --platform ios
```

### Android
```bash
# Build and submit
eas build --profile production --platform android --auto-submit

# Or submit existing build
eas submit --platform android
```

## 9. Post-Launch

### Monitor
- Check Sentry for errors
- Monitor app store reviews
- Track analytics (if configured)

### Updates
- Use `eas update` for quick JavaScript fixes
- New native features require new build + store review

### Version Bumping
```bash
# Bump version before new build
# Update app.json version, then:
eas build --profile production --auto-increment
```
