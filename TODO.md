# Upset App - Master To-Do List

**Target**: App Store Launch
**Current Status**: 75% ready
**Last Updated**: 2026-01-13

---

## Critical (Blocking Launch)

### Legal Documents
- [x] **Privacy Policy** - DRAFTED in `legal/privacy-policy.md`
  - Covers: data collection, auth providers, social features, analytics
  - Host at: getupset.app/privacy
- [x] **Terms of Service** - DRAFTED in `legal/terms-of-service.md`
  - Covers: user conduct, leaderboard integrity, content moderation
  - Host at: getupset.app/terms
- [x] Settings screen updated with legal URLs
- [ ] **Host legal pages** at getupset.app (GitHub Pages or similar)

### Data Source Compliance
- [x] Document data source status - see `legal/DATA_SOURCE_COMPLIANCE.md`
- [x] UFCStats.com data pipeline working (sync-events, sync-results)
- [ ] Document data source in App Store review notes

### Android OAuth
- [x] Document setup steps - see `mobile/docs/ANDROID_OAUTH_SETUP.md`
- [ ] Generate Android Client ID in Google Cloud Console (manual step)
- [ ] Add `EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID` to .env
- [ ] Add to EAS secrets for production

---

## High Priority (Pre-Launch)

### Environment Security
- [ ] Remove `.env.local` from git tracking (contains real secrets)
- [ ] Set EAS secrets for production:
  ```bash
  eas env:create --name EXPO_PUBLIC_SENTRY_DSN --environment production --visibility sensitive
  eas env:create --name EXPO_PUBLIC_SUPABASE_URL --environment production --visibility plain
  eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --environment production --visibility sensitive
  ```

### Database
- [x] Fix migration conflict - renamed `20260110000001_update_fighter_profile_rpc.sql` → `20260110000002_...`

### OAuth Testing
- [ ] Test Google Sign-In on real iOS device
- [ ] Test Apple Sign-In on real iOS device (requires native build)
- [ ] Verify deep link callbacks: `upset://auth/callback`

### Test Coverage
- [x] Jest + React Native Testing Library configured (39 tests passing)
- [ ] Authentication flows (sign-in, sign-up, OAuth)
- [ ] Pick creation and locking logic
- [ ] Pick grading accuracy
- [ ] Privacy/blocking features

---

## Medium Priority (Polish)

### App Store Assets
- [ ] Verify app icon is 1024x1024 (iOS requirement)
- [ ] Prepare screenshots:
  - iPhone 6.7" (1290 x 2796)
  - iPhone 6.5" (1284 x 2778)
  - iPhone 5.5" (1242 x 2208)
  - iPad Pro 12.9" (2048 x 2732)
  - Android phone: 1080 x 1920 minimum
- [ ] Write App Store description
- [ ] Add keywords for ASO
- [ ] Prepare App Store review notes (explain guest mode, moderation)

### Production Build Testing
```bash
eas build --platform ios --profile preview    # TestFlight
eas build --platform ios --profile production # App Store
eas build --platform android --profile production
```
- [ ] Test on real iOS device (TestFlight)
- [ ] Test on real Android device (internal testing)
- [ ] Verify offline mode works
- [ ] Test all 46 screens

### Supabase Auth Settings
- [ ] Enable leaked password protection (Auth dashboard)
- [ ] Review rate limiting settings
- [ ] Verify email templates are branded

---

## Low Priority (Nice-to-Have)

### Monitoring
- [ ] Set up Sentry alerts for crash rate > 1%
- [ ] Set up Supabase dashboard monitoring
- [ ] Create runbook for common issues

### Performance
- [ ] Profile app startup time
- [ ] Check bundle size
- [ ] Verify images are optimized

---

## Known Bugs

No known bugs remaining.

### Fixed Bugs
- [x] **Picks not saving to database** - Verified working. 835 picks exist. RLS policies correct.
- [x] **Friends tab database errors** - All social functions already use `correct_winner` correctly.
- [x] **Migration timestamp conflict** - Renamed duplicate `20260110000001` files.
- [x] **Event scraper not fetching real data** - Verified working. 765 events, 126 bouts synced from UFCStats.
- [x] **Fighter selection UI** - Added smooth animations: color transitions, checkmark bounce, pulse effect, haptic feedback.
- [x] **Users without profiles** - Added database trigger to auto-create placeholder profiles on signup. Prevents orphaned users.

---

## Future Features (Post-Launch)

### Phase 5: Enhanced MVP
- [ ] Push notifications (event reminders, results ready, friend requests)
- [ ] Pick history & detailed results screen
- [ ] Edit picks before lock
- [ ] Delete account (GDPR compliance)

### Phase 6: Advanced Features
- [ ] Method/round scoring (predict how fight ends for bonus points)
- [ ] Pick confidence levels (1x/2x/3x multipliers with risk)
- [ ] Historical fighter statistics
- [ ] Achievement/badge system (streaks, accuracy milestones)
- [ ] Private leagues with invite codes
- [ ] Multi-organization support (Bellator, PFL, ONE Championship)
- [ ] Web app at ufcpickstracker.com
- [ ] Social sharing

### Global Scorecard Feature
- [ ] WebSocket/Realtime for instant updates
- [ ] Historical scorecard viewing
- [ ] Scorecard sharing/export
- [ ] Round-by-round predictions before scoring opens

---

## Already Done

- [x] Sentry error tracking configured and working
- [x] Apple Sign-In configured
- [x] Google Sign-In configured (iOS/Web)
- [x] RLS policies comprehensive
- [x] All 46 screens functional
- [x] Toast notifications polished
- [x] Navigation standardized
- [x] Guest mode working
- [x] Social features (posts, comments, follows)
- [x] Leaderboards implemented
- [x] Pick locking/grading logic
- [x] EAS build profiles configured
- [x] 39 unit tests passing
- [x] GitHub Actions CI configured
- [x] Structured logging in Edge Functions

---

## Launch Checklist

### Pre-Launch (Day Before)
- [ ] Final production build uploaded to App Store Connect
- [ ] Final production build uploaded to Google Play Console
- [ ] All environment variables set in EAS
- [ ] Sentry monitoring active
- [ ] Database backups configured

### Launch Day
- [ ] Submit for App Store review
- [ ] Submit for Google Play review
- [ ] Monitor Sentry for crashes
- [ ] Monitor database performance
- [ ] Be ready to hotfix if needed

### Post-Launch (First Week)
- [ ] Respond to user feedback
- [ ] Monitor crash-free rate (target: >99%)
- [ ] Check analytics for drop-off points
- [ ] Plan first update based on feedback

---

## Summary

| Category | Count | Status |
|----------|-------|--------|
| Critical (Blocking) | 3 remaining | Data source decided |
| High Priority | 6 | Partial (migration fix done) |
| Medium Priority | 12 | Not started |
| Low Priority | 6 | Not started |
| Known Bugs | 0 remaining | 6 fixed |
| Future Features | 15 | Backlog |

**Biggest blockers**: Hosting legal pages, Android OAuth

**Recent Progress (2026-01-14)**:
- Simplified to UFCStats.com only data source
- Removed SportsData.io integration
- Fixed fighter selection UI animations (P1)
- Added auto-profile trigger to prevent orphaned users (P2)
