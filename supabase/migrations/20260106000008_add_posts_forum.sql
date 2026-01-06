-- Posts/Forum Feature: Tables, Indexes, Triggers, and RLS Policies

-- 1. Posts table
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  post_type TEXT NOT NULL DEFAULT 'user' CHECK (post_type IN ('user', 'system')),
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  bout_id UUID REFERENCES public.bouts(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 200),
  body TEXT CHECK (body IS NULL OR char_length(body) <= 5000),
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  engagement_score NUMERIC NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.posts IS 'Forum posts - both user-created and system-generated fight discussions';
COMMENT ON COLUMN public.posts.user_id IS 'NULL for system posts';
COMMENT ON COLUMN public.posts.post_type IS 'user = user-created, system = auto-generated fight discussion';
COMMENT ON COLUMN public.posts.engagement_score IS 'Calculated score for feed ranking';

-- 2. Post images table
CREATE TABLE public.post_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.post_images IS 'Images attached to posts';

-- 3. Post comments table (with threading support)
CREATE TABLE public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) >= 1 AND char_length(body) <= 2000),
  like_count INTEGER NOT NULL DEFAULT 0,
  reply_count INTEGER NOT NULL DEFAULT 0,
  depth INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.post_comments IS 'Comments on posts with threading support';
COMMENT ON COLUMN public.post_comments.parent_id IS 'NULL for top-level comments, references parent for replies';
COMMENT ON COLUMN public.post_comments.depth IS 'Nesting level (0 = top-level, max 3)';

-- 4. Post likes table
CREATE TABLE public.post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

COMMENT ON TABLE public.post_likes IS 'Likes on posts';

-- 5. Comment likes table
CREATE TABLE public.comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

COMMENT ON TABLE public.comment_likes IS 'Likes on comments';

-- Indexes for performance
CREATE INDEX idx_posts_user_id ON public.posts(user_id);
CREATE INDEX idx_posts_event_id ON public.posts(event_id);
CREATE INDEX idx_posts_bout_id ON public.posts(bout_id);
CREATE INDEX idx_posts_post_type ON public.posts(post_type);
CREATE INDEX idx_posts_engagement_score ON public.posts(engagement_score DESC);
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX idx_posts_public_feed ON public.posts(is_public, engagement_score DESC, created_at DESC) WHERE is_public = true;

CREATE INDEX idx_post_images_post_id ON public.post_images(post_id);

CREATE INDEX idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX idx_post_comments_user_id ON public.post_comments(user_id);
CREATE INDEX idx_post_comments_parent_id ON public.post_comments(parent_id);
CREATE INDEX idx_post_comments_created_at ON public.post_comments(created_at DESC);

CREATE INDEX idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX idx_post_likes_user_id ON public.post_likes(user_id);

CREATE INDEX idx_comment_likes_comment_id ON public.comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user_id ON public.comment_likes(user_id);

-- Trigger functions for updated_at
CREATE OR REPLACE FUNCTION update_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_post_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER posts_updated_at_trigger
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION update_posts_updated_at();

CREATE TRIGGER post_comments_updated_at_trigger
  BEFORE UPDATE ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_post_comments_updated_at();

-- Function to update post like_count
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET like_count = like_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_update_post_like_count
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_like_count();

-- Function to update comment like_count
CREATE OR REPLACE FUNCTION update_comment_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.post_comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.post_comments SET like_count = like_count - 1 WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_update_comment_like_count
  AFTER INSERT OR DELETE ON public.comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_like_count();

-- Function to update post comment_count and parent reply_count
CREATE OR REPLACE FUNCTION update_post_comment_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update post comment count
    UPDATE public.posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    -- Update parent reply count if this is a reply
    IF NEW.parent_id IS NOT NULL THEN
      UPDATE public.post_comments SET reply_count = reply_count + 1 WHERE id = NEW.parent_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Update post comment count
    UPDATE public.posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
    -- Update parent reply count if this was a reply
    IF OLD.parent_id IS NOT NULL THEN
      UPDATE public.post_comments SET reply_count = reply_count - 1 WHERE id = OLD.parent_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_update_post_comment_counts
  AFTER INSERT OR DELETE ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_post_comment_counts();

-- Function to recalculate engagement score
-- Score = (likes * 2 + comments * 3) * time_decay
-- time_decay = 1 / (1 + hours_since_creation / 24)
CREATE OR REPLACE FUNCTION recalculate_post_engagement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_post_id UUID;
  v_hours_old NUMERIC;
  v_time_decay NUMERIC;
  v_score NUMERIC;
BEGIN
  -- Get the post_id based on which table triggered this
  IF TG_TABLE_NAME = 'post_likes' THEN
    v_post_id := COALESCE(NEW.post_id, OLD.post_id);
  ELSIF TG_TABLE_NAME = 'post_comments' THEN
    v_post_id := COALESCE(NEW.post_id, OLD.post_id);
  ELSE
    RETURN NULL;
  END IF;

  -- Calculate engagement score
  SELECT
    EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600.0,
    (p.like_count * 2 + p.comment_count * 3)::NUMERIC
  INTO v_hours_old, v_score
  FROM public.posts p
  WHERE p.id = v_post_id;

  v_time_decay := 1.0 / (1.0 + v_hours_old / 24.0);
  v_score := v_score * v_time_decay;

  UPDATE public.posts SET engagement_score = v_score WHERE id = v_post_id;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_recalc_engagement_on_like
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_post_engagement();

CREATE TRIGGER trigger_recalc_engagement_on_comment
  AFTER INSERT OR DELETE ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_post_engagement();

-- RLS Policies

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- Posts policies
CREATE POLICY "Public posts are viewable by everyone"
  ON public.posts FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view their own posts"
  ON public.posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own posts"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = user_id AND post_type = 'user');

CREATE POLICY "Users can update their own posts"
  ON public.posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON public.posts FOR DELETE
  USING (auth.uid() = user_id);

-- Post images policies
CREATE POLICY "Post images are viewable if post is viewable"
  ON public.post_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id AND (p.is_public = true OR p.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can add images to their own posts"
  ON public.post_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete images from their own posts"
  ON public.post_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id AND p.user_id = auth.uid()
    )
  );

-- Post comments policies
CREATE POLICY "Comments are viewable if post is viewable"
  ON public.post_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id AND (p.is_public = true OR p.user_id = auth.uid())
    )
  );

CREATE POLICY "Authenticated users can comment on public posts"
  ON public.post_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id AND p.is_public = true
    )
  );

CREATE POLICY "Users can update their own comments"
  ON public.post_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.post_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Post likes policies
CREATE POLICY "Post likes are viewable by everyone"
  ON public.post_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can like public posts"
  ON public.post_likes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_id AND p.is_public = true
    )
  );

CREATE POLICY "Users can unlike posts"
  ON public.post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Comment likes policies
CREATE POLICY "Comment likes are viewable by everyone"
  ON public.comment_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can like comments"
  ON public.comment_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike comments"
  ON public.comment_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Create storage bucket for post images
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for post images
CREATE POLICY "Post images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images');

CREATE POLICY "Authenticated users can upload post images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'post-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own post images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);
