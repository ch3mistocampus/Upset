# Authentication Redesign Plan

**Created**: 2025-12-30
**Current State**: Email OTP only (bypassed in development)
**Target State**: Google, Apple, Email/Username with password

---

## Current Authentication Analysis

### What We Have Now ✅

**Current Auth Flow** (Email OTP - One Time Password):
1. User enters email
2. Supabase sends 6-digit OTP code to email
3. User enters OTP code to verify
4. User creates username (one-time)
5. User is authenticated

**Pros**:
- ✅ No password management (no forgot password, no resets)
- ✅ Better security (no password leaks)
- ✅ Simpler UX (no password requirements)

**Cons**:
- ❌ Requires email access every time
- ❌ Slower login (wait for email)
- ❌ Can't login without internet + email access
- ❌ Email delays can be frustrating
- ❌ No social login (Google, Apple)

### Current Implementation

**Files**:
- `mobile/hooks/useAuth.ts` - Auth state management
- `mobile/app/(auth)/sign-in.tsx` - Email OTP entry
- `mobile/app/(auth)/create-username.tsx` - Username creation
- `mobile/app/index.tsx` - Auth routing (currently bypassed)

**Database**:
- `auth.users` - Supabase Auth table (managed automatically)
- `public.profiles` - Custom user profiles table
  - `user_id` (references auth.users)
  - `username` (unique, 3-30 chars)
  - `created_at`

**Current Auth Providers**:
- Email OTP only (via Supabase Auth)

---

## Proposed New Authentication System

### Target Auth Providers

1. **Google Sign-In** (OAuth 2.0)
   - Fast, one-tap login
   - Most users have Google accounts
   - Mobile-optimized with Google Sign-In SDK

2. **Apple Sign-In** (OAuth 2.0)
   - **Required for iOS App Store** (if app has other social login)
   - Built-in to iOS (Face ID/Touch ID support)
   - Privacy-focused (can hide email)

3. **Email + Password** (Traditional)
   - Full control, no third-party dependency
   - Works everywhere
   - Username OR email login

4. **Email OTP** (Keep as option)
   - Alternative for users who prefer it
   - No password to remember

### Recommended Primary Flow

**First Time User**:
```
Option A: [Sign in with Google] (fastest)
Option B: [Sign in with Apple]  (iOS users)
Option C: [Sign in with Email]  (traditional)
           ↓
    Create Username (one-time)
           ↓
    Home Screen
```

**Returning User**:
```
[Remembered session] → Home Screen
    OR
[Google/Apple/Email] → Home Screen
```

---

## Technical Implementation Plan

### Phase 1: Supabase Auth Configuration

**Enable OAuth Providers in Supabase Dashboard**:

1. **Google OAuth**
   - Create Google Cloud Project
   - Enable Google Sign-In API
   - Get OAuth 2.0 credentials (Client ID, Client Secret)
   - Add authorized redirect URIs
   - Configure in Supabase Dashboard: Authentication → Providers → Google

2. **Apple OAuth**
   - Create Apple Developer account
   - Enable Sign in with Apple capability
   - Create Services ID
   - Get Client ID and Team ID
   - Configure in Supabase Dashboard: Authentication → Providers → Apple

3. **Email/Password**
   - Already enabled in Supabase
   - Configure email templates (welcome, password reset, email change)
   - Set password requirements (min 8 chars, etc.)

**Supabase Configuration URLs**:
```
https://supabase.com/dashboard/project/[PROJECT_ID]/auth/providers
https://supabase.com/dashboard/project/[PROJECT_ID]/auth/templates
```

---

### Phase 2: Mobile App Implementation

#### 2.1 Install Dependencies

```bash
cd mobile

# Google Sign-In
npx expo install @react-native-google-signin/google-signin

# Apple Sign-In (built into Expo)
npx expo install expo-apple-authentication

# Supabase already installed
# @supabase/supabase-js (already installed)
```

#### 2.2 Update Expo Configuration

**mobile/app.json**:
```json
{
  "expo": {
    "plugins": [
      [
        "@react-native-google-signin/google-signin",
        {
          "iosUrlScheme": "com.googleusercontent.apps.YOUR_IOS_CLIENT_ID"
        }
      ],
      [
        "expo-apple-authentication"
      ]
    ],
    "ios": {
      "bundleIdentifier": "com.yourcompany.ufcpickstracker",
      "usesAppleSignIn": true
    },
    "android": {
      "package": "com.yourcompany.ufcpickstracker",
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

#### 2.3 Update Auth Hook

**mobile/hooks/useAuth.ts** (Enhanced):

```typescript
import { useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/database';

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
  iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
  offlineAccess: true,
});

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
      }

      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In
  const signInWithGoogle = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();

      if (userInfo.idToken) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: userInfo.idToken,
        });

        if (error) throw error;
        return data;
      } else {
        throw new Error('No ID token present!');
      }
    } catch (error) {
      throw error;
    }
  };

  // Apple Sign-In
  const signInWithApple = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });

        if (error) throw error;
        return data;
      } else {
        throw new Error('No identity token present!');
      }
    } catch (error) {
      throw error;
    }
  };

  // Email + Password Sign-In
  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  };

  // Email + Password Sign-Up
  const signUpWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'ufcpicks://auth/callback',
      },
    });

    if (error) throw error;
    return data;
  };

  // Email OTP (keep for backwards compatibility)
  const signInWithOTP = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: 'ufcpicks://',
      },
    });

    if (error) throw error;
  };

  const verifyOTP = async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (error) throw error;
  };

  // Create username (one-time after first sign-in)
  const createProfile = async (username: string) => {
    if (!user) throw new Error('No user logged in');

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        user_id: user.id,
        username,
      })
      .select()
      .single();

    if (error) throw error;

    setProfile(data);
    return data;
  };

  // Sign out
  const signOut = async () => {
    // Sign out from Google if applicable
    const isSignedIn = await GoogleSignin.isSignedIn();
    if (isSignedIn) {
      await GoogleSignin.signOut();
    }

    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  // Password reset
  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'ufcpicks://auth/reset-password',
    });

    if (error) throw error;
  };

  // Update password
  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  };

  return {
    session,
    user,
    profile,
    loading,
    signInWithGoogle,
    signInWithApple,
    signInWithEmail,
    signUpWithEmail,
    signInWithOTP,
    verifyOTP,
    createProfile,
    signOut,
    resetPassword,
    updatePassword,
  };
}
```

#### 2.4 Create New Sign-In Screen

**mobile/app/(auth)/sign-in.tsx** (Redesigned):

```tsx
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

export default function SignIn() {
  const router = useRouter();
  const toast = useToast();
  const auth = useAuth();

  const [mode, setMode] = useState<'buttons' | 'email'>('buttons');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await auth.signInWithGoogle();
      // User will be redirected by auth state change
    } catch (error: any) {
      toast.show(error.message || 'Failed to sign in with Google', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      await auth.signInWithApple();
      // User will be redirected by auth state change
    } catch (error: any) {
      if (error.code !== 'ERR_CANCELED') {
        toast.show(error.message || 'Failed to sign in with Apple', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      toast.show('Please enter email and password', 'error');
      return;
    }

    try {
      setLoading(true);
      if (isSignUp) {
        await auth.signUpWithEmail(email, password);
        toast.show('Check your email to verify your account', 'success');
      } else {
        await auth.signInWithEmail(email, password);
        // User will be redirected by auth state change
      }
    } catch (error: any) {
      toast.show(error.message || 'Authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'email') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          {isSignUp ? 'Create Account' : 'Sign In'}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#666"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleEmailAuth}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setIsSignUp(!isSignUp)}
          disabled={loading}
        >
          <Text style={styles.switchText}>
            {isSignUp
              ? 'Already have an account? Sign In'
              : "Don't have an account? Sign Up"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setMode('buttons')}>
          <Text style={styles.backText}>← Back to other options</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>UFC Picks Tracker</Text>
      <Text style={styles.subtitle}>Track Your Prediction Accuracy</Text>

      {/* Google Sign-In */}
      <TouchableOpacity
        style={styles.googleButton}
        onPress={handleGoogleSignIn}
        disabled={loading}
      >
        <Text style={styles.googleButtonText}>Continue with Google</Text>
      </TouchableOpacity>

      {/* Apple Sign-In (iOS only) */}
      {Platform.OS === 'ios' && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={8}
          style={styles.appleButton}
          onPress={handleAppleSignIn}
        />
      )}

      {/* Email/Password */}
      <TouchableOpacity
        style={styles.emailButton}
        onPress={() => setMode('email')}
        disabled={loading}
      >
        <Text style={styles.emailButtonText}>Continue with Email</Text>
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Email OTP (Alternative) */}
      <TouchableOpacity
        onPress={() => router.push('/(auth)/sign-in-otp')}
        disabled={loading}
      >
        <Text style={styles.otpText}>Sign in with email code (no password)</Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        By continuing, you agree to our Terms of Service and Privacy Policy
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 48,
    textAlign: 'center',
  },
  googleButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  googleButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  appleButton: {
    height: 52,
    marginBottom: 12,
  },
  emailButton: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 12,
  },
  emailButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  dividerText: {
    color: '#666',
    paddingHorizontal: 12,
    fontSize: 14,
  },
  otpText: {
    color: '#d4202a',
    fontSize: 14,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  disclaimer: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 32,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#d4202a',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  switchText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  backText: {
    color: '#d4202a',
    fontSize: 14,
    textAlign: 'center',
  },
});
```

---

### Phase 3: Database Considerations

**Current Database Schema** (No changes needed!):
```sql
-- auth.users table is managed by Supabase
-- Handles all auth providers (Google, Apple, Email, OTP)

-- public.profiles table (already exists)
CREATE TABLE public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**How Auth Providers Link to Users**:
- When user signs in with Google → Supabase creates user in `auth.users` with provider = 'google'
- When user signs in with Apple → Supabase creates user in `auth.users` with provider = 'apple'
- When user signs in with Email → Supabase creates user in `auth.users` with provider = 'email'
- Same user can have multiple providers linked (Google + Email for example)

**User ID is consistent** across all providers for the same account.

**Profile Creation Flow**:
1. User signs in with any provider → `auth.users` record created
2. Check if `public.profiles` exists for `user_id`
3. If not, show username creation screen
4. Create `public.profiles` record with chosen username
5. Redirect to home

---

## How Picks Tracking Works

### Database Structure

**Picks are tracked in the `picks` table**:
```sql
CREATE TABLE public.picks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),  -- Links to authenticated user
  event_id UUID REFERENCES events(id),     -- Which UFC event
  bout_id UUID REFERENCES bouts(id),       -- Which specific fight
  picked_corner TEXT CHECK (picked_corner IN ('red', 'blue')),  -- Red or Blue fighter
  picked_method TEXT,                      -- Optional: KO, Sub, Decision (not scored in MVP)
  picked_round INT,                        -- Optional: Which round (not scored in MVP)
  created_at TIMESTAMPTZ,                  -- When pick was made
  locked_at TIMESTAMPTZ,                   -- When pick was locked (event start time)
  status TEXT CHECK (status IN ('active', 'graded', 'voided')),
  score INT CHECK (score IN (0, 1)),       -- 1 = correct, 0 = incorrect, null = voided
  CONSTRAINT unique_user_bout_pick UNIQUE(user_id, bout_id)  -- One pick per fight per user
);
```

### Pick Lifecycle

**1. User Makes a Pick** (Pick Screen):
```typescript
// User taps on "Red Fighter" button
const handleFighterPress = (bout: Bout, corner: 'red' | 'blue') => {
  upsertPick.mutate({
    user_id: user.id,
    event_id: nextEvent.id,
    bout_id: bout.id,
    picked_corner: corner,  // 'red' or 'blue'
  });
};
```

**Database Operation**:
```sql
INSERT INTO picks (user_id, event_id, bout_id, picked_corner, status)
VALUES ('user-uuid', 'event-uuid', 'bout-uuid', 'red', 'active')
ON CONFLICT (user_id, bout_id)
DO UPDATE SET picked_corner = EXCLUDED.picked_corner;  -- Allow changing pick before lock
```

**2. Pick Automatically Locks** (Database Trigger):
```sql
-- When event.event_date is reached, picks cannot be modified
CREATE TRIGGER enforce_pick_lock
  BEFORE INSERT OR UPDATE ON picks
  FOR EACH ROW
  EXECUTE FUNCTION validate_pick_not_locked();

-- Function checks if event has started
CREATE FUNCTION validate_pick_not_locked()
RETURNS TRIGGER AS $$
BEGIN
  IF now() >= (SELECT event_date FROM events WHERE id = NEW.event_id) THEN
    RAISE EXCEPTION 'Picks are locked. Event has already started.';
  END IF;
  RETURN NEW;
END;
$$;
```

**UI Behavior**:
- Before lock: Fighter buttons are tappable, user can change picks
- After lock: Fighter buttons are greyed out, disabled, picks are read-only

**3. Picks are Graded** (Automated via Edge Function):

**When**: Every 6 hours via GitHub Actions CRON job

**Edge Function**: `sync-recent-results-and-grade`
```typescript
// Simplified logic:
1. Find recent events (completed or in_progress)
2. Scrape fight results from UFCStats.com
3. For each bout with a result:
   - Find all user picks for that bout
   - Compare pick.picked_corner with result.winner_corner
   - If match: score = 1 (correct)
   - If no match: score = 0 (incorrect)
   - If draw/no-contest: status = 'voided', score = null
   - Update pick.status = 'graded'
4. Recalculate user stats
```

**Database Updates**:
```sql
-- Grade picks
UPDATE picks
SET
  status = 'graded',
  score = CASE
    WHEN picked_corner = (SELECT winner_corner FROM results WHERE bout_id = picks.bout_id) THEN 1
    ELSE 0
  END,
  locked_at = (SELECT event_date FROM events WHERE id = picks.event_id)
WHERE bout_id = 'bout-uuid-with-result';

-- Void draws/no-contests
UPDATE picks
SET status = 'voided', score = NULL
WHERE bout_id IN (SELECT bout_id FROM results WHERE winner_corner IN ('draw', 'nc'));
```

**4. Stats are Calculated** (Automated):

**Function**: `recalculate_user_stats(user_id)`
```sql
-- Called after grading picks
-- Calculates:
SELECT
  COUNT(*) as total_picks,                    -- All graded picks (exclude voided)
  SUM(score) as correct_winner,               -- How many score = 1
  ROUND((SUM(score)::NUMERIC / COUNT(*)) * 100, 2) as accuracy_pct,  -- Percentage
  -- Current streak: consecutive correct picks from most recent
  -- Best streak: longest sequence of correct picks ever
FROM picks
WHERE user_id = 'user-uuid' AND status = 'graded';

-- Updates user_stats table
INSERT INTO user_stats (user_id, total_picks, correct_winner, accuracy_pct, ...)
VALUES (...)
ON CONFLICT (user_id) DO UPDATE ...;
```

### User Pick Tracking Flow (Complete Example)

**UFC 300: User Makes Picks**:
```
User: John (user_id: abc-123)
Event: UFC 300 (event_id: event-300, event_date: 2025-04-13 02:00:00 UTC)

Bouts:
1. Main Event: Jones vs Miocic
   - Red: Jones (ufcstats_id: jones-001)
   - Blue: Miocic (ufcstats_id: miocic-001)

2. Co-Main: Pereira vs Adesanya
   - Red: Pereira (ufcstats_id: pereira-001)
   - Blue: Adesanya (ufcstats_id: adesanya-001)
```

**April 12, 2025 - User makes picks**:
```sql
-- Pick 1: User picks Jones (red) to beat Miocic
INSERT INTO picks VALUES (
  'pick-1',
  'abc-123',        -- user_id (John)
  'event-300',      -- UFC 300
  'bout-1',         -- Jones vs Miocic
  'red',            -- Picked Jones
  'active',         -- Not graded yet
  NULL              -- No score yet
);

-- Pick 2: User picks Adesanya (blue) to beat Pereira
INSERT INTO picks VALUES (
  'pick-2',
  'abc-123',        -- user_id (John)
  'event-300',      -- UFC 300
  'bout-2',         -- Pereira vs Adesanya
  'blue',           -- Picked Adesanya
  'active',         -- Not graded yet
  NULL              -- No score yet
);
```

**April 13, 2025, 02:00 UTC - Event starts, picks lock**:
```sql
-- User tries to change pick → REJECTED by trigger
UPDATE picks SET picked_corner = 'blue' WHERE id = 'pick-1';
-- Error: "Picks are locked. Event has already started."
```

**April 13, 2025, 08:00 UTC - Event finishes, CRON job runs**:
```typescript
// Edge Function scrapes results from UFCStats:
Results:
1. Jones defeats Miocic via TKO Round 3
   → winner_corner = 'red'

2. Pereira defeats Adesanya via KO Round 2
   → winner_corner = 'red'
```

```sql
-- Insert results
INSERT INTO results VALUES ('bout-1', 'red', 'TKO', 3, '4:12', 'Ground and Pound');
INSERT INTO results VALUES ('bout-2', 'red', 'KO', 2, '2:03', 'Left Hook');

-- Grade picks
UPDATE picks SET status = 'graded', score = 1 WHERE id = 'pick-1';  -- John picked Jones (red) ✅
UPDATE picks SET status = 'graded', score = 0 WHERE id = 'pick-2';  -- John picked Adesanya (blue) ❌

-- Recalculate John's stats
-- John now has: 2 total picks, 1 correct, 50% accuracy
UPDATE user_stats SET
  total_picks = 2,
  correct_winner = 1,
  accuracy_pct = 50.00,
  current_streak = 0,  -- Last pick was incorrect
  best_streak = 1
WHERE user_id = 'abc-123';
```

**User sees updated stats**:
- Total Picks: 2
- Correct: 1
- Accuracy: 50%
- Current Streak: 0
- Best Streak: 1

---

### Security: How Picks are Isolated Per User

**Row-Level Security (RLS) Policies**:
```sql
-- Users can ONLY see their own picks
CREATE POLICY "Users can view own picks"
  ON picks
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can ONLY insert/update their own picks
CREATE POLICY "Users can create own picks"
  ON picks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role (Edge Functions) can update all picks for grading
-- Uses service_role key (not exposed to mobile app)
```

**What This Means**:
- User A (`user_id: abc-123`) can ONLY see picks where `user_id = abc-123`
- User B (`user_id: xyz-789`) can ONLY see picks where `user_id = xyz-789`
- No user can see another user's picks (unless you add friends/leagues feature)
- Mobile app uses `anon` or `authenticated` key (limited permissions)
- Edge Functions use `service_role` key (full permissions for grading)

---

## Authentication + Picks Integration

**How Auth Links to Picks**:

```typescript
// When user authenticates (any provider)
const { data: session } = await supabase.auth.signInWithGoogle();

// session.user.id is the UUID used for picks
const userId = session.user.id;  // e.g., "abc-123-def-456"

// When making a pick
await supabase.from('picks').insert({
  user_id: userId,      // ← Links pick to authenticated user
  event_id: eventId,
  bout_id: boutId,
  picked_corner: 'red',
});

// RLS ensures this user can only access their own picks
const { data: myPicks } = await supabase
  .from('picks')
  .select('*')
  .eq('user_id', userId);  // RLS automatically filters to this user only
```

**Multi-Device Support**:
- User signs in on iPhone → makes picks
- User signs in on iPad with same Google account → sees same picks
- User signs in on Android → sees same picks
- All devices share same `user_id` from Supabase Auth

---

## Migration Strategy

### Option A: Clean Slate (Recommended if no real users yet)
1. Drop current `auth.users` and `profiles` tables
2. Re-run migrations
3. Configure new auth providers
4. Test with fresh accounts

### Option B: Preserve Existing Users (If you have users)
1. Keep existing Email OTP auth working
2. Add Google and Apple as additional options
3. Existing users can link Google/Apple to their accounts
4. New users can choose any provider

**Linking Providers**:
```typescript
// User signed in with Email OTP, now wants to add Google
const { data, error } = await supabase.auth.linkIdentity({
  provider: 'google',
});
```

---

## Implementation Timeline

### Week 1: Setup
- [ ] Day 1-2: Configure Google OAuth (Google Cloud Console + Supabase)
- [ ] Day 3-4: Configure Apple OAuth (Apple Developer + Supabase)
- [ ] Day 5: Test OAuth in Supabase Dashboard

### Week 2: Mobile Implementation
- [ ] Day 1-2: Install dependencies, update Expo config
- [ ] Day 3-4: Update useAuth hook with new methods
- [ ] Day 5: Create new sign-in screen UI

### Week 3: Testing & Polish
- [ ] Day 1-2: Test Google Sign-In flow
- [ ] Day 3-4: Test Apple Sign-In flow
- [ ] Day 5: Test Email/Password flow

### Week 4: Integration & Deploy
- [ ] Day 1-2: Test pick creation with each auth method
- [ ] Day 3: Test RLS policies with multiple accounts
- [ ] Day 4-5: Final testing and bug fixes

**Total Time**: 4 weeks to production-ready multi-auth system

---

## Testing Checklist

### Auth Flow Tests
- [ ] Google Sign-In on iOS
- [ ] Google Sign-In on Android
- [ ] Apple Sign-In on iOS
- [ ] Email/Password Sign-Up
- [ ] Email/Password Sign-In
- [ ] Email OTP (legacy support)
- [ ] Username creation after first sign-in
- [ ] Session persistence across app restarts
- [ ] Sign out clears session
- [ ] Password reset flow
- [ ] Account linking (add Google to email account)

### Picks Integration Tests
- [ ] User A makes pick → stored with correct user_id
- [ ] User A can see own picks
- [ ] User A CANNOT see User B's picks
- [ ] Picks lock at event start time
- [ ] Picks graded correctly after results
- [ ] Stats calculated correctly
- [ ] Multi-device sync (same user, different devices)

### Security Tests
- [ ] RLS policies prevent cross-user access
- [ ] Service role key not exposed in mobile app
- [ ] Auth tokens refresh automatically
- [ ] Invalid tokens rejected

---

## Recommended Final Architecture

**Sign-In Screen Options**:
1. **[Continue with Google]** ← Primary (fastest, most users have it)
2. **[Continue with Apple]** ← iOS requirement
3. **[Continue with Email]** ← Traditional fallback
4. Small link: "Sign in with code (no password)" ← Email OTP legacy

**First-Time Flow**:
```
Choose Auth Method
    ↓
Authenticate (Google/Apple/Email)
    ↓
Create Username (one-time)
    ↓
Home Screen → Make Picks
```

**Returning User Flow**:
```
App Launch
    ↓
Session Exists? → Yes → Home Screen
                → No → Sign-In Screen
```

---

## Summary

### Current State
- ✅ Email OTP only
- ✅ Picks tracked per user in database
- ✅ RLS policies isolate user data
- ❌ Auth bypassed in development
- ❌ No social login

### Target State
- ✅ Google Sign-In (one-tap, fast)
- ✅ Apple Sign-In (iOS requirement)
- ✅ Email + Password (traditional)
- ✅ Email OTP (legacy option)
- ✅ All methods link to same pick tracking system
- ✅ Multi-device support
- ✅ Secure user data isolation

### Picks Tracking (Already Working)
- ✅ One pick per user per bout
- ✅ Picks lock at event start time
- ✅ Automated grading via UFCStats scraping
- ✅ Stats calculated automatically
- ✅ RLS ensures data privacy
- ✅ Multi-device sync

### Next Steps
1. Configure OAuth providers in Supabase Dashboard
2. Update mobile app with new auth methods
3. Test each auth flow thoroughly
4. Re-enable auth routing in index.tsx
5. Deploy and monitor

---

**Questions to Answer Before Starting**:
1. Do you have existing users with Email OTP accounts to migrate?
2. Do you have a Google Cloud account for OAuth setup?
3. Do you have an Apple Developer account ($99/year)?
4. Do you want to keep Email OTP as an option, or remove it?
5. Primary auth method preference? (Recommend: Google > Apple > Email)

Let me know and I'll help you start implementation!
