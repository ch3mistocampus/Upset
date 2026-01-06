-- Phase 2.1: Add missing indexes for performance optimization

-- Index for following feed efficiency
-- The following feed queries friendships for accepted friends
CREATE INDEX IF NOT EXISTS idx_friendships_user_status
  ON public.friendships(user_id, status);

-- Partial index for accepted friendships only (most common query)
CREATE INDEX IF NOT EXISTS idx_friendships_accepted
  ON public.friendships(user_id, friend_id)
  WHERE status = 'accepted';

-- Index for checking if user has liked a post (used in every feed query)
CREATE INDEX IF NOT EXISTS idx_post_likes_user_post
  ON public.post_likes(user_id, post_id);

-- Index for checking if user has liked a comment
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_comment
  ON public.comment_likes(user_id, comment_id);

-- Index for comments ordered by created_at ASC (for chronological display)
-- The existing index is DESC, but queries use ASC
CREATE INDEX IF NOT EXISTS idx_post_comments_post_created_asc
  ON public.post_comments(post_id, created_at ASC);

-- Index for fetching comments with their depth (for tree building)
CREATE INDEX IF NOT EXISTS idx_post_comments_post_depth
  ON public.post_comments(post_id, depth, created_at ASC);

-- Composite index for posts feed query optimization
-- Covers: is_public, engagement_score DESC, created_at DESC
CREATE INDEX IF NOT EXISTS idx_posts_feed_ranking
  ON public.posts(is_public, engagement_score DESC, created_at DESC)
  WHERE is_public = true;

-- Index for following feed: posts by user with created_at
CREATE INDEX IF NOT EXISTS idx_posts_user_created
  ON public.posts(user_id, created_at DESC)
  WHERE is_public = true;

-- Index for system posts (used in following feed to include all system posts)
CREATE INDEX IF NOT EXISTS idx_posts_system_created
  ON public.posts(created_at DESC)
  WHERE post_type = 'system' AND is_public = true;

-- Index for post images by post_id with display_order
CREATE INDEX IF NOT EXISTS idx_post_images_post_order
  ON public.post_images(post_id, display_order);

-- Analyze tables to update statistics for query planner
ANALYZE public.posts;
ANALYZE public.post_comments;
ANALYZE public.post_likes;
ANALYZE public.comment_likes;
ANALYZE public.post_images;
ANALYZE public.friendships;
