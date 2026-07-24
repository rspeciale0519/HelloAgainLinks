// ============================================================
// HelloAgain — Core Type Definitions
// ============================================================

export interface Profile {
  id: string;
  x_user_id: string;
  x_handle: string;
  display_name: string;
  avatar_url: string | null;
  plan: Plan;
  created_at: string;
  updated_at: string;
}

export type Plan = 'free' | 'pro' | 'max' | 'lifetime';

export interface Bookmark {
  id: string;
  user_id: string;
  x_post_id: string;
  x_author_handle: string;
  x_author_name: string;
  content_text: string;
  media_urls: string[];
  post_created_at: string;
  bookmarked_at: string;
  created_at: string;
  tags?: Tag[];
  folders?: Folder[];
  x_author_avatar_url?: string;
  engagement?: {
    like_count?: number;
    retweet_count?: number;
    reply_count?: number;
    quote_count?: number;
    bookmark_count?: number;
    view_count?: number;
  };
  language?: string;
  conversation_id?: string;
  in_reply_to_status_id?: string;
  quoted_status_id?: string;
  possibly_sensitive?: boolean;
  ingested_via?: 'api' | 'graphql' | 'extension';
  updated_at?: string;
  primary_category?: string;
  primary_domain?: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
}

export interface BookmarkTag {
  bookmark_id: string;
  tag_id: string;
}

export interface BookmarkFolder {
  bookmark_id: string;
  folder_id: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  plan: Plan;
  status: SubscriptionStatus;
  current_period_end: string | null;
}

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';

// Blend types
export interface Blend {
  id: string;
  initiator_id: string;
  recipient_id: string;
  status: BlendStatus;
  score: number | null;
  shared_topics: string[];
  unique_initiator: string[];
  unique_recipient: string[];
  analysis: string | null;
  card_image_url: string | null;
  created_at: string;
  completed_at: string | null;
}

export type BlendStatus = 'pending' | 'accepted' | 'completed' | 'declined' | 'expired';

// API types
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface BookmarkSearchParams {
  q?: string;
  tags?: string[];
  folder_id?: string;
  author?: string;
  date_from?: string;
  date_to?: string;
  sort?: 'bookmarked_at' | 'post_created_at' | 'relevance';
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}
