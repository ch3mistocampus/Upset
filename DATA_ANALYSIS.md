# Data Analysis Report: Fighters, Events & MMA API Feasibility

**Date**: 2026-01-10
**Purpose**: Evaluate current data and MMA API viability for production

---

## Executive Summary

The database contains **rich historical UFC data** but has gaps in fighter statistics. The MMA API (RapidAPI/ESPN) is **viable for production** with caveats around rate limits and cost.

| Verdict | Recommendation |
|---------|----------------|
| **Short-term** | Continue UFCStats scraping for event/bout data |
| **Medium-term** | Migrate to MMA API for reliability |
| **Long-term** | Consider official UFC API if available |

---

## 1. Current Database Analysis

### Fighters (`ufc_fighters`)

| Metric | Count | Coverage |
|--------|-------|----------|
| Total Fighters | 4,451 | - |
| With Weight Class | 4,365 | 98% |
| With Height | 4,101 | 92% |
| With DOB | 3,689 | 83% |
| With Reach | 2,479 | 56% |
| With Rankings | 144 | 3% (expected - only top 15 per division) |
| **With Advanced Stats (SLpM, etc.)** | **0** | **0%** |

**Gap Identified**: No fighters have advanced striking/grappling statistics populated (SLpM, SAPM, str_acc, td_avg, etc.)

**Impact**: Cannot show fighter comparison stats for picks. Users only see basic W-L record.

### Events

| Metric | Count |
|--------|-------|
| Total Events | 768 |
| Completed | 759 |
| Upcoming | 9 |
| With ESPN ID | 9 |
| Events 2025+ | 53 |
| Events 2026 | 9 |

**Status**: Event data is well-populated. ESPN IDs have been added to upcoming events via MMA API.

### Bouts & Fights

| Metric | Count |
|--------|-------|
| Historical Fights (`ufc_fights`) | 8,494 |
| With Results | 8,343 (98%) |
| With Fight Stats | 8,472 |
| Fight Stat Records (per round) | 16,941 |
| Active Bouts (`bouts`) | 134 |
| Scheduled | 60 |
| Completed | 74 |

**Status**: Excellent historical fight data with per-round statistics.

### Sample Upcoming Event: UFC 324

| Order | Red Corner | Blue Corner | Weight Class |
|-------|------------|-------------|--------------|
| Main | Justin Gaethje | Paddy Pimblett | Lightweight |
| Co-Main | Kayla Harrison | Amanda Nunes | Women's BW |
| 3 | Sean O'Malley | Song Yadong | Bantamweight |
| 4 | Waldo Cortes Acosta | Derrick Lewis | Heavyweight |
| ... | ... | ... | ... |
| **Total** | **13 fights** | | |

---

## 2. MMA API Analysis

### Provider Details

| Attribute | Value |
|-----------|-------|
| Provider | RapidAPI |
| API | mma-api1 |
| Data Source | ESPN |
| Base URL | https://mma-api1.p.rapidapi.com |

### Pricing Tiers

| Tier | Requests/Month | Cost | Use Case |
|------|----------------|------|----------|
| Free | 80 | $0 | Development/testing |
| Basic | 500 | $15 | Small user base |
| Pro | 10,000 | $50 | Production |
| Ultra | 100,000 | $150 | High traffic |

### API Endpoints

| Endpoint | Data Provided | API Calls/Use |
|----------|---------------|---------------|
| `/schedule` | All events for a year | 1 |
| `/scoreboard-by-event` | Fight card for event | 1 per event |
| `/scoreboard` | Live/recent events | 1 |
| `/fighter/{id}` | Fighter profile | 1 per fighter |

### Data Fields Available

**Events:**
- Event ID, name, date
- Venue (name, city, country)
- Status (scheduled, live, completed)

**Fights:**
- Fight ID, order
- Weight class, type (title/regular)
- Competitors with athlete profiles
- Records (W-L summary)
- Results (winner, method, time)

**Fighters (via `/fighter` endpoint):**
- Display name, nickname
- Height, weight, reach
- Birthdate, birthplace
- Stance
- Record (W-L-D)
- Fight history

### Integration Status

| Component | Status | Notes |
|-----------|--------|-------|
| Event sync script | Ready | `sync-mma-api-events.mjs` |
| Bout sync script | Ready | `sync-mma-api-bouts.mjs` |
| ESPN ID columns | Added | `espn_event_id`, `espn_fighter_id` |
| Fighter mapping | Partial | Need to link ESPN IDs to existing fighters |
| Results sync | Not built | Need `/scoreboard` integration |

---

## 3. Data Source Comparison

### UFCStats.com (Current)

| Pros | Cons |
|------|------|
| Free | No permission/TOS risk |
| Comprehensive historical data | Can be blocked |
| Round-by-round statistics | HTML parsing fragile |
| Official UFC statistics | App Store compliance risk |

### MMA API (Alternative)

| Pros | Cons |
|------|------|
| Legitimate API with TOS | Costs money ($15-50/mo) |
| App Store compliant | Rate limited |
| Reliable SLA | Less detailed fight stats |
| ESPN data source | Fighter IDs don't match existing |

### Data Completeness Comparison

| Data Type | UFCStats | MMA API |
|-----------|----------|---------|
| Events | Full (768) | Upcoming only |
| Fight Cards | Full | Full |
| Results (W/L) | Full | Full |
| Round-by-Round Stats | Full | Limited |
| Fighter Profiles | Basic | Basic |
| Fighter Stats (SLpM) | Available (not scraped) | Not available |
| Rankings | Manual | Not available |
| Live Scores | No | Yes |

---

## 4. Gap Analysis

### Critical Gaps

1. **Fighter Advanced Stats**: 0% coverage of striking/grappling stats
   - **Impact**: Can't show fighter comparison for picks
   - **Fix**: Scrape from UFCStats fighter pages OR accept limitation

2. **Fighter-Event Mapping**: ESPN IDs vs UFCStats IDs
   - **Impact**: Can't link MMA API fighters to existing records
   - **Fix**: Build name-matching algorithm, manual verification

3. **Results Sync**: No MMA API results integration
   - **Impact**: Can't grade picks from API data
   - **Fix**: Build `/scoreboard` result extraction

### Non-Critical Gaps

1. **Rankings**: Only 144 fighters ranked (correct - only top 15 per division)
2. **Reach data**: 56% coverage (acceptable)

---

## 5. Production Feasibility Assessment

### Scenario A: Launch with UFCStats Only

| Factor | Assessment |
|--------|------------|
| Data Quality | Excellent |
| Reliability | Medium (can be blocked) |
| Cost | Free |
| App Store Risk | Medium |
| Time to Launch | Immediate |

**Verdict**: Viable but risky

### Scenario B: Launch with MMA API

| Factor | Assessment |
|--------|------------|
| Data Quality | Good (less detailed) |
| Reliability | High (SLA) |
| Cost | $15-50/month |
| App Store Risk | Low |
| Time to Launch | 1-2 weeks integration |

**Verdict**: Safer but requires work

### Scenario C: Hybrid Approach (Recommended)

| Factor | Assessment |
|--------|------------|
| Data Quality | Excellent |
| Reliability | High |
| Cost | $15-50/month |
| App Store Risk | Low |
| Time to Launch | 1 week |

**Strategy:**
1. Use UFCStats for historical data (already in DB)
2. Use MMA API for upcoming events + results
3. Fallback to UFCStats if API fails
4. Document hybrid approach in App Store notes

**Verdict**: Best of both worlds

---

## 6. Rate Limit Analysis

### MMA API Usage Per Month

| Operation | Frequency | Calls | Monthly |
|-----------|-----------|-------|---------|
| Event sync | Daily | 1 | 30 |
| Bout sync | Daily × 5 events | 5 | 150 |
| Results check | 4× on event day | 4 | 16 |
| **Total** | | | **~200** |

**Recommendation**: Basic tier (500 calls) is sufficient for MVP

### Scaling Considerations

| User Count | Additional API Needs | Tier Needed |
|------------|---------------------|-------------|
| < 1,000 | None (server-side sync) | Basic ($15) |
| 1,000-10,000 | None | Basic ($15) |
| 10,000+ | Real-time updates | Pro ($50) |

---

## 7. Recommendations

### Immediate Actions (Pre-Launch)

1. **Subscribe to MMA API Basic tier** ($15/month)
   - Provides 500 requests/month
   - Sufficient for event/bout sync

2. **Complete results sync integration**
   - Build `/scoreboard` result extraction
   - Auto-grade picks from API data

3. **Document data source in App Store submission**
   ```
   Fight data is sourced from ESPN via licensed API.
   Historical statistics from publicly available sources.
   Not affiliated with UFC.
   ```

### Short-Term (Month 1-3)

4. **Build fighter ID mapping**
   - Link ESPN fighter IDs to existing `ufc_fighters` records
   - Use name matching + verification

5. **Add fallback scraping**
   - If MMA API fails, fall back to UFCStats
   - Log failures for monitoring

### Long-Term (Month 3+)

6. **Evaluate scraping fighter stats**
   - Consider scraping UFCStats for SLpM, accuracy, etc.
   - Would enable rich fighter comparisons

7. **Monitor for official UFC API**
   - UFC may launch official API
   - Would be most compliant option

---

## 8. Cost-Benefit Summary

| Approach | Monthly Cost | Risk Level | Data Quality |
|----------|--------------|------------|--------------|
| UFCStats only | $0 | High | Excellent |
| MMA API only | $15-50 | Low | Good |
| **Hybrid (Recommended)** | **$15** | **Low** | **Excellent** |

---

## Appendix: API Request Examples

### Schedule Request
```bash
curl -X GET "https://mma-api1.p.rapidapi.com/schedule?year=2026&league=ufc" \
  -H "x-rapidapi-host: mma-api1.p.rapidapi.com" \
  -H "x-rapidapi-key: YOUR_KEY"
```

### Scoreboard Request
```bash
curl -X GET "https://mma-api1.p.rapidapi.com/scoreboard-by-event?eventId=600057024&league=ufc" \
  -H "x-rapidapi-host: mma-api1.p.rapidapi.com" \
  -H "x-rapidapi-key: YOUR_KEY"
```

---

**Report Generated**: 2026-01-10
**Data Source**: Supabase production database
**Author**: Claude Opus 4.5
