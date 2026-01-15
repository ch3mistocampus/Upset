# Data Source Compliance

**Status**: Finalized
**Last Updated**: 2026-01-14

## Fight Database

Fight schedules, matchups, and statistics are compiled from publicly available sources and maintained in our own database.

**Data Collected**:
- Fighter biographical data (name, nickname, height, weight, reach, stance)
- Career statistics (striking accuracy, takedown defense, etc.)
- Event schedules and fight cards
- Fight results and methods

**Implementation**:
- Data synced via Edge Functions
- Respectful rate limiting
- Only accessing publicly available information
- Data cached to minimize external requests

## App Store Submission Notes

Include in App Store Review Notes:
```
Fight schedules, matchups, and statistics are compiled from
publicly available sources and maintained in our own database.

This app is not affiliated with or endorsed by the UFC or any
other promotion. Fighter names and event information are used
for informational purposes only.

This is a fan prediction app - users predict fight outcomes for
fun and compete on leaderboards. No gambling or wagering
functionality is included.
```

## User Data

- User picks (predictions) are stored in Supabase
- Protected by Row Level Security (users can only access their own data)
- No betting or wagering data
- No payment information
- Leaderboard participation is opt-in (username only)

## Privacy Considerations

- No real money transactions
- No third-party data sharing
- User picks are private by default
- GDPR-compliant data practices
- Delete account functionality available

## In-App Disclaimer

The following disclaimer is displayed in the app settings:

> Fight schedules, matchups, and statistics are compiled from publicly available sources and maintained in our own database. This app is not affiliated with or endorsed by the UFC or any other promotion.

## Technical Files

### Edge Functions
- `supabase/functions/sync-events/` - Event sync
- `supabase/functions/sync-results/` - Result sync
- `supabase/functions/sync-next-event-card/` - Fight card sync

### Database
- `ufc_fighters` - Fighter statistics
- `ufc_events` - Event history
- `ufc_fights` - Fight records
- `events` - Active events for picks
- `bouts` - Fight cards
- `results` - Fight outcomes
