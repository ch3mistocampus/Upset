# Posts Feature Fix Plan

## Overview
This plan addresses all 20 issues identified in the posts feature analysis, organized into 6 phases for systematic implementation.

---

## Phase 1: Critical Database Fixes (Security & Data Integrity)

### 1.1 Fix SECURITY DEFINER Search Path Vulnerability
**Issue:** #16 - Functions use SECURITY DEFINER without search_path
**Files:** New migration file

**Changes:**
- Create migration to update all RPC functions with `SET search_path = public, pg_temp`
- Affected functions:
  - `get_posts_feed`
  - `get_post_with_comments`
  - `toggle_post_like`
  - `toggle_comment_like`
  - `create_post`
  - `create_comment`
  - `create_fight_discussion_post`
  - `delete_post`
  - `delete_comment`
  - `get_user_posts`
  - `get_following_posts_feed_for_user`
  - All trigger functions

### 1.2 Fix Race Condition in Count Triggers
**Issue:** #3 - Lost updates under concurrent likes/comments
**Files:** New migration file

**Changes:**
- Modify `update_post_like_count()` to use row-level locking
- Modify `update_comment_like_count()` to use row-level locking
- Modify `update_post_comment_counts()` to use row-level locking
- Use `SELECT ... FOR UPDATE SKIP LOCKED` pattern for atomic updates

### 1.3 Fix Inconsistent Profile Join Column
**Issue:** #11 - Some functions join on `pr.id`, others on `pr.user_id`
**Files:** New migration file

**Changes:**
- Audit all functions for correct join: `profiles.user_id = posts.user_id`
- Update `get_posts_feed` to use consistent join
- Update `get_post_with_comments` to use consistent join
- Update `get_user_posts` to use consistent join

---

## Phase 2: Database Performance Optimizations

### 2.1 Add Missing Indexes
**Issue:** #2 - Missing index for following feed, #18 - Wrong comment index direction
**Files:** New migration file

**Changes:**
```sql
-- For following feed efficiency
CREATE INDEX idx_friendships_user_status ON public.friendships(user_id, status);
CREATE INDEX idx_friendships_following ON public.friendships(user_id, friend_id) WHERE status = 'accepted';

-- For comment ordering (ASC for chronological display)
CREATE INDEX idx_post_comments_post_created_asc ON public.post_comments(post_id, created_at ASC);

-- For user_has_liked checks
CREATE INDEX idx_post_likes_user_post ON public.post_likes(user_id, post_id);
CREATE INDEX idx_comment_likes_user_comment ON public.comment_likes(user_id, comment_id);
```

### 2.2 Eliminate N+1 Queries in Feed Functions
**Issue:** #4 - Correlated subqueries execute per-row
**Files:** New migration file

**Changes:**
- Rewrite `get_posts_feed` using lateral joins or CTEs:
```sql
-- Use lateral join for images
FROM posts p
LEFT JOIN LATERAL (
  SELECT json_agg(...) as images
  FROM post_images pi WHERE pi.post_id = p.id
) img ON true

-- Pre-aggregate user likes in CTE
WITH user_likes AS (
  SELECT post_id FROM post_likes WHERE user_id = auth.uid()
)
SELECT ..., EXISTS(SELECT 1 FROM user_likes ul WHERE ul.post_id = p.id)
```

- Apply same pattern to:
  - `get_post_with_comments`
  - `get_user_posts`
  - `get_following_posts_feed_for_user`

### 2.3 Fix Engagement Score Staleness
**Issue:** #1 - Time decay never updates after initial calculation
**Files:** New migration file + edge function or cron job

**Option A - Calculate at Query Time (Recommended):**
```sql
-- Remove engagement_score column updates from triggers
-- Calculate dynamically in feed queries:
ORDER BY (p.like_count * 2 + p.comment_count * 3) *
         (1.0 / (1.0 + EXTRACT(EPOCH FROM (now() - p.created_at)) / 86400.0)) DESC
```

**Option B - Scheduled Refresh:**
- Create `refresh_engagement_scores()` function
- Set up pg_cron or Supabase edge function to run every 15 minutes
- Keep materialized engagement_score for index efficiency

---

## Phase 3: Rate Limiting & Security

### 3.1 Add Rate Limiting to Content Creation
**Issue:** #9 - No rate limiting on posts/comments
**Files:** New migration file

**Changes:**
- Create rate limiting table:
```sql
CREATE TABLE public.rate_limits (
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  action_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, action_type, window_start)
);
```

- Create rate limit check function:
```sql
CREATE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_action TEXT,
  p_max_count INTEGER,
  p_window_minutes INTEGER
) RETURNS BOOLEAN
```

- Integrate into `create_post` (limit: 10 posts per hour)
- Integrate into `create_comment` (limit: 60 comments per hour)

### 3.2 Add Storage Bucket Validation
**Issue:** #10 - No file size/type validation
**Files:** New migration file + storage policies

**Changes:**
- Add storage policies:
```sql
-- Limit file size to 5MB
CREATE POLICY "Limit upload size"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'post-images' AND
  (metadata->>'size')::int <= 5242880
);

-- Restrict to image types
CREATE POLICY "Only allow images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'post-images' AND
  (metadata->>'mimetype') IN ('image/jpeg', 'image/png', 'image/gif', 'image/webp')
);
```

- Add per-user storage quota tracking

---

## Phase 4: API Improvements

### 4.1 Add Comment Pagination
**Issue:** #5 - No way to load more comments
**Files:** New migration file

**Changes:**
- Create new function `get_post_comments_paginated`:
```sql
CREATE FUNCTION get_post_comments_paginated(
  p_post_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_parent_id UUID DEFAULT NULL -- NULL for top-level, or specific parent for replies
) RETURNS TABLE (...)
```

- Deprecate comments array in `get_post_with_comments`
- Return only post data, fetch comments separately

### 4.2 Enforce Comment Depth Strictly
**Issue:** #15 - Depth silently capped instead of rejected
**Files:** New migration file

**Changes:**
```sql
-- In create_comment function:
IF v_parent_depth >= 3 THEN
  RAISE EXCEPTION 'Maximum reply depth exceeded. Cannot reply to this comment.';
END IF;
```

### 4.3 Allow System Post Deletion by Admins
**Issue:** #20 - System posts can't be deleted
**Files:** New migration file

**Changes:**
- Create `delete_system_post` function for service_role
- Or modify `delete_post` to check admin status:
```sql
IF NOT EXISTS (
  SELECT 1 FROM posts WHERE id = p_post_id
  AND (user_id = v_user_id OR (post_type = 'system' AND is_admin(v_user_id)))
) THEN
  RAISE EXCEPTION 'Not authorized';
END IF;
```

---

## Phase 5: Frontend Performance & Reliability

### 5.1 Fix Cache Invalidation for Following Feed
**Issue:** #7, #8 - Following feed not invalidated
**Files:** `mobile/hooks/usePosts.ts`, `mobile/hooks/usePostLikes.ts`

**Changes:**
```typescript
// Add to postKeys
followingFeed: (userId: string) => [...postKeys.all, 'following', userId] as const,

// In useCreatePost onSuccess:
queryClient.invalidateQueries({ queryKey: postKeys.feed() });
queryClient.invalidateQueries({ queryKey: postKeys.all }); // Invalidate all post queries

// In useTogglePostLike - add following feed to optimistic updates
```

### 5.2 Optimize Comment Tree Building
**Issue:** #6 - Unbounded recursion blocks JS thread
**Files:** `mobile/hooks/usePosts.ts`

**Changes:**
```typescript
// Use iterative approach with depth limit
export function buildCommentTree(comments: Comment[], maxDepth = 3): CommentWithReplies[] {
  // Process in batches to avoid blocking
  // Use Map for O(1) lookups
  // Limit tree depth client-side as backup
}

// For very large comment sets, consider:
// - Virtualized comment list
// - Load replies on demand (collapsed by default)
```

### 5.3 Add FlatList Optimizations
**Issue:** #12 - Missing getItemLayout causes scroll issues
**Files:** `mobile/components/posts/PostsFeed.tsx`

**Changes:**
```typescript
// Add estimated item height (won't be perfect due to variable content)
const ESTIMATED_ITEM_HEIGHT = 280;

<FlatList
  ...
  getItemLayout={(data, index) => ({
    length: ESTIMATED_ITEM_HEIGHT,
    offset: ESTIMATED_ITEM_HEIGHT * index,
    index,
  })}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  windowSize={5}
  initialNumToRender={5}
/>
```

### 5.4 Add Error Boundaries
**Issue:** #14 - Malformed data crashes entire feed
**Files:** New file `mobile/components/posts/PostErrorBoundary.tsx`

**Changes:**
```typescript
// Create ErrorBoundary component
class PostErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return <ErrorCard message="Failed to load post" />;
    }
    return this.props.children;
  }
}

// Wrap PostCard in PostsFeed:
<PostErrorBoundary key={item.id}>
  <PostCard post={item} />
</PostErrorBoundary>
```

### 5.5 Fix Animated Value Recycling
**Issue:** #13 - Animation stutter on FlatList recycling
**Files:** `mobile/components/posts/PostCard.tsx`

**Changes:**
```typescript
// Reset animation value when post changes
useEffect(() => {
  scaleAnim.setValue(1);
}, [post.id]);

// Or use Reanimated for better performance
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated';
```

---

## Phase 6: Future Enhancements (Lower Priority)

### 6.1 Add Soft Delete
**Issue:** #17 - Hard deletes prevent recovery
**Files:** New migration file

**Changes:**
- Add `deleted_at TIMESTAMPTZ` column to posts and comments
- Modify delete functions to set `deleted_at = now()` instead of DELETE
- Add `WHERE deleted_at IS NULL` to all queries
- Create admin function to permanently purge or restore

### 6.2 Add Reporting/Flagging System
**Issue:** #19 - No way to report content
**Files:** New migration file + frontend components

**Changes:**
- Create `post_reports` and `comment_reports` tables
- Create `report_post` and `report_comment` functions
- Add report button to PostCard and CommentItem
- Create admin dashboard for reviewing reports

---

## Implementation Order

```
Week 1: Phase 1 (Critical Security)
├── 1.1 SECURITY DEFINER fix
├── 1.2 Race condition fix
└── 1.3 Profile join consistency

Week 2: Phase 2 (Performance)
├── 2.1 Add missing indexes
├── 2.2 Eliminate N+1 queries
└── 2.3 Fix engagement scores

Week 3: Phase 3 (Security) + Phase 4 (API)
├── 3.1 Rate limiting
├── 3.2 Storage validation
├── 4.1 Comment pagination
├── 4.2 Depth enforcement
└── 4.3 System post deletion

Week 4: Phase 5 (Frontend)
├── 5.1 Cache invalidation
├── 5.2 Comment tree optimization
├── 5.3 FlatList optimizations
├── 5.4 Error boundaries
└── 5.5 Animation fixes

Future: Phase 6 (Enhancements)
├── 6.1 Soft delete
└── 6.2 Reporting system
```

---

## Migration File Naming

```
20260107000001_fix_security_definer_search_path.sql
20260107000002_fix_count_race_conditions.sql
20260107000003_fix_profile_join_consistency.sql
20260107000004_add_performance_indexes.sql
20260107000005_eliminate_n_plus_one_queries.sql
20260107000006_fix_engagement_score_staleness.sql
20260107000007_add_rate_limiting.sql
20260107000008_add_storage_validation.sql
20260107000009_add_comment_pagination.sql
20260107000010_enforce_comment_depth.sql
20260107000011_allow_admin_delete_system_posts.sql
```

---

## Testing Checklist

For each phase, verify:
- [ ] All existing tests pass
- [ ] New functionality works as expected
- [ ] Performance benchmarks meet targets
- [ ] No regressions in feed loading
- [ ] Likes/comments work correctly
- [ ] Following feed shows correct posts
- [ ] Error handling graceful
- [ ] Mobile app doesn't crash

---

## Rollback Plan

Each migration should be reversible. Include DOWN migrations:
```sql
-- Example for index addition
-- UP
CREATE INDEX idx_friendships_user_status ON ...;

-- DOWN
DROP INDEX IF EXISTS idx_friendships_user_status;
```

For function changes, keep old function signatures available during transition.
