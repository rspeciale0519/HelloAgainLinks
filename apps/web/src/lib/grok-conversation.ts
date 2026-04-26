// apps/web/src/lib/grok-conversation.ts
//
// Phase 4: shared helpers for the conversation surface. Builds the Grok
// system prompt with a citation contract ("[bm:<id>]" markers) and the
// recent-bookmark context block reused from /api/ai/assistant.

import type { SupabaseClient } from '@supabase/supabase-js';

const XAI_API_KEY = process.env.XAI_API_KEY ?? '';
const XAI_BASE_URL = 'https://api.x.ai/v1';
const MODEL_FULL = process.env.GROK_MODEL_FULL ?? 'grok-3';

export interface GrokMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface RecentBookmark {
  id: string;
  content_text: string;
  x_author_handle: string;
  x_author_name: string;
  bookmarked_at: string;
}

interface NamedRow {
  name: string;
}

const CITATION_MARKER_RE = /\[bm:([0-9a-f-]{6,})\]/gi;

/**
 * Build a compact bookmark context block to inject into the HAL system prompt.
 * Includes the user's tag list, folder list, total bookmarks, and the 30 most
 * recent bookmarks with their UUIDs (so the model can cite via [bm:<id>]).
 */
export async function buildBookmarkContext(
  client: SupabaseClient,
  userId: string,
): Promise<{
  contextText: string;
  recentIds: Set<string>;
}> {
  const [bookmarksRes, tagsRes, foldersRes, countRes] = await Promise.all([
    client
      .from('bookmarks')
      .select('id, content_text, x_author_handle, x_author_name, bookmarked_at')
      .eq('user_id', userId)
      .order('bookmarked_at', { ascending: false })
      .limit(30),
    client.from('tags').select('name').eq('user_id', userId),
    client.from('folders').select('name').eq('user_id', userId),
    client
      .from('bookmarks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  const recent = (bookmarksRes.data ?? []) as RecentBookmark[];
  const tags = (tagsRes.data ?? []) as NamedRow[];
  const folders = (foldersRes.data ?? []) as NamedRow[];
  const total = countRes.count ?? recent.length;

  const lines = [
    `Total bookmarks: ${total}`,
    `Tags: ${tags.map((t) => t.name).join(', ') || 'None'}`,
    `Folders: ${folders.map((f) => f.name).join(', ') || 'None'}`,
    '',
    'Recent bookmarks (cite by id with [bm:<id>] markers):',
    ...recent.map((b) => {
      const date = new Date(b.bookmarked_at).toISOString().slice(0, 10);
      const text = b.content_text.replace(/\s+/g, ' ').slice(0, 200);
      return `- [bm:${b.id}] @${b.x_author_handle} (${date}): ${text}`;
    }),
  ];

  return {
    contextText: lines.join('\n'),
    recentIds: new Set(recent.map((b) => b.id)),
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
    'Tools you can use in your output:',
    '- When you reference a specific bookmark, emit a citation marker inline:',
    '  [bm:<full-bookmark-uuid>]. Multiple markers per sentence are fine.',
    '  The UI extracts these markers, removes them from the rendered text,',
    '  and renders clickable citation chips beneath the message.',
    '- Only cite bookmark ids that appear in the "Recent bookmarks" list',
    '  below; if you have no concrete reference, just answer without citing.',
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
