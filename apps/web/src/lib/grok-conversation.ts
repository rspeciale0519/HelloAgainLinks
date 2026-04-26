// apps/web/src/lib/grok-conversation.ts
//
// Phase 4: shared helpers for the conversation surface. Builds the Grok
// system prompt with a citation contract ("[bm:<id>]" markers) and a
// query-aware bookmark context block. The model is given the top-ranked
// matches across the user's entire library (via the search_bookmarks RPC
// over the search_vector tsvector column) plus a small slice of recent
// bookmarks for "what did I save lately?" style questions.

import type { SupabaseClient } from '@supabase/supabase-js';
import { sanitizeFtsQuery } from '@/lib/postgrest-search';

const XAI_API_KEY = process.env.XAI_API_KEY ?? '';
const XAI_BASE_URL = 'https://api.x.ai/v1';
const MODEL_FULL = process.env.GROK_MODEL_FULL ?? 'grok-3';

export interface GrokMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface BookmarkRow {
  id: string;
  content_text: string;
  x_author_handle: string;
  x_author_name: string;
  bookmarked_at: string;
}

interface NamedRow {
  name: string;
}

interface RankedSearchRow {
  id: string;
  rank: number;
  total_count: number;
}

const CITATION_MARKER_RE = /\[bm:([0-9a-f-]{6,})\]/gi;

const SEARCH_MATCH_LIMIT = 40;
const RECENT_SLICE_LIMIT = 8;

// Conversational filler + pronouns + question words + HAL/X domain noise.
// We strip these before building the tsquery so the AI's question turns into
// a set of meaningful content tokens, not "see & post & provide & ...".
const QUERY_STOPWORDS = new Set([
  'a', 'about', 'all', 'an', 'and', 'any', 'anything', 'are', 'as', 'at',
  'be', 'been', 'by', 'can', 'could', 'did', 'do', 'does', 'for', 'from',
  'get', 'give', 'got', 'had', 'has', 'have', 'help', 'how', 'i', 'if',
  'in', 'is', 'it', 'its', 'just', 'know', 'like', 'list', 'look', 'me',
  'most', 'my', 'need', 'not', 'of', 'on', 'or', 'please', 'see', 'search',
  'should', 'show', 'so', 'some', 'something', 'tell', 'that', 'the',
  'their', 'them', 'they', 'this', 'to', 'us', 'want', 'was', 'we', 'were',
  'what', 'when', 'where', 'which', 'who', 'whom', 'why', 'will', 'with',
  'would', 'you', 'your',
  // HAL / X domain noise — almost every conversational query mentions these,
  // and matching against them is pure recall pollution.
  'bookmark', 'bookmarks', 'post', 'posts', 'tweet', 'tweets', 'thread',
  'threads', 'find', 'saved', 'save',
]);

/**
 * Turn the user's natural-language question into a tsquery that prioritizes
 * recall: strip stopwords + filler, then OR-join the remaining tokens.
 * websearch_to_tsquery understands `OR` as boolean OR, so a sentence like
 * "do you see any Claude Code tutorials?" becomes "claude OR code OR tutorials"
 * — any one matching token surfaces the bookmark, and ts_rank_cd handles the
 * ordering so the most relevant hits land at the top.
 *
 * Falls back to the sanitized original if every token is a stopword (e.g.
 * "what should I do?" — there's nothing to search for).
 */
function rewriteQueryForSearch(rawQuery: string): string {
  const sanitized = sanitizeFtsQuery(rawQuery);
  if (!sanitized) return '';

  const tokens = sanitized
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/^['"@#-]+|['"_-]+$/g, ''))
    .filter((t) => t.length > 1 && !QUERY_STOPWORDS.has(t));

  if (tokens.length === 0) return sanitized;

  const unique = Array.from(new Set(tokens));
  return unique.join(' OR ');
}

function formatBookmarkLine(b: BookmarkRow): string {
  const date = new Date(b.bookmarked_at).toISOString().slice(0, 10);
  const text = b.content_text.replace(/\s+/g, ' ').slice(0, 240);
  const handle = b.x_author_handle ? `@${b.x_author_handle}` : 'unknown';
  return `- [bm:${b.id}] ${handle} (${date}): ${text}`;
}

/**
 * Build a query-aware bookmark context block to inject into the HAL system
 * prompt. Includes the user's tag list, folder list, total bookmark count,
 * the top ranked matches for the current query (across ALL bookmarks via
 * the search_bookmarks tsvector RPC), and a small slice of recent bookmarks
 * for "what did I save lately?" style prompts. Citable ids are returned so
 * the caller can validate citation markers against the allow-list.
 *
 * `client` should be a service-role client because search_bookmarks is
 * SECURITY DEFINER and filters by p_user_id.
 */
export async function buildBookmarkContext(
  client: SupabaseClient,
  userId: string,
  query: string,
): Promise<{
  contextText: string;
  recentIds: Set<string>;
}> {
  const safeQuery = sanitizeFtsQuery(query);
  const searchQuery = rewriteQueryForSearch(query);

  const [searchRes, recentRes, tagsRes, foldersRes, countRes] = await Promise.all([
    searchQuery
      ? client.rpc('search_bookmarks', {
          p_user_id: userId,
          p_query: searchQuery,
          p_limit: SEARCH_MATCH_LIMIT,
          p_offset: 0,
          p_author: null,
          p_date_from: null,
          p_date_to: null,
        })
      : Promise.resolve({ data: [], error: null }),
    client
      .from('bookmarks')
      .select('id, content_text, x_author_handle, x_author_name, bookmarked_at')
      .eq('user_id', userId)
      .order('bookmarked_at', { ascending: false })
      .limit(RECENT_SLICE_LIMIT),
    client.from('tags').select('name').eq('user_id', userId),
    client.from('folders').select('name').eq('user_id', userId),
    client
      .from('bookmarks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  const ranked = (searchRes.data ?? []) as RankedSearchRow[];
  const recent = (recentRes.data ?? []) as BookmarkRow[];
  const tags = (tagsRes.data ?? []) as NamedRow[];
  const folders = (foldersRes.data ?? []) as NamedRow[];
  const total = countRes.count ?? recent.length;

  // Hydrate the ranked search hits in a single round-trip, then re-sort by
  // rank (the .in() select doesn't preserve RPC ordering).
  let matches: BookmarkRow[] = [];
  if (ranked.length > 0) {
    const rankMap = new Map(ranked.map((r) => [r.id, r.rank]));
    const { data: hydrated } = await client
      .from('bookmarks')
      .select('id, content_text, x_author_handle, x_author_name, bookmarked_at')
      .eq('user_id', userId)
      .in(
        'id',
        ranked.map((r) => r.id),
      );
    matches = ((hydrated ?? []) as BookmarkRow[])
      .slice()
      .sort((a, b) => (rankMap.get(b.id) ?? 0) - (rankMap.get(a.id) ?? 0));
  }

  // Recent slice — exclude anything already in the ranked matches to avoid
  // burning context on duplicates.
  const matchIds = new Set(matches.map((m) => m.id));
  const recentExtras = recent.filter((b) => !matchIds.has(b.id));

  const allowedIds = new Set<string>([...matchIds, ...recentExtras.map((b) => b.id)]);

  const lines: string[] = [
    `Total bookmarks: ${total}`,
    `Tags: ${tags.map((t) => t.name).join(', ') || 'None'}`,
    `Folders: ${folders.map((f) => f.name).join(', ') || 'None'}`,
    '',
  ];

  if (matches.length > 0) {
    lines.push(
      `Top matches for the user's question (ranked by relevance across all ${total} bookmarks; cite by id with [bm:<id>] markers):`,
      ...matches.map(formatBookmarkLine),
      '',
    );
  } else if (safeQuery) {
    lines.push(
      `No bookmarks matched the user's question via full-text search (across all ${total} bookmarks). Tell the user nothing matched if they asked about specific content.`,
      '',
    );
  }

  if (recentExtras.length > 0) {
    lines.push(
      'Recent bookmarks (most recently saved; cite by id with [bm:<id>] markers):',
      ...recentExtras.map(formatBookmarkLine),
    );
  }

  return {
    contextText: lines.join('\n'),
    recentIds: allowedIds,
  };
}

/**
 * The HAL system prompt. Defines persona, available context, and the citation
 * contract used for inline bookmark references.
 */
export function buildSystemPrompt(contextText: string): string {
  return [
    "You are HAL, the Hello Again Links assistant. The user is your archivist;",
    "you help them search, summarize, and find patterns across their saved",
    "X/Twitter bookmarks. Be concise, conversational, and specific.",
    '',
    'Behavior rules:',
    "- The bookmark context below was already retrieved by ranked full-text",
    "  search against the user's entire library. Trust it. The top matches",
    "  are sorted by relevance; if something is in the list, it's there",
    "  because it scored highly against their question.",
    "- Answer directly from the bookmarks shown. Quote, summarize, or cite",
    '  specific ones — that is the entire job.',
    "- Do NOT offer to help the user brainstorm search terms, refine their",
    "  query, suggest alternative wordings, or ask them to be more specific.",
    "  They asked you a question; answer it from what's in the context.",
    "- If the top matches genuinely don't cover the question, say so in one",
    "  sentence and point to the closest related bookmark you do have.",
    '  Never respond with "I cannot find anything, would you like to..." —',
    '  that pattern is forbidden.',
    '',
    'Citation format:',
    '- When you reference a specific bookmark, emit a citation marker inline:',
    '  [bm:<full-bookmark-uuid>]. Multiple markers per sentence are fine.',
    '  The UI extracts these markers, removes them from the rendered text,',
    '  and renders clickable citation chips beneath the message.',
    '- Only cite bookmark ids that appear in the bookmark context below; if',
    '  you have no concrete reference, just answer without citing.',
    '',
    'Bookmark context:',
    contextText,
  ].join('\n');
}

/**
 * Extract [bm:<id>] markers from a string, returning the cleaned text and a
 * de-duplicated, validated array of bookmark ids. Validation filters ids
 * against the provided allow-list (typically the recentIds the model was
 * given) so we never persist hallucinated uuids.
 */
export function extractCitations(
  rawText: string,
  allowList: Set<string>,
): { cleanedText: string; citedIds: string[] } {
  const seen = new Set<string>();
  const cited: string[] = [];

  for (const match of rawText.matchAll(CITATION_MARKER_RE)) {
    const id = match[1].toLowerCase();
    if (allowList.has(id) && !seen.has(id)) {
      seen.add(id);
      cited.push(id);
    }
  }

  const cleanedText = rawText
    .replace(CITATION_MARKER_RE, '')
    // Tidy up double spaces / orphan punctuation introduced by stripping markers.
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();

  return { cleanedText, citedIds: cited };
}

/**
 * Open a streaming chat completion against xAI's API. Returns the raw fetch
 * response — the caller is responsible for reading the SSE body. Throws on
 * HTTP error.
 */
export async function streamGrokChat(messages: GrokMessage[]): Promise<Response> {
  if (!XAI_API_KEY) {
    throw new Error('XAI_API_KEY is not configured');
  }
  const res = await fetch(`${XAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL_FULL,
      messages,
      temperature: 0.4,
      max_tokens: 1024,
      stream: true,
    }),
  });
  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Grok stream error ${res.status}: ${errText}`);
  }
  return res;
}

/**
 * Async iterator over the text deltas in a Grok SSE stream. Yields the
 * `choices[0].delta.content` strings as they arrive, ignores keep-alive
 * lines, and stops when the upstream sends `[DONE]`.
 */
export async function* iterateGrokStream(
  response: Response,
): AsyncGenerator<string, void, unknown> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE: events separated by blank lines; each event has 1+ "data: " lines.
    let sepIdx;
    while ((sepIdx = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, sepIdx);
      buffer = buffer.slice(sepIdx + 2);

      const dataLines = rawEvent
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim());

      for (const data of dataLines) {
        if (!data || data === '[DONE]') {
          if (data === '[DONE]') return;
          continue;
        }
        try {
          const parsed = JSON.parse(data) as {
            choices?: { delta?: { content?: string } }[];
          };
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          // Ignore malformed chunks — Grok occasionally inserts comments.
        }
      }
    }
  }
}
