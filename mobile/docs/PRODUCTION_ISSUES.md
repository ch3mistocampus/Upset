# Production Issues Log

Issues identified during production readiness review. Priority: HIGH (must fix), MEDIUM (should fix), LOW (nice to have).

> **Latest Review**: January 2026
> **Test Status**: 129/129 tests passing
> **Overall Status**: Ready for App Store submission

---

## Resolved Issues (Verified January 2026)

### HIGH - App-Level Error Boundary Missing
**Status:** FIXED
**File:** `components/ErrorBoundary.tsx`, `app/_layout.tsx`
**Issue:** App crashes showed white screen with no recovery option.
**Fix:** Added `AppErrorBoundary` component with Sentry integration, restart button, and bug report option.

### HIGH - Request Timeout Not Configured
**Status:** FIXED
**File:** `lib/supabase.ts`
**Issue:** Hanging requests could cause poor UX with no timeout.
**Fix:** Added 30-second timeout via custom fetch wrapper with AbortController.

### HIGH - React Query Offline Handling
**Status:** FIXED
**File:** `app/_layout.tsx`
**Issue:** Network mode not configured for offline-first behavior.
**Fix:** Added `networkMode: 'offlineFirst'` and exponential retry backoff.

### MEDIUM - OAuth Double-Tap Race Condition
**Status:** FIXED
**Files:** `hooks/useAppleAuth.ts`, `hooks/useGoogleAuth.ts`
**Issue:** Rapid tapping could trigger multiple auth attempts.
**Fix:** Added loading state check at start of sign-in functions.

### MEDIUM - Missing Jest Mocks
**Status:** FIXED
**File:** `jest.setup.js`
**Issue:** Tests failing due to missing mocks for native modules.
**Fix:** Added mocks for `expo-apple-authentication`, `expo-updates`, `@react-native-google-signin/google-signin`, `@react-native-community/netinfo`.

---

## Pending Issues

### MEDIUM - Inconsistent Loading States in Admin Screens
**Status:** PENDING
**Files:** `app/admin/users.tsx`, `app/admin/posts.tsx`, `app/admin/data-sources.tsx`
**Issue:** Admin screens use ActivityIndicator instead of SkeletonCard loaders.
**Impact:** Inconsistent UX, minor visual issue.
**Recommendation:** Replace ActivityIndicator with SkeletonCard components for consistency.

### LOW - Some Screens Missing EmptyState
**Status:** PENDING
**Files:** Various admin screens
**Issue:** Some screens show generic "No data" instead of EmptyState component.
**Impact:** Minor UX inconsistency.
**Recommendation:** Add EmptyState with appropriate icons and messages.

### LOW - Test Wrapper Issues
**Status:** PARTIALLY FIXED
**Files:** `__tests__/hooks/*.test.ts`
**Issue:** Tests need proper provider wrappers (AuthProvider, QueryClientProvider).
**Impact:** Some tests fail in CI.
**Recommendation:** Complete test wrapper setup for all hook tests.

---

## Known Limitations

### OAuth Requires Native Build
- Apple Sign-In only works in native builds, not Expo Go
- Google Sign-In requires proper client IDs configured
- Cannot test OAuth in simulator without proper setup

### Guest Mode Limitations
- Guest picks stored in AsyncStorage only
- Migration happens on first sign-in
- If migration fails, picks remain in local storage for retry

### Push Notifications
- Requires iOS device (not simulator) for testing
- Token registration happens after permission grant
- Notification preferences stored server-side

---

## Performance Considerations

### Image Loading
- Fighter images cached by React Native's Image component
- Large images could cause memory pressure
- Consider implementing progressive loading for galleries

### Query Caching
- 5-minute stale time for most queries
- 10-minute garbage collection time
- Offline-first mode may show stale data

### Bundle Size
- Current bundle includes all Expo modules
- Consider tree-shaking unused components
- Monitor bundle size with EAS insights

---

## Security Notes

### RLS Policies Active
All tables have Row Level Security enabled:
- `picks` - users can only see/edit their own
- `posts` - respects block/mute status
- `profiles` - public read, owner write
- `notifications` - users can only see their own

### Data Not Logged
Sensitive data excluded from logs:
- Auth tokens
- Full email addresses (truncated)
- Password attempts

### API Keys
- Supabase anon key is public (RLS enforces security)
- OAuth client IDs configured via EAS secrets
- Sentry DSN is public (standard practice)

---

## Monitoring Checklist

### Sentry
- [ ] Verify error boundary reports to Sentry
- [ ] Check crash-free rate after release
- [ ] Monitor for new error patterns

### Analytics
- [ ] Track sign-up funnel
- [ ] Monitor pick submission rate
- [ ] Track feature adoption

### Server
- [ ] Check Edge Function logs
- [ ] Monitor database connection pool
- [ ] Watch for RLS policy violations

---

## Rollback Plan

If critical issues found post-release:

1. **Minor issues:** Push OTA update via EAS Update
2. **Major issues:** Submit new build, request expedited review
3. **Critical:** Pull app from store (last resort)

### OTA Update Process
```bash
eas update --branch production --message "Fix [issue]"
```

### Emergency Contacts
- Supabase Status: status.supabase.com
- Expo Status: status.expo.dev
- App Store Connect: appstoreconnect.apple.com

---

*Last Updated: January 2026 - Production Readiness Review*

---

## Verification Summary (January 2026)

All critical items verified and working:

| Component | Status | Notes |
|-----------|--------|-------|
| Error Boundary | ✅ Verified | Sentry integration, recovery UI |
| Mutation Error Handling | ✅ Verified | Consistent toast notifications |
| Request Timeouts | ✅ Verified | 30s timeout with AbortController |
| React Query Config | ✅ Verified | Offline-first, retry logic |
| OAuth Protection | ✅ Verified | Loading states prevent race conditions |
| Guest Migration | ✅ Verified | Idempotent with error handling |
| Deep Link Handling | ✅ Added | Password reset, email verification via deep links |
| Test Suite | ✅ Passing | 129/129 tests passing |
