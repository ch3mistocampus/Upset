# Monetization Plan - Upset Pro

> **Status**: Implemented
> **Stack**: Superwall (expo-superwall) + App Store IAP + Supabase usage tracking

---

## Tiers

| Feature | Free | Upset Pro |
|---|---|---|
| Event picks | 2 events | Unlimited |
| Text posts | 5 posts | Unlimited |
| Image attachments | No | Yes |
| Leaderboard | View only (rank hidden) | Full ranking |
| Stats, fighters, feed browsing | Full | Full |

---

## Pricing

- **Monthly**: $3.99 (launch: $1.99)
- **Yearly**: $29.99 with 7-day free trial (launch: $14.99)
- No lifetime deal

---

## Paywall Triggers

### Hard paywalls (blocks action)
- `event_limit_reached` - 3rd event pick attempt
- `post_limit_reached` - 6th post creation attempt
- `image_attachment` - Any image attach attempt (free users)

### Soft paywalls (dismissable)
- `app_open` - After 5th session, then every ~10 sessions
- `milestone_nudge` - After notable accuracy (stretch goal)

---

## Implementation

### Database
- `subscriptions` table - tracks user plan status
- `usage_tracking` table - tracks event/post counts
- RPCs: `increment_event_usage`, `increment_post_usage`
- Auto-created via triggers on profile creation
- Backfill migration for existing users

### Frontend
- `lib/superwall.ts` - Config constants
- `hooks/useSubscription.ts` - Central gating hook
- `hooks/useSessionPaywall.ts` - Soft paywall logic
- `app/settings/subscription.tsx` - Subscription detail screen

### Gated screens
- `app/event/[id].tsx` - Event pick + submit gates
- `app/post/create/index.tsx` - Post create + image attach gates
- `app/(tabs)/leaderboards.tsx` - Rank visibility gate
- `components/EventCard.tsx` - Remaining events hint badge

### Settings
- Subscription section (upgrade/manage/restore)
- Dev toggles: Toggle Pro, Reset Usage Counters

---

## App Store Connect Setup

- [x] Create subscription group "Upset Pro"
- [x] Add products:
  - `com.getupset.app.pro.monthly` ($3.99, launch $1.99)
  - `com.getupset.app.pro.yearly` ($29.99, launch $14.99, 7-day free trial)

## Superwall Dashboard Setup

- [x] Create app, get API key
- [x] Set `EXPO_PUBLIC_SUPERWALL_IOS_KEY` in EAS secrets
- [x] Create 5 placements: `event_limit_reached`, `post_limit_reached`, `image_attachment`, `app_open`, `milestone_nudge`
- [x] Design paywall (accent #B0443F, monthly + yearly with yearly highlighted, trial badge, feature list, restore link)
- [x] Create campaigns linking placements to paywall
