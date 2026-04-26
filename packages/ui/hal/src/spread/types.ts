// packages/ui/hal/src/spread/types.ts
//
// Shared types for the Spread modal and its tabs. The Bookmark prop is the
// full row a tab might need — Content tab cares about author/text/media,
// Analysis cares about ai_summary/ai_tags, Notes cares about user_notes.

export interface SpreadAiTag {
  label: string;
  confidence: number;
}

export interface SpreadBookmark {
  id: string;
  x_post_id: string;
  x_author_handle: string;
  x_author_name: string;
  content_text: string;
  media_urls: string[] | null;
  bookmarked_at: string;
  post_created_at?: string | null;
  ai_summary?: string | null;
  ai_tags?: SpreadAiTag[] | null;
  user_notes?: string | null;
}

export type SpreadTab = 'content' | 'analysis' | 'notes' | 'thread';

export function buildPostUrl(b: SpreadBookmark): string {
  const handle = b.x_author_handle || 'i';
  return `https://x.com/${handle}/status/${b.x_post_id}`;
}
