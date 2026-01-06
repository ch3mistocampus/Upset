/**
 * Posts/Forum Feature Type Definitions
 */

// Post Types
export type PostType = 'user' | 'system';

export interface PostImage {
  id: string;
  image_url: string;
  display_order: number;
}

export interface Post {
  id: string;
  user_id: string | null;
  post_type: PostType;
  event_id: string | null;
  bout_id: string | null;
  title: string;
  body: string | null;
  like_count: number;
  comment_count: number;
  engagement_score: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  author_username: string | null;
  author_display_name: string | null;
  author_avatar_url: string | null;
  event_name: string | null;
  fighter_a_name: string | null;
  fighter_b_name: string | null;
  images: PostImage[];
  user_has_liked: boolean;
}

// Comment Types
export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  like_count: number;
  reply_count: number;
  depth: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  author_username: string;
  author_display_name: string | null;
  author_avatar_url: string | null;
  user_has_liked: boolean;
}

// Post with comments response
export interface PostWithComments {
  post: Post;
  comments: Comment[];
}

// Input types
export interface CreatePostInput {
  title: string;
  body?: string;
  imageUrls?: string[];
}

export interface CreateCommentInput {
  postId: string;
  body: string;
  parentId?: string;
}

// Like toggle response
export interface LikeToggleResult {
  liked: boolean;
  like_count: number;
}

// For displaying comments in a tree structure
export interface CommentWithReplies extends Comment {
  replies: CommentWithReplies[];
}
