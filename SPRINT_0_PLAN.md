# Sprint 0: Production Blockers - Technical Implementation Plan

## Overview
This sprint focuses on making the app production-ready by fixing critical security, testing, and monitoring gaps. All changes must be backward-compatible with existing data.

## Critical Constraints
- **No breaking changes** to existing database schema
- **No user data exists yet** (can modify auth flow safely)
- **Preserve existing pick tracking logic** (already working correctly)
- **Maintain current RLS isolation** while preparing for social features

---

## Implementation Order (Dependency-Ordered)

### Phase 1: Foundation & Audit (No Code Changes)
1. **Audit current RLS policies** - Document what exists and validate security
2. **Audit current auth flow** - Understand what's bypassed and what works
3. **Document current session management** - How tokens are stored/refreshed

### Phase 2: Testing Infrastructure (Enables Safe Changes)
4. **Set up Jest + React Native Testing Library** - Required before any code changes
5. **Create basic test suite** - Auth flow, pick creation, data fetching
6. **Set up CI workflow** - Automated testing on push

### Phase 3: Monitoring (Visibility Before Changes)
7. **Integrate Sentry** - Mobile app error tracking
8. **Integrate Sentry in Edge Functions** - Backend error tracking
9. **Replace console.log with structured logging** - Better debugging

### Phase 4: Auth Security (Critical Path)
10. **Re-enable auth routing** - Remove development bypass
11. **Implement session refresh** - Prevent token expiration issues
12. **Add email validation** - Prevent invalid emails
13. **Test complete auth flow** - Email OTP with real users

### Phase 5: Backend Security
14. **Add rate limiting to Edge Functions** - Prevent abuse
15. **Audit and strengthen RLS policies** - Prepare for social features
16. **Add health checks to scrapers** - Reliability improvements

---

## Database Migrations Needed

### Sprint 0: ZERO schema changes required
**Rationale:** All current tables are correctly designed. Social features (Sprint 2) will add new tables, but Sprint 0 only hardens what exists.

**Verification Checklist:**
- [ ] `profiles` table has correct structure (user_id, username, created_at)
- [ ] `picks` table has UNIQUE(user_id, bout_id) constraint
- [ ] Database trigger prevents pick changes after event_date
- [ ] All tables have `created_at` timestamps

**Future Migrations (Sprint 2):**
```sql
-- Will be created in Sprint 2, documented here for reference
-- friendships (id, user_id, friend_id, status, created_at)
-- leagues (id, name, invite_code, created_by, created_at)
-- league_memberships (id, league_id, user_id, joined_at)
-- privacy_settings (user_id, profile_visibility, picks_visibility, created_at)
```

---

## RLS Policy Changes

### Current State Audit Checklist

**✅ Policies to Verify (should exist):**
- [ ] `profiles` - Users can read own profile
- [ ] `profiles` - Users can insert own profile
- [ ] `profiles` - Users can update own profile
- [ ] `picks` - Users can read own picks
- [ ] `picks` - Users can insert own picks
- [ ] `picks` - Users can update own picks (with time constraint)
- [ ] `picks` - Users can delete own picks (with time constraint)
- [ ] `events` - Public read access (all users)
- [ ] `bouts` - Public read access (all users)
- [ ] `results` - Public read access (all users)
- [ ] `user_stats` - Users can read own stats
- [ ] `user_stats` - Service role can update (Edge Functions)

**🔒 Hardening Needed (Sprint 0):**
1. **Verify service role isolation** - Only Edge Functions should use service_role key
2. **Add delete protection** - Prevent accidental data deletion
3. **Audit anon key permissions** - Ensure mobile app has correct access only

**📝 Document for Sprint 2:**
- Social features will need to relax `picks` read policy
- Will add friend-based and league-based access
- Privacy settings will control visibility

### Sprint 0 RLS Changes Required

**Migration: `20250101000000_harden_rls_policies.sql`**

```sql
-- Strengthen picks policy - prepare for social features
-- Add explicit service role bypass for grading
ALTER POLICY "Users can update own picks" ON picks
USING (
  auth.uid() = user_id AND
  (SELECT event_date FROM events WHERE id = event_id) > NOW()
);

-- Add delete protection (picks should never be deleted)
DROP POLICY IF EXISTS "Users can delete own picks" ON picks;
CREATE POLICY "Picks are immutable after creation" ON picks
FOR DELETE
USING (false); -- No one can delete picks

-- Ensure user_stats can only be updated by service role
DROP POLICY IF EXISTS "Users can read own stats" ON user_stats;
CREATE POLICY "Users can read own stats" ON user_stats
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can update stats" ON user_stats
FOR UPDATE
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can insert stats" ON user_stats
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Add policy for username uniqueness check (needed for social)
CREATE POLICY "Usernames are publicly readable" ON profiles
FOR SELECT
USING (true); -- Anyone can check if username exists

-- Ensure profiles cannot be deleted
CREATE POLICY "Profiles are immutable" ON profiles
FOR DELETE
USING (false);
```

**Validation Script:**
```sql
-- Run this after migration to verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## Testing Infrastructure Setup

### 1. Install Testing Dependencies

**File: `mobile/package.json`**
```json
{
  "devDependencies": {
    "@testing-library/react-native": "^12.7.2",
    "@testing-library/jest-native": "^5.4.3",
    "jest": "^29.7.0",
    "jest-expo": "^52.0.2",
    "@types/jest": "^29.5.14"
  },
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "preset": "jest-expo",
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
    ],
    "setupFilesAfterEnv": ["<rootDir>/jest.setup.js"],
    "collectCoverageFrom": [
      "**/*.{ts,tsx}",
      "!**/*.d.ts",
      "!**/node_modules/**",
      "!**/.expo/**"
    ]
  }
}
```

**File: `mobile/jest.setup.js`**
```javascript
import '@testing-library/jest-native/extend-expect';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  Redirect: ({ href }: { href: string }) => `Redirect to ${href}`,
}));

// Mock Supabase client
jest.mock('./lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    })),
  },
}));
```

### 2. Priority Test Files

**Create these tests in order:**

1. **`mobile/__tests__/hooks/useAuth.test.ts`** - Auth state management
2. **`mobile/__tests__/app/index.test.tsx`** - Auth routing (currently bypassed)
3. **`mobile/__tests__/hooks/useQueries.test.ts`** - Data fetching
4. **`mobile/__tests__/app/(tabs)/pick.test.tsx`** - Pick creation flow

### 3. CI Workflow

**File: `.github/workflows/mobile-tests.yml`**
```yaml
name: Mobile Tests

on:
  push:
    branches: [main, 'claude/**']
    paths:
      - 'mobile/**'
  pull_request:
    branches: [main]
    paths:
      - 'mobile/**'

jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./mobile

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: mobile/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test -- --ci --coverage --maxWorkers=2

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          directory: ./mobile/coverage
          flags: mobile
```

---

## Sentry Integration

### 1. Mobile App Integration

**Install:**
```bash
cd mobile && npx expo install @sentry/react-native
```

**File: `mobile/app/_layout.tsx` (wrap root)**
```typescript
import * as Sentry from '@sentry/react-native';

// Initialize Sentry at app start
if (!__DEV__) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    enableInExpoDevelopment: false,
    debug: false,
    tracesSampleRate: 1.0,
  });
}

export default Sentry.wrap(RootLayout);
```

**Environment variable needed:**
```env
EXPO_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
```

### 2. Edge Functions Integration

**File: `supabase/functions/_shared/sentry.ts`**
```typescript
import * as Sentry from 'https://deno.land/x/sentry/index.mjs';

export function initSentry() {
  if (Deno.env.get('ENVIRONMENT') === 'production') {
    Sentry.init({
      dsn: Deno.env.get('SENTRY_DSN'),
      tracesSampleRate: 1.0,
    });
  }
}

export function captureError(error: Error, context?: Record<string, any>) {
  console.error('Error:', error, context);
  if (Deno.env.get('ENVIRONMENT') === 'production') {
    Sentry.captureException(error, { extra: context });
  }
}
```

**Update each Edge Function:**
```typescript
import { initSentry, captureError } from '../_shared/sentry.ts';

Deno.serve(async (req) => {
  initSentry();

  try {
    // ... function logic
  } catch (error) {
    captureError(error, { function: 'sync-events' });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

### 3. Structured Logging

**File: `mobile/lib/logger.ts`**
```typescript
import * as Sentry from '@sentry/react-native';

export const logger = {
  info: (message: string, context?: Record<string, any>) => {
    console.log(`[INFO] ${message}`, context);
  },

  warn: (message: string, context?: Record<string, any>) => {
    console.warn(`[WARN] ${message}`, context);
    if (!__DEV__) {
      Sentry.captureMessage(message, {
        level: 'warning',
        extra: context,
      });
    }
  },

  error: (message: string, error?: Error, context?: Record<string, any>) => {
    console.error(`[ERROR] ${message}`, error, context);
    if (!__DEV__) {
      Sentry.captureException(error || new Error(message), {
        extra: { message, ...context },
      });
    }
  },
};
```

**Replace console.log systematically:**
```typescript
// Before:
console.log('User signed in:', userId);

// After:
logger.info('User signed in', { userId });
```

---

## Auth Security Improvements

### 1. Re-enable Auth Routing

**File: `mobile/app/index.tsx`**

**Current (BYPASSED):**
```typescript
export default function Index() {
  return <Redirect href="/(tabs)/home" />; // Line 12 - BYPASSING AUTH!
}
```

**Fixed:**
```typescript
import { useAuth } from '@/hooks/useAuth';
import { Redirect } from 'expo-router';

export default function Index() {
  const { session, loading, hasUsername } = useAuth();

  if (loading) {
    return null; // Or loading spinner
  }

  // Not signed in -> go to sign in
  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  // Signed in but no username -> create username
  if (!hasUsername) {
    return <Redirect href="/(auth)/create-username" />;
  }

  // Signed in with username -> go to app
  return <Redirect href="/(tabs)/home" />;
}
```

### 2. Session Refresh Mechanism

**File: `mobile/hooks/useAuth.ts`**

**Add session refresh:**
```typescript
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export function useAuth() {
  // ... existing state

  // Add session refresh on mount
  useEffect(() => {
    // Refresh session on app start
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        logger.error('Failed to refresh session', error);
      }
    });

    // Listen for token refresh events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'TOKEN_REFRESHED') {
          logger.info('Session token refreshed');
        }
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ... rest of hook
}
```

### 3. Email Validation

**File: `mobile/app/(auth)/sign-in.tsx`**

**Add validation:**
```typescript
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

const handleSignIn = async () => {
  if (!email.trim()) {
    Alert.alert('Error', 'Please enter your email');
    return;
  }

  if (!isValidEmail(email.trim())) {
    Alert.alert('Error', 'Please enter a valid email address');
    return;
  }

  // ... rest of sign-in logic
};
```

### 4. Rate Limiting for Edge Functions

**File: `supabase/functions/_shared/rate-limit.ts`**
```typescript
// Simple in-memory rate limiter (for now, upgrade to Redis later)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000 // 1 minute
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  // Clean up expired entries
  if (record && now > record.resetAt) {
    rateLimitMap.delete(identifier);
  }

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      retryAfter: Math.ceil((record.resetAt - now) / 1000),
    };
  }

  record.count++;
  return { allowed: true };
}
```

**Use in Edge Functions:**
```typescript
import { checkRateLimit } from '../_shared/rate-limit.ts';

Deno.serve(async (req) => {
  const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
  const { allowed, retryAfter } = checkRateLimit(clientIp, 10, 60000);

  if (!allowed) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded', retryAfter }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter?.toString() || '60',
        },
      }
    );
  }

  // ... rest of function
});
```

---

## Implementation Checklist

### Pre-Implementation
- [ ] Read all existing RLS policies from Supabase dashboard
- [ ] Document current auth flow behavior
- [ ] Backup database (even though no users exist)

### Testing Infrastructure (Must be first!)
- [ ] Install Jest + React Native Testing Library
- [ ] Create jest.setup.js with mocks
- [ ] Write useAuth.test.ts
- [ ] Write index.test.tsx (auth router)
- [ ] Create CI workflow file
- [ ] Verify tests run locally
- [ ] Verify tests run in CI

### Monitoring (Before making changes)
- [ ] Create Sentry account + project
- [ ] Add EXPO_PUBLIC_SENTRY_DSN to .env
- [ ] Integrate Sentry in mobile app
- [ ] Create logger.ts utility
- [ ] Integrate Sentry in Edge Functions
- [ ] Test error reporting locally

### Database & RLS
- [ ] Create migration file: 20250101000000_harden_rls_policies.sql
- [ ] Apply migration locally
- [ ] Run validation script
- [ ] Test with 3 different users
- [ ] Apply to production

### Auth Security
- [ ] Fix mobile/app/index.tsx (remove bypass)
- [ ] Add session refresh to useAuth
- [ ] Add email validation to sign-in
- [ ] Test complete auth flow with Sentry monitoring
- [ ] Test session refresh (wait 1 hour)

### Backend Security
- [ ] Create rate-limit.ts utility
- [ ] Add rate limiting to sync-events
- [ ] Add rate limiting to sync-next-event-card
- [ ] Add rate limiting to sync-recent-results-and-grade
- [ ] Test rate limiting (exceed limit, verify 429)

### Final Verification
- [ ] Run full test suite (should be green)
- [ ] Check Sentry dashboard (errors should appear)
- [ ] Test auth flow end-to-end (sign up, sign in, sign out)
- [ ] Test pick creation (should still work)
- [ ] Verify CI passes
- [ ] Create test user accounts for Sprint 1 testing

---

## Success Criteria

**Sprint 0 is complete when:**
1. ✅ CI runs tests automatically and all tests pass
2. ✅ Sentry captures errors in mobile and Edge Functions
3. ✅ Auth routing is re-enabled (no bypass)
4. ✅ Session refresh works automatically
5. ✅ RLS policies are hardened and documented
6. ✅ Rate limiting prevents Edge Function abuse
7. ✅ Email validation prevents invalid inputs
8. ✅ No regression in pick tracking functionality

**Definition of Done:**
- All checklist items completed
- CI workflow green
- Manual testing with 3 test users successful
- Sentry dashboard shows errors (test errors intentionally)
- Zero console.log in critical paths (replaced with logger)
- Documentation updated with new RLS policies

---

## Risk Mitigation

**Risk: Breaking existing pick tracking**
- Mitigation: RLS changes are additive only, no schema changes
- Test: Create picks with 3 users before/after changes

**Risk: Auth re-enable breaks app**
- Mitigation: Test suite must pass before deployment
- Test: Write tests for auth router first

**Risk: Sentry not capturing errors**
- Mitigation: Intentionally trigger test errors
- Test: Verify errors appear in Sentry dashboard

**Risk: Rate limiting too aggressive**
- Mitigation: Start with generous limits (10 req/min)
- Test: Monitor Edge Function logs for 429s

---

## Next Steps After Sprint 0

Once Sprint 0 is complete and all tests pass:
1. **Sprint 1: Auth Redesign** - Implement email/password auth
2. **Sprint 2: Social Foundation** - Add friendships, leagues, always-visible picks
3. **Sprint 3: Edge Case Hardening** - Handle rescheduling, replacements, etc.
