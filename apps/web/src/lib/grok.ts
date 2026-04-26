// ============================================================
// Grok API Client — Server-side (Hello Again Links)
// ============================================================

import { z } from 'zod';
import { classifyByRegex } from '@helloagain/shared';

const XAI_API_KEY = process.env.XAI_API_KEY!;
const BASE_URL = 'https://api.x.ai/v1';
const MODEL_FAST = process.env.GROK_MODEL_FAST || 'grok-3-mini';
const MODEL_FULL = process.env.GROK_MODEL_FULL || 'grok-3';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  choices: { message: { content: string }; finish_reason: string }[];
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

async function chat(messages: Message[], model: string = MODEL_FAST): Promise<string> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Grok API error ${res.status}: ${err}`);
  }

  const data: ChatResponse = await res.json();
  return data.choices[0].message.content;
}

// ── Auto-tagging ──────────────────────────────────────────

const TAG_TAXONOMY = [
  'AI/ML', 'Web Dev', 'Mobile Dev', 'DevOps', 'Cybersecurity',
  'Startups', 'Fundraising', 'SaaS', 'Marketing', 'Growth',
  'Crypto', 'DeFi', 'NFTs', 'Blockchain',
  'Design', 'UX/UI', 'Product', 'Leadership', 'Management',
  'Finance', 'Investing', 'Real Estate', 'Economics',
  'Science', 'Space', 'Climate', 'Health', 'Biotech',
  'Politics', 'Policy', 'Law', 'Education',
  'Writing', 'Journalism', 'Media', 'Entertainment',
  'Sports', 'Gaming', 'Music', 'Art', 'Photography',
  'Productivity', 'Career', 'Remote Work', 'Freelancing',
  'Open Source', 'Data Science', 'Cloud', 'APIs',
  'Humor', 'Motivation', 'Philosophy', 'Psychology',
];

export async function autoTagBookmark(content: string, customTags: string[] = []): Promise<string[]> {
  const allTags = [...new Set([...TAG_TAXONOMY, ...customTags])];
  const safeContent = sanitizeForLLM(content);

  const result = await chat([
    {
      role: 'system',
      content: `You categorize tweets/posts into topic tags. Choose 1-5 tags from this list that best match the content:\n\n${allTags.join(', ')}\n\nIf none fit well, you may suggest ONE new tag. Return ONLY a JSON array of strings. No explanation.`,
    },
    { role: 'user', content: safeContent },
  ]);

  try {
    const tags = JSON.parse(result.trim());
    return Array.isArray(tags) ? tags.slice(0, 5) : [];
  } catch {
    return [];
  }
}

// ── Two-tier classification ──────────────────────────────

/** Strip prompt injection patterns and cap length before sending to LLM. */
function sanitizeForLLM(text: string): string {
  return text
    .replace(/ignore\s+(previous|above|all)\s+instructions?/gi, '[filtered]')
    .replace(/you\s+are\s+now\s+/gi, '[filtered]')
    .replace(/system\s*:\s*/gi, '[filtered]')
    .slice(0, 500);
}

// LLM enrichment — single structured call returning ai_summary + ai_tags
// (confidence-scored labels). The Spread modal's HAL Analysis tab + the
// feed Card's HAL annotation strip both feed off this output.
const EnrichmentSchema = z.object({
  ai_summary: z.string().min(1).max(500),
  ai_tags: z
    .array(
      z.object({
        label: z.string().min(1).max(40),
        confidence: z.number().min(0).max(1),
      }),
    )
    .max(8),
});
export type BookmarkEnrichment = z.infer<typeof EnrichmentSchema>;

/** Strip a leading ```json ... ``` fence the model occasionally wraps around its output. */
function stripJsonFence(s: string): string {
  const trimmed = s.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

export async function enrichBookmarkLLM(
  content: string,
  customTags: string[] = [],
): Promise<BookmarkEnrichment | null> {
  const safeContent = sanitizeForLLM(content);
  const allTags = [...new Set([...TAG_TAXONOMY, ...customTags])];

  // Use MODEL_FULL — grok-3-mini is fast but unreliable at structured JSON
  // output. Enrichment runs in batches, so the latency is hidden.
  let result: string;
  try {
    result = await chat(
      [
        {
          role: 'system',
          content:
            'You analyze X/Twitter posts saved by an archivist. Output ONLY valid JSON ' +
            'matching this schema (no prose, no fences):\n' +
            '{\n' +
            '  "ai_summary": "<one short sentence (<= 200 chars) capturing the core claim or content; direct, no fluff>",\n' +
            '  "ai_tags": [ { "label": "<topic>", "confidence": <0.0-1.0> }, ... ]\n' +
            '}\n\n' +
            'Rules for ai_tags:\n' +
            '- Choose 1-5 labels, sorted by descending confidence.\n' +
            `- Prefer labels from this taxonomy: ${allTags.join(', ')}.\n` +
            '- You may add ONE custom label if none of the taxonomy fits well.\n' +
            '- Confidence is your honest probability the label applies (0.0 to 1.0).',
        },
        { role: 'user', content: safeContent },
      ],
      MODEL_FULL,
    );
  } catch (err) {
    console.error('[enrichBookmarkLLM] chat() threw:', err instanceof Error ? err.message : err);
    return null;
  }

  const cleaned = stripJsonFence(result);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error(
      '[enrichBookmarkLLM] JSON.parse failed:',
      err instanceof Error ? err.message : err,
      '\n  raw output (first 400 chars):',
      cleaned.slice(0, 400),
    );
    return null;
  }
  const validated = EnrichmentSchema.safeParse(parsed);
  if (!validated.success) {
    console.error(
      '[enrichBookmarkLLM] schema validation failed:',
      validated.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      '\n  raw payload:',
      JSON.stringify(parsed).slice(0, 400),
    );
    return null;
  }
  return validated.data;
}

/**
 * Two-tier classification with full enrichment for the Phase 5 surfaces.
 * Tier 1 (regex): primary_category + primary_domain. Tier 2 (LLM): one
 * structured call returns ai_summary + ai_tags (confidence-scored labels).
 *
 * `tags` (the user-facing tag chips) is derived from ai_tags where
 * confidence >= AI_TAG_CHIP_THRESHOLD — the route then upserts a row in the
 * `tags` table for each and links via bookmark_tags.
 */
const AI_TAG_CHIP_THRESHOLD = 0.6;

export interface ClassificationResult {
  category: string | null;
  domain: string | null;
  ai_summary: string | null;
  ai_tags: BookmarkEnrichment['ai_tags'] | null;
  tags: string[];
}

export async function classifyBookmark(
  content: string,
  urls: string[] = [],
  customTags: string[] = [],
): Promise<ClassificationResult> {
  // Tier 1 — regex fast-path.
  const regex = classifyByRegex(content, urls);

  // Tier 2 — LLM enrichment (single structured call).
  const enrichment = await enrichBookmarkLLM(content, customTags);

  if (!enrichment) {
    // LLM tier failed (parse error, validation, or upstream). Fall back to
    // the regex-only signal so the route still records something useful.
    return {
      category: regex.category,
      domain: regex.domain,
      ai_summary: null,
      ai_tags: null,
      tags: [],
    };
  }

  const highConfidenceTags = enrichment.ai_tags
    .filter((t) => t.confidence >= AI_TAG_CHIP_THRESHOLD)
    .map((t) => t.label)
    .slice(0, 5);

  return {
    category: regex.category,
    domain: regex.domain,
    ai_summary: enrichment.ai_summary,
    ai_tags: enrichment.ai_tags,
    tags: highConfidenceTags,
  };
}

// ── Batch auto-tagging ────────────────────────────────────

export async function autoTagBatch(
  bookmarks: { id: string; content: string }[],
  customTags: string[] = []
): Promise<Map<string, string[]>> {
  const results = new Map<string, string[]>();

  // Process in parallel batches of 5 to stay within rate limits
  const batchSize = 5;
  for (let i = 0; i < bookmarks.length; i += batchSize) {
    const batch = bookmarks.slice(i, i + batchSize);
    const promises = batch.map(async (bm) => {
      const tags = await autoTagBookmark(bm.content, customTags);
      results.set(bm.id, tags);
    });
    await Promise.all(promises);
  }

  return results;
}

// ── Smart search (NL → structured query) ──────────────────

export interface ParsedSearchIntent {
  keywords: string[];
  author?: string;
  dateHint?: string;
  topics?: string[];
}

export async function parseSearchIntent(query: string): Promise<ParsedSearchIntent> {
  const result = await chat([
    {
      role: 'system',
      content: `You extract search intent from natural language bookmark queries. Return JSON with:
- keywords: array of key search terms
- author: X handle if mentioned (without @)
- dateHint: relative date like "last week", "december", "2 days ago" if mentioned
- topics: topic categories if identifiable

Return ONLY valid JSON. No explanation.`,
    },
    { role: 'user', content: query },
  ]);

  try {
    return JSON.parse(result.trim());
  } catch {
    return { keywords: query.split(' ').filter(w => w.length > 2) };
  }
}

// ── Bookmark summary ──────────────────────────────────────

export async function summarizeBookmark(content: string): Promise<string> {
  const result = await chat([
    {
      role: 'system',
      content: 'Summarize this tweet/thread in 1-2 concise sentences. Be direct and informative.',
    },
    { role: 'user', content },
  ]);
  return result.trim();
}

export async function summarizeCollection(
  bookmarks: { content: string; author: string }[]
): Promise<string> {
  const contents = bookmarks
    .slice(0, 20) // limit to avoid token overflow
    .map((b, i) => `${i + 1}. @${b.author}: ${b.content.slice(0, 200)}`)
    .join('\n');

  const result = await chat(
    [
      {
        role: 'system',
        content: 'Summarize this collection of saved tweets in 3-5 sentences. Identify the main themes and notable insights.',
      },
      { role: 'user', content: contents },
    ],
    MODEL_FULL
  );
  return result.trim();
}

// ── Related content via x_search ──────────────────────────

export async function findRelatedPosts(content: string): Promise<string> {
  // Use Grok with x_search tool to find related posts
  const result = await chat(
    [
      {
        role: 'system',
        content: 'Based on this bookmarked post, suggest 3-5 related topics the user might want to explore. Return as a JSON array of search query strings.',
      },
      { role: 'user', content },
    ]
  );
  return result.trim();
}

// ── AI Assistant chat ─────────────────────────────────────

export async function assistantChat(
  userMessage: string,
  bookmarkContext: string,
  chatHistory: Message[] = []
): Promise<string> {
  const messages: Message[] = [
    {
      role: 'system',
      content: `You are HAL, the AI assistant for Hello Again Links — an X/Twitter bookmark manager. You help users find, organize, and discover insights from their saved bookmarks.

You have access to the user's bookmark data:
${bookmarkContext}

Capabilities:
- Search and find specific bookmarks
- Suggest tags and organization
- Summarize collections of bookmarks
- Discover patterns in saved content
- Recommend related topics to explore

Be concise, helpful, and conversational. Use the bookmark data to give specific, relevant answers.`,
    },
    ...chatHistory,
    { role: 'user', content: userMessage },
  ];

  const result = await chat(messages, MODEL_FULL);
  return result.trim();
}

// ── Duplicate detection ───────────────────────────────────

export async function checkDuplicate(
  newContent: string,
  existingBookmarks: { id: string; content: string }[]
): Promise<{ isDuplicate: boolean; matchId?: string; similarity?: string }> {
  if (existingBookmarks.length === 0) {
    return { isDuplicate: false };
  }

  const existing = existingBookmarks
    .slice(0, 10)
    .map((b, i) => `[${i}|${b.id}] ${b.content.slice(0, 200)}`)
    .join('\n');

  const result = await chat([
    {
      role: 'system',
      content: `Compare the new post with existing bookmarks. If any is essentially the same content (repost, quote tweet of same, near-identical), return JSON: {"isDuplicate": true, "matchId": "<id>", "similarity": "high|medium"}. If no match, return {"isDuplicate": false}. Return ONLY JSON.`,
    },
    { role: 'user', content: `NEW POST:\n${newContent}\n\nEXISTING:\n${existing}` },
  ]);

  try {
    return JSON.parse(result.trim());
  } catch {
    return { isDuplicate: false };
  }
}
