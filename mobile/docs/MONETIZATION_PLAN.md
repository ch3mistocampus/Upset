# Monetization Plan (TODO)

> **Status**: Planning phase - not yet implemented
> **Target**: Post-launch (revisit after initial user feedback)

---

## Overview

This document outlines the planned monetization strategy for Upset using Superwall for paywall management.

---

## Technology Stack (Planned)

- **Superwall** - Paywall presentation and A/B testing
- **App Store / Play Store** - Native in-app purchases
- **Supabase** - Subscription status storage and entitlement checking

---

## Monetization Options Under Consideration

### Option A: Freemium (Feature-gated)

| Free | Premium |
|------|---------|
| 3 picks per event | Unlimited picks |
| Basic fighter stats | Advanced stats (strike accuracy, td defense, etc.) |
| Global leaderboard | Friends leaderboard + event leaderboards |
| View feed | Post to feed |

### Option B: Usage Limits

| Free | Premium |
|------|---------|
| 5 picks per month | Unlimited picks |
| All features available | Same features, no limits |

### Option C: Advanced Analytics

| Free | Premium |
|------|---------|
| All picks, all events | Same |
| Basic accuracy % | Detailed stats (by weight class, method predictions, streaks) |
| Basic fighter info | Full tale of the tape, historical matchup data |

### Option D: Social Paywall

| Free | Premium |
|------|---------|
| Make picks, view stats | Same |
| View feed only | Post, comment, participate in discussions |
| See own stats | Compare stats with friends |

---

## Pricing Options (TBD)

- Monthly: ~$4.99/month
- Yearly: ~$29.99/year (save 50%)
- Lifetime: ~$79.99 (one-time)

---

## Implementation Checklist

When ready to implement:

- [ ] Create Superwall account and configure paywalls
- [ ] Install `@superwall/react-native-superwall` package
- [ ] Create `lib/superwall.ts` configuration
- [ ] Add subscription tables to Supabase:
  - `subscriptions` - User subscription records
  - `subscription_plans` - Available plans
- [ ] Create `hooks/useSubscription.ts` for entitlement checking
- [ ] Add paywall triggers at appropriate screens
- [ ] Implement restore purchases functionality
- [ ] Add subscription management in Settings
- [ ] Test purchase flow on TestFlight

---

## Questions to Answer Before Implementation

1. **What's the main value prop?** What keeps users coming back - the picks, the stats, or the community?
2. **Pricing model preference?** Monthly, yearly, or lifetime?
3. **How aggressive?** Should free users get a solid experience, or is it mainly a trial?
4. **When to show paywall?** On app open, on feature access, or both?

---

## Notes

- Superwall allows A/B testing different paywalls without app updates
- Consider offering a 7-day free trial for new users
- Monitor conversion rates and adjust based on user feedback
- Free tier should still provide value to drive word-of-mouth growth

---

*Last updated: January 2026*
