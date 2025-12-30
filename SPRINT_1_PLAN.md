# Sprint 1: Auth Redesign - Implementation Plan

**Status:** 🚧 In Progress
**Branch:** `claude/evaluate-and-plan-VvCw4`
**Goal:** Implement email/password and username/password authentication

---

## Overview

Sprint 1 adds robust authentication with multiple sign-in methods while maintaining email OTP as a fallback option.

**Authentication Methods (Priority Order):**
1. **Primary:** Email + Password OR Username + Password
2. **Alternative:** Email OTP (existing, keep functional)

**Key Features:**
- Sign up with email + password
- Sign in with email + password
- Sign in with username + password (convenience)
- Password reset via email
- Username remains unique and required

---

## Requirements

### User Stories

**As a new user:**
- I can sign up with email and password
- I must create a unique username after sign-up
- I receive a confirmation email (optional for MVP)

**As a returning user:**
- I can sign in with my email + password
- I can sign in with my username + password (faster)
- I can reset my password if forgotten
- I can still use email OTP if I prefer

**As a security-conscious user:**
- My password must be strong (min 8 chars)
- I can reset my password securely
- My session persists across app restarts

---

## Database Changes

### NO schema changes required!

Supabase handles all auth tables (`auth.users`) automatically.

**Existing `profiles` table is perfect:**
```sql
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE NOT NULL,  -- ✅ Already unique for username login
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Username Login Implementation:**
1. User enters username + password
2. Query `profiles` table: `SELECT user_id FROM profiles WHERE username = ?`
3. Get associated `auth.users.email`
4. Call `supabase.auth.signInWithPassword({ email, password })`

---

## Implementation Plan

### 1. Update useAuth Hook

**File:** `mobile/hooks/useAuth.ts`

**New Methods to Add:**
```typescript
// Sign up with email + password
signUp(email: string, password: string): Promise<void>

// Sign in with email + password
signInWithPassword(email: string, password: string): Promise<void>

// Sign in with username + password
signInWithUsername(username: string, password: string): Promise<void>

// Reset password
resetPassword(email: string): Promise<void>

// Update password
updatePassword(newPassword: string): Promise<void>
```

**Validation Rules:**
- Email: Valid format (existing regex)
- Password: Min 8 characters, at least 1 number
- Username: 3-30 characters, alphanumeric + underscore

---

### 2. Create Sign-Up Screen

**File:** `mobile/app/(auth)/sign-up.tsx`

**UI Fields:**
- Email input (validated)
- Password input (secure, min 8 chars)
- Confirm password input (must match)
- Sign up button
- Link to sign-in screen

**Flow:**
1. User enters email + password
2. Validate inputs (email format, password strength, passwords match)
3. Call `signUp(email, password)`
4. On success, redirect to create-username screen
5. On error, show error message (email already exists, etc.)

**Error Handling:**
- Email already registered → "This email is already registered"
- Weak password → "Password must be at least 8 characters with 1 number"
- Passwords don't match → "Passwords do not match"

---

### 3. Update Sign-In Screen

**File:** `mobile/app/(auth)/sign-in.tsx`

**Current:** Email OTP only
**New:** Tabbed interface with 3 options

**Tabs:**
1. **Password** (default)
   - Email or Username input (smart detection)
   - Password input
   - "Forgot password?" link
   - Sign in button

2. **Email Code** (existing OTP flow)
   - Keep current functionality
   - Email input
   - Send code button
   - Verify code input

**Smart Input Detection:**
```typescript
const isEmail = (input: string) => input.includes('@');

if (isEmail(input)) {
  await signInWithPassword(input, password);
} else {
  await signInWithUsername(input, password);
}
```

**Links:**
- "Forgot password?" → Password reset screen
- "Don't have an account? Sign up" → Sign-up screen

---

### 4. Create Password Reset Screen

**File:** `mobile/app/(auth)/reset-password.tsx`

**UI:**
- Email input
- Send reset link button
- Back to sign-in link

**Flow:**
1. User enters email
2. Call `resetPassword(email)`
3. Show success message: "Check your email for password reset instructions"
4. User clicks link in email → redirected to app
5. App prompts for new password
6. Call `updatePassword(newPassword)`

**Deep Link Handling:**
```typescript
// In app/_layout.tsx or similar
useEffect(() => {
  const url = Linking.getInitialURL();
  if (url?.includes('reset-password')) {
    // Parse token and navigate to reset screen
  }
}, []);
```

---

### 5. Password Validation Utility

**File:** `mobile/lib/validation.ts`

```typescript
export const validateEmail = (email: string): string | null => {
  const trimmed = email.trim();
  if (!trimmed) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'Please enter a valid email';
  }
  return null;
};

export const validatePassword = (password: string): string | null => {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/\d/.test(password)) return 'Password must contain at least one number';
  return null;
};

export const validateUsername = (username: string): string | null => {
  const trimmed = username.trim();
  if (!trimmed) return 'Username is required';
  if (trimmed.length < 3) return 'Username must be at least 3 characters';
  if (trimmed.length > 30) return 'Username must be 30 characters or less';
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return 'Username can only contain letters, numbers, and underscores';
  }
  return null;
};
```

---

### 6. Mock Users for Testing

**File:** `supabase/migrations/20251230000005_create_mock_users.sql`

**Strategy:**
Since we can't directly insert into `auth.users` table via SQL (Supabase manages it), we'll create a separate migration that documents the test users and provides a setup script.

**Test Users (to create via Supabase Dashboard or script):**
```
User 1:
- Email: alice@test.com
- Password: Password123
- Username: alice_ufc

User 2:
- Email: bob@test.com
- Password: Password123
- Username: bob_fighter

User 3:
- Email: charlie@test.com
- Password: Password123
- Username: charlie_picks
```

**Alternative: Seed Script**
```typescript
// scripts/seed-test-users.ts
// Run with: deno run --allow-net --allow-env scripts/seed-test-users.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const users = [
  { email: 'alice@test.com', password: 'Password123', username: 'alice_ufc' },
  { email: 'bob@test.com', password: 'Password123', username: 'bob_fighter' },
  { email: 'charlie@test.com', password: 'Password123', username: 'charlie_picks' },
];

// Create users using admin API
for (const user of users) {
  // Sign up user
  // Create profile with username
}
```

---

### 7. Updated Auth Flow Diagrams

**Sign Up Flow:**
```
User opens app
  ↓
No session → Sign-in screen
  ↓
User taps "Sign up"
  ↓
Sign-up screen (email + password)
  ↓
Validation passes → Call signUp()
  ↓
Supabase creates auth.users record
  ↓
Session established
  ↓
Auth state change triggers redirect
  ↓
No profile found → Create-username screen
  ↓
User enters username → Call createProfile()
  ↓
Profile created → Redirect to home
```

**Sign In Flow (Password):**
```
User opens app
  ↓
No session → Sign-in screen
  ↓
User selects "Password" tab
  ↓
User enters "alice_ufc" + "Password123"
  ↓
App detects non-email input
  ↓
Query profiles: SELECT user_id FROM profiles WHERE username = 'alice_ufc'
  ↓
Get auth.users email for that user_id
  ↓
Call signInWithPassword(email, password)
  ↓
Session established → Redirect to home
```

**Sign In Flow (Email OTP - Existing):**
```
User opens app
  ↓
No session → Sign-in screen
  ↓
User selects "Email Code" tab
  ↓
User enters email → Send OTP
  ↓
User enters code → Verify OTP
  ↓
Session established → Redirect to home or create-username
```

---

## Testing Strategy

### Unit Tests

**File:** `mobile/__tests__/hooks/useAuth.test.ts`

**New Tests to Add:**
```typescript
describe('signUp', () => {
  it('should create new user with email and password')
  it('should throw error if email already exists')
  it('should throw error if password is too weak')
});

describe('signInWithPassword', () => {
  it('should sign in with valid email and password')
  it('should throw error with invalid password')
  it('should throw error with non-existent email')
});

describe('signInWithUsername', () => {
  it('should sign in with valid username and password')
  it('should throw error if username not found')
  it('should throw error with invalid password')
});

describe('resetPassword', () => {
  it('should send password reset email')
  it('should throw error with invalid email')
});
```

### Integration Tests

**File:** `mobile/__tests__/auth-flows.test.tsx`

**Test complete flows:**
1. Sign up → Create username → Sign in with username
2. Sign up → Create username → Sign out → Sign in with email
3. Forgot password → Reset → Sign in with new password
4. Email OTP flow (existing)

### Manual Testing Checklist

- [ ] Sign up with new email
- [ ] Sign up with existing email (should fail)
- [ ] Sign up with weak password (should fail)
- [ ] Sign in with email + password
- [ ] Sign in with username + password
- [ ] Sign in with wrong password (should fail)
- [ ] Sign in with non-existent username (should fail)
- [ ] Request password reset
- [ ] Click reset link in email
- [ ] Set new password
- [ ] Sign in with new password
- [ ] Email OTP still works (alternative method)
- [ ] Session persists after app restart

---

## Error Handling

### Supabase Auth Errors

Map Supabase error codes to user-friendly messages:

```typescript
const getAuthErrorMessage = (error: any): string => {
  const code = error?.code || error?.message;

  switch (code) {
    case 'user_already_exists':
      return 'An account with this email already exists';

    case 'invalid_credentials':
      return 'Invalid email or password';

    case 'email_not_confirmed':
      return 'Please confirm your email before signing in';

    case 'weak_password':
      return 'Password must be at least 8 characters with 1 number';

    default:
      return error?.message || 'An error occurred';
  }
};
```

---

## Security Considerations

### Password Requirements
- Minimum 8 characters
- At least 1 number
- Optional: 1 uppercase, 1 lowercase, 1 special char (for stricter security)

### Username Requirements
- Unique across all users
- 3-30 characters
- Alphanumeric + underscore only
- Case-insensitive for login (store lowercase)

### Session Security
- Tokens stored in AsyncStorage (encrypted by OS)
- Auto-refresh tokens before expiry
- Sign out clears all local data

### Rate Limiting
- Sign-up: Max 5 attempts per IP per hour
- Sign-in: Max 10 attempts per IP per minute (existing)
- Password reset: Max 3 requests per email per hour

---

## UI/UX Improvements

### Sign-In Screen Tabs
```
┌─────────────────────────────────┐
│  [Password]  [Email Code]       │ ← Tabs
├─────────────────────────────────┤
│                                 │
│  Email or Username              │
│  ┌─────────────────────────────┐│
│  │ alice_ufc                   ││
│  └─────────────────────────────┘│
│                                 │
│  Password                       │
│  ┌─────────────────────────────┐│
│  │ ••••••••••••                ││
│  └─────────────────────────────┘│
│                                 │
│  [Forgot password?]             │
│                                 │
│  ┌─────────────────────────────┐│
│  │      Sign In                ││
│  └─────────────────────────────┘│
│                                 │
│  Don't have an account? Sign up │
│                                 │
└─────────────────────────────────┘
```

### Loading States
- Show spinner during sign-up/sign-in
- Disable buttons during requests
- Clear error messages on input change

### Success Messages
- Sign up: "Account created! Please create a username"
- Password reset: "Check your email for reset instructions"
- Password updated: "Password successfully updated"

---

## Implementation Checklist

### Phase 1: Core Auth Methods
- [ ] Add validateEmail, validatePassword, validateUsername to validation.ts
- [ ] Add signUp() to useAuth hook
- [ ] Add signInWithPassword() to useAuth hook
- [ ] Add signInWithUsername() to useAuth hook (with profile lookup)
- [ ] Add resetPassword() to useAuth hook
- [ ] Add updatePassword() to useAuth hook
- [ ] Add getAuthErrorMessage() utility

### Phase 2: Sign-Up Screen
- [ ] Create mobile/app/(auth)/sign-up.tsx
- [ ] Email input with validation
- [ ] Password input with strength indicator
- [ ] Confirm password input
- [ ] Sign up button with loading state
- [ ] Link to sign-in screen
- [ ] Error message display

### Phase 3: Update Sign-In Screen
- [ ] Add tab navigation (Password / Email Code)
- [ ] Password tab: Email or Username input
- [ ] Password tab: Password input
- [ ] Password tab: Forgot password link
- [ ] Keep Email Code tab (existing OTP flow)
- [ ] Smart detection (email vs username)
- [ ] Link to sign-up screen

### Phase 4: Password Reset
- [ ] Create mobile/app/(auth)/reset-password.tsx
- [ ] Email input
- [ ] Send reset link button
- [ ] Success message
- [ ] Handle deep link (optional for MVP)

### Phase 5: Testing
- [ ] Write unit tests for new auth methods
- [ ] Write integration tests for complete flows
- [ ] Manual testing with mock users
- [ ] Verify email OTP still works

### Phase 6: Documentation
- [ ] Update README with auth options
- [ ] Document test users
- [ ] Create Sprint 1 completion summary

---

## Success Criteria

Sprint 1 is complete when:
- ✅ Users can sign up with email + password
- ✅ Users can sign in with email + password
- ✅ Users can sign in with username + password
- ✅ Users can reset their password
- ✅ Email OTP still works as alternative
- ✅ All tests passing (15+ tests)
- ✅ CI green
- ✅ 3 mock users created and tested

---

## Next: Sprint 2 (Social Features)

After Sprint 1, we'll implement:
- Friendships (add friends, view friend picks)
- Leagues (create/join leagues with invite codes)
- Leaderboards (global, friends, league)
- Community pick percentages
- Always-visible picks (per user decision)

---

## References

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth/auth-helpers/auth-ui)
- [Password Reset Flow](https://supabase.com/docs/guides/auth/auth-password-reset)
- [React Native Secure Text](https://reactnative.dev/docs/textinput#securetextentry)
