# Authentication Setup Guide

This guide covers configuring Supabase authentication for production, including email/password, Apple Sign-In, and Google Sign-In.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase Configuration](#supabase-configuration)
3. [Apple Sign-In Setup](#apple-sign-in-setup)
4. [Google Sign-In Setup](#google-sign-in-setup)
5. [Environment Variables](#environment-variables)
6. [App Configuration](#app-configuration)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Supabase project created at [supabase.com](https://supabase.com)
- Apple Developer account ($99/year) for Apple Sign-In
- Google Cloud Console account for Google Sign-In
- Expo account for building the app

---

## Supabase Configuration

### 1. Enable Email Authentication

1. Go to **Authentication > Providers** in Supabase Dashboard
2. Ensure **Email** provider is enabled
3. Configure settings:
   - **Enable email confirmations**: Toggle based on your needs
   - **Enable secure email change**: Recommended ON
   - **Mailer OTP Expiration**: 3600 seconds (default)

### 2. Configure Redirect URLs

1. Go to **Authentication > URL Configuration**
2. Add your app's redirect URLs:
   ```
   ufcpicks://
   ufcpicks://auth/callback
   exp://localhost:8081/--/auth/callback (for development)
   ```

### 3. Set Up RLS Policies

Run these SQL commands in **SQL Editor** if not already applied:

```sql
-- Profiles table RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Unique constraint on username
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_unique UNIQUE (username);
```

---

## Apple Sign-In Setup

### 1. Apple Developer Configuration

1. Log in to [Apple Developer Portal](https://developer.apple.com)

2. **Create an App ID** (if not exists):
   - Go to **Certificates, Identifiers & Profiles > Identifiers**
   - Click **+** and select **App IDs**
   - Enter description and Bundle ID (e.g., `com.yourcompany.ufcpicks`)
   - Enable **Sign in with Apple** capability
   - Click **Continue** and **Register**

3. **Create a Service ID** (for web/Supabase):
   - Go to **Identifiers** and click **+**
   - Select **Services IDs**
   - Enter description (e.g., "UFC Picks Auth")
   - Enter identifier (e.g., `com.yourcompany.ufcpicks.auth`)
   - Click **Continue** and **Register**
   - Click on the newly created Service ID
   - Enable **Sign in with Apple**
   - Click **Configure**:
     - Primary App ID: Select your main App ID
     - Domains: Add your Supabase project domain (e.g., `yourproject.supabase.co`)
     - Return URLs: Add `https://yourproject.supabase.co/auth/v1/callback`
   - Click **Save**

4. **Create a Key** for server-to-server auth:
   - Go to **Keys** and click **+**
   - Enter name (e.g., "UFC Picks Auth Key")
   - Enable **Sign in with Apple**
   - Click **Configure** and select your Primary App ID
   - Click **Continue** and **Register**
   - **Download the key file** (.p8) - you can only download it once!
   - Note the **Key ID**

### 2. Supabase Apple Provider Configuration

1. Go to **Authentication > Providers > Apple**
2. Enable the Apple provider
3. Fill in the fields:
   - **Service ID**: Your Service ID (e.g., `com.yourcompany.ufcpicks.auth`)
   - **Secret Key**: Contents of your .p8 file (open in text editor and paste)
   - **Key ID**: The Key ID from Apple Developer Portal
   - **Team ID**: Your Apple Developer Team ID (found in Membership)

### 3. Xcode Configuration

In your app's Xcode project:

1. Select your target > **Signing & Capabilities**
2. Click **+ Capability**
3. Add **Sign in with Apple**

Or add to `app.json`:

```json
{
  "expo": {
    "ios": {
      "usesAppleSignIn": true
    }
  }
}
```

---

## Google Sign-In Setup

### 1. Google Cloud Console Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com)

2. **Create or select a project**

3. **Configure OAuth Consent Screen**:
   - Go to **APIs & Services > OAuth consent screen**
   - Select **External** user type
   - Fill in app information:
     - App name: UFC Picks
     - User support email: your email
     - Developer contact: your email
   - Add scopes: `email`, `profile`, `openid`
   - Add test users if in testing mode
   - Click **Save and Continue**

4. **Create OAuth 2.0 Credentials**:

   **For Web (required for Supabase):**
   - Go to **APIs & Services > Credentials**
   - Click **Create Credentials > OAuth client ID**
   - Application type: **Web application**
   - Name: "UFC Picks Web"
   - Authorized JavaScript origins:
     - `https://yourproject.supabase.co`
   - Authorized redirect URIs:
     - `https://yourproject.supabase.co/auth/v1/callback`
   - Click **Create**
   - Note the **Client ID** and **Client Secret**

   **For iOS:**
   - Click **Create Credentials > OAuth client ID**
   - Application type: **iOS**
   - Name: "UFC Picks iOS"
   - Bundle ID: Your app's bundle ID (e.g., `com.yourcompany.ufcpicks`)
   - Click **Create**
   - Note the **Client ID**

   **For Android:**
   - Click **Create Credentials > OAuth client ID**
   - Application type: **Android**
   - Name: "UFC Picks Android"
   - Package name: Your app's package name
   - SHA-1 certificate fingerprint: Get from your keystore
     ```bash
     keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
     ```
   - Click **Create**
   - Note the **Client ID**

### 2. Supabase Google Provider Configuration

1. Go to **Authentication > Providers > Google**
2. Enable the Google provider
3. Fill in:
   - **Client ID**: Your Web Client ID
   - **Client Secret**: Your Web Client Secret

---

## Environment Variables

### Local Development (.env)

Create a `.env` file in the `mobile` directory:

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Google OAuth Client IDs
EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=your-ios-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=your-android-client-id.apps.googleusercontent.com
```

### Production (EAS Secrets)

For Expo EAS builds, set secrets via CLI:

```bash
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://yourproject.supabase.co"
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-anon-key"
eas secret:create --name EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB --value "your-web-client-id"
eas secret:create --name EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS --value "your-ios-client-id"
eas secret:create --name EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID --value "your-android-client-id"
```

---

## App Configuration

### app.json / app.config.js

```json
{
  "expo": {
    "scheme": "ufcpicks",
    "ios": {
      "bundleIdentifier": "com.yourcompany.ufcpicks",
      "usesAppleSignIn": true,
      "infoPlist": {
        "CFBundleURLTypes": [
          {
            "CFBundleURLSchemes": [
              "com.googleusercontent.apps.YOUR_IOS_CLIENT_ID"
            ]
          }
        ]
      }
    },
    "android": {
      "package": "com.yourcompany.ufcpicks",
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "ufcpicks"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

---

## Testing

### Development Testing

1. Start the development server:
   ```bash
   npx expo start
   ```

2. Test each auth method:
   - **Email/Password**: Create account, verify login
   - **Apple Sign-In**: Only testable on iOS device/simulator
   - **Google Sign-In**: Test on device or emulator

### Test Users

For development, use these test credentials:
- `alice@test.com` / `Password123` (username: alice_ufc)
- `bob@test.com` / `Password123` (username: bob_fighter)
- `charlie@test.com` / `Password123` (username: charlie_picks)

### Checklist

- [ ] Email signup creates account and routes to username screen
- [ ] Email login works for existing users
- [ ] Apple Sign-In works on iOS
- [ ] Google Sign-In works on all platforms
- [ ] OAuth users without profiles are routed to create-username
- [ ] Username uniqueness is enforced
- [ ] Session persists across app restarts
- [ ] Logout clears session and routes to auth screen
- [ ] Guest mode works without authentication

---

## Troubleshooting

### Apple Sign-In Issues

**"Invalid client" error:**
- Verify Service ID matches in Supabase and Apple Developer Portal
- Check that the .p8 key is correctly pasted (include header/footer)
- Verify Team ID is correct

**Sign-in button not appearing:**
- Ensure `usesAppleSignIn: true` in app.json
- Apple Sign-In only works on iOS 13+
- Must be tested on real device or simulator, not Expo Go

### Google Sign-In Issues

**"redirect_uri_mismatch" error:**
- Verify redirect URI in Google Console matches Supabase callback URL exactly
- Check for trailing slashes

**"invalid_client" error:**
- Ensure you're using the Web Client ID and Secret in Supabase
- Verify OAuth consent screen is configured

**Sign-in not completing:**
- Check that `expo-web-browser` is properly installed
- Verify the URL scheme is correctly configured in app.json

### Session Issues

**Session not persisting:**
- Verify AsyncStorage is working correctly
- Check Supabase client configuration has `persistSession: true`

**User redirected to login after app restart:**
- Check `autoRefreshToken: true` in Supabase client config
- Verify token hasn't expired

### Profile/Username Issues

**"Username already taken" even for new username:**
- Check for leading/trailing whitespace
- Verify case sensitivity in database constraint

**Profile not created after OAuth sign-in:**
- Ensure create-username screen is in the auth flow
- Check RLS policies allow profile insertion

---

## Security Checklist

- [ ] Enable RLS on all tables
- [ ] Use environment variables for all secrets
- [ ] Never commit .env files to git
- [ ] Enable email confirmation for production
- [ ] Set up rate limiting in Supabase
- [ ] Configure allowed redirect URLs
- [ ] Use HTTPS for all callback URLs
- [ ] Rotate API keys periodically
- [ ] Monitor auth logs in Supabase dashboard
