# Upset App - Production Readiness Plan

**Target**: App Store launch
**Current Status**: 75% ready
**Estimated Time**: 2-3 weeks

---

## CRITICAL (Blocking Launch)

### 1. Legal Documents
- [ ] **Privacy Policy** - Required by App Store
  - Cover: data collection, auth providers, social features, analytics
  - Host at: getupset.app/privacy or similar
- [ ] **Terms of Service** - Required by App Store
  - Cover: user conduct, leaderboard integrity, content moderation
  - Host at: getupset.app/terms
- [ ] Add links to Settings screen (currently placeholder URLs)

### 2. Data Source Compliance
- [ ] **Verify UFCStats.com scraping is allowed** OR
- [ ] **Complete ESPN/MMA API integration** (migrations started)
- [ ] Document data source in App Store review notes
- Risk: App Store rejection for IP violations

### 3. Android OAuth Setup
- [ ] Generate Android Client ID in Google Cloud Console
- [ ] Add `EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID` to .env
- [ ] Add to EAS secrets for production

---

## HIGH PRIORITY (Pre-Launch)

### 4. Environment Security
- [ ] Remove `.env.local` from git tracking (contains real secrets)
- [ ] Use EAS secrets for all production environment variables:
  ```bash
  eas env:create --name EXPO_PUBLIC_SENTRY_DSN --environment production --visibility sensitive
  eas env:create --name EXPO_PUBLIC_SUPABASE_URL --environment production --visibility plain
  eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --environment production --visibility sensitive
  ```

### 5. Fix Migration Conflict
- [ ] Rename duplicate timestamp:
  - `20260110000001_update_ufc_rankings_dec2025.sql` → `20260110000002_...`

### 6. OAuth Testing
- [ ] Test Google Sign-In on real iOS device
- [ ] Test Apple Sign-In on real iOS device (requires native build)
- [ ] Verify deep link callbacks work: `upset://auth/callback`

### 7. Test Coverage
Priority tests to add:
- [ ] Authentication flows (sign-in, sign-up, OAuth)
- [ ] Pick creation and locking logic
- [ ] Pick grading accuracy
- [ ] Privacy/blocking features

---

## MEDIUM PRIORITY (Polish)

### 8. App Store Assets
- [ ] Verify app icon is 1024x1024 (iOS requirement)
- [ ] Prepare screenshots for all device sizes
- [ ] Write App Store description
- [ ] Add keywords for ASO
- [ ] Prepare App Store review notes (explain guest mode, moderation)

### 9. Production Build Testing
```bash
# Build for testing
eas build --platform ios --profile preview

# Build for App Store
eas build --platform ios --profile production
eas build --platform android --profile production
```
- [ ] Test on real iOS device (TestFlight)
- [ ] Test on real Android device (internal testing)
- [ ] Verify offline mode works
- [ ] Test all 46 screens

### 10. Supabase Auth Settings
- [ ] Enable leaked password protection (Auth dashboard)
- [ ] Review rate limiting settings
- [ ] Verify email templates are branded

---

## LOW PRIORITY (Nice-to-Have)

### 11. Monitoring Setup
- [ ] Set up Sentry alerts for crash rate > 1%
- [ ] Set up Supabase dashboard monitoring
- [ ] Create runbook for common issues

### 12. Performance
- [ ] Profile app startup time
- [ ] Check bundle size
- [ ] Verify images are optimized

---

## Launch Day Checklist

```
PRE-LAUNCH (Day Before)
[ ] Final production build uploaded to App Store Connect
[ ] Final production build uploaded to Google Play Console
[ ] All environment variables set in EAS
[ ] Sentry monitoring active
[ ] Database backups configured

LAUNCH DAY
[ ] Submit for App Store review
[ ] Submit for Google Play review
[ ] Monitor Sentry for crashes
[ ] Monitor database performance
[ ] Be ready to hotfix if needed

POST-LAUNCH (First Week)
[ ] Respond to user feedback
[ ] Monitor crash-free rate (target: >99%)
[ ] Check analytics for drop-off points
[ ] Plan first update based on feedback
```

---

## Current Blockers Summary

| Item | Status | Owner | ETA |
|------|--------|-------|-----|
| Privacy Policy | Not started | Legal | 3-5 days |
| Terms of Service | Not started | Legal | 3-5 days |
| Data Source Compliance | Investigating | Dev | 1 week |
| Android OAuth | Not configured | Dev | 1 day |
| Production Testing | Not started | QA | 3-5 days |

---

## What's Already Done ✅

- Sentry error tracking configured
- Apple Sign-In configured
- Google Sign-In configured (iOS/Web)
- RLS policies comprehensive
- All 46 screens functional
- Toast notifications polished
- Navigation standardized
- Guest mode working
- Social features (posts, comments, follows)
- Leaderboards implemented
- Pick locking/grading logic
- EAS build profiles configured
