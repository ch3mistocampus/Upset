# Android OAuth Setup Guide

**Status**: Not configured
**Required for**: Google Sign-In on Android devices

## Quick Setup Steps

### Step 1: Get SHA-1 Fingerprint

For EAS builds, get the SHA-1 from your keystore:

```bash
# For EAS managed builds (production)
eas credentials -p android

# Or manually from debug keystore
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA1
```

Example output:
```
SHA1: XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX
```

### Step 2: Create Android OAuth Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your project (same one used for iOS/Web OAuth)
3. Click **Create Credentials** > **OAuth client ID**
4. Select **Android** application type
5. Fill in:
   - **Name**: `Upset Android`
   - **Package name**: `com.getupset.app`
   - **SHA-1 certificate fingerprint**: Paste from Step 1
6. Click **Create**
7. Copy the **Client ID**

### Step 3: Add to Environment

Add to `mobile/.env`:
```bash
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=YOUR_CLIENT_ID.apps.googleusercontent.com
```

### Step 4: Add to EAS Secrets (Production)

```bash
eas env:create --name EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID \
  --value "YOUR_CLIENT_ID.apps.googleusercontent.com" \
  --environment production \
  --visibility plain
```

### Step 5: Verify

1. Build Android app: `eas build --platform android --profile preview`
2. Install on device or emulator
3. Test Google Sign-In

## Current Configuration

| Platform | Client ID | Status |
|----------|-----------|--------|
| Web | `429619189202-r4olt9m9ig24rgqb491i81t2smgq1gu5.apps.googleusercontent.com` | Configured |
| iOS | `429619189202-h3nep1c2aj7r3bcqmanq80n0mq7ci1io.apps.googleusercontent.com` | Configured |
| Android | Not configured | **TODO** |

## Notes

- Android OAuth requires SHA-1 fingerprint from the actual signing key
- Different fingerprints for debug vs production builds
- You may need separate OAuth clients for:
  - Debug builds (debug.keystore)
  - EAS development builds (EAS managed keystore)
  - Production builds (upload keystore)

## Troubleshooting

### "Developer error" on Google Sign-In
- SHA-1 fingerprint doesn't match
- Package name mismatch
- OAuth client not properly configured

### Sign-in popup doesn't appear
- Check that `EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID` is set
- Verify the client ID is for Android type
- Ensure package name matches `app.json`

### Redirect fails
- Add the Supabase callback URL to authorized redirect URIs
- Verify the URL scheme is configured in `app.json`
