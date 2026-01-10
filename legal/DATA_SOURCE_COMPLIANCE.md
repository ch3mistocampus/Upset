# Data Source Compliance

**Status**: In Progress
**Last Updated**: 2026-01-10

## Current Data Source

### UFCStats.com (Current)
- **Type**: Web scraping
- **Data**: Events, bouts, results, fighter stats
- **Risk Level**: Medium-High

**Concerns:**
- No explicit permission to scrape
- Terms of Service may prohibit scraping
- Could be blocked at any time
- App Store may reject for IP violation

**Mitigation:**
- Using respectful rate limiting (500-1000ms between requests)
- Only accessing publicly available data
- Using standard browser User-Agent
- Not circumventing any access controls

## Alternative: MMA API (RapidAPI)

### API Details
- **Provider**: RapidAPI (mma-api1)
- **URL**: https://rapidapi.com/developer-developer-default/api/mma-api1
- **Data Source**: ESPN data
- **Pricing**: Free tier (80 requests/month), paid plans available

### Integration Status
- [x] API key setup documented
- [x] Test scripts created (`scripts/test-mma-api.mjs`)
- [x] Schedule endpoint tested
- [x] Scoreboard endpoint tested
- [x] Database columns added for ESPN IDs (`apply-espn-columns.sql`)
- [x] Sync scripts drafted (`sync-mma-api-events.mjs`, `sync-mma-api-bouts.mjs`)
- [ ] Full integration testing
- [ ] Edge Function deployment
- [ ] Migration from UFCStats to MMA API

### API Endpoints Available
| Endpoint | Data | Status |
|----------|------|--------|
| `/schedule` | Upcoming events | Tested |
| `/scoreboard` | Live/recent events | Tested |
| `/event/{id}` | Event details with fights | To test |
| `/fighter/{id}` | Fighter profile | To test |

### Pros
- **Legitimate API** with clear terms of service
- **App Store compliant** - no scraping concerns
- **Reliable** - official API with SLA
- **ESPN data** - authoritative source

### Cons
- **Rate limits** on free tier (80/month)
- **Cost** for higher tiers ($15-50/month)
- **Data mapping** required (ESPN IDs vs UFCStats IDs)

## Recommendation

### Short Term (Pre-Launch)
1. Continue using UFCStats for development
2. Document data source clearly in App Store notes
3. Monitor for any issues or blocks

### Medium Term (Post-Launch)
1. Migrate to MMA API for production reliability
2. Consider paid tier based on usage
3. Implement hybrid approach if needed

### App Store Submission Notes

Include in App Store Review Notes:
```
Fight data is sourced from publicly available UFC statistics
websites. The app does not scrape private data, bypass
authentication, or violate terms of service. We are in the
process of migrating to an official licensed API (RapidAPI
MMA API) for production use.

The app is not affiliated with or endorsed by UFC or Zuffa, LLC.
Fighter names and event information are used for informational
purposes only.
```

## Files

### Scripts
- `mobile/scripts/test-mma-api.mjs` - API testing
- `mobile/scripts/explore-mma-api.mjs` - Endpoint exploration
- `mobile/scripts/sync-mma-api-events.mjs` - Event sync
- `mobile/scripts/sync-mma-api-bouts.mjs` - Bout sync

### Database
- `mobile/scripts/apply-espn-columns.sql` - Add ESPN ID columns

### Environment Variables
```bash
# Add to mobile/.env
MMA_API_KEY=your_rapidapi_key_here
```

## Action Items

1. [ ] Subscribe to MMA API free tier
2. [ ] Run test scripts to verify API access
3. [ ] Complete full integration testing
4. [ ] Deploy sync Edge Functions for MMA API
5. [ ] Test data accuracy vs UFCStats
6. [ ] Switch production to MMA API
7. [ ] Monitor for any rate limiting issues
