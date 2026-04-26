// packages/ui/hal/src/signal/Citations.tsx
//
// Citation surface for HAL chat. The shape evolved from a card list to a
// minimal "View this post on X →" link rendered beneath each cited claim,
// stacked one-per-bookmark when a single line cites multiple posts. Msg
// owns the rendering — this file contributes the shared type that the
// streaming + history hydration paths converge on.

export interface CitationBookmark {
  id: string;
  x_post_id: string;
  x_author_handle: string;
  /** Truncated tweet body — kept on the type for parity with hydration
   *  payloads even though the current renderer doesn't use it. */
  content_text?: string;
  /** ISO timestamp when the user bookmarked the post. Hydration paths
   *  populate it; older surfaces leave it undefined. */
  bookmarked_at?: string;
}

export function buildPostUrl(b: CitationBookmark): string {
  const handle = b.x_author_handle || 'i';
  return `https://x.com/${handle}/status/${b.x_post_id}`;
}
