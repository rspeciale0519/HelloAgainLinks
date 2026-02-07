// ============================================================
// Blend Analysis Engine — Hello Again Links (HAL)
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';

const XAI_API_KEY = process.env.XAI_API_KEY!;
const MODEL = process.env.GROK_MODEL_FULL || 'grok-3';

async function grokChat(messages: { role: string; content: string }[]): Promise<string> {
  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.4, max_tokens: 2048 }),
  });
  if (!res.ok) throw new Error(`Grok error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

interface BlendAnalysis {
  score: number;
  tier: string;
  commonGround: string[];
  uniqueA: string[];
  uniqueB: string[];
  hiddenConnections: string[];
  summary: string;
  signatureA: string;
  signatureB: string;
}

export async function generateBlendAnalysis(
  blendId: string,
  userAId: string,
  userBId: string,
  supabase: SupabaseClient
): Promise<BlendAnalysis> {
  // Fetch bookmarks for both users
  const [{ data: bookmarksA }, { data: bookmarksB }] = await Promise.all([
    supabase
      .from('bookmarks')
      .select('content_text, x_author_handle')
      .eq('user_id', userAId)
      .order('bookmarked_at', { ascending: false })
      .limit(50),
    supabase
      .from('bookmarks')
      .select('content_text, x_author_handle')
      .eq('user_id', userBId)
      .order('bookmarked_at', { ascending: false })
      .limit(50),
  ]);

  // Fetch tags for both users
  const [{ data: tagsA }, { data: tagsB }] = await Promise.all([
    supabase.from('tags').select('name').eq('user_id', userAId),
    supabase.from('tags').select('name').eq('user_id', userBId),
  ]);

  // Get profiles
  const [{ data: profileA }, { data: profileB }] = await Promise.all([
    supabase.from('profiles').select('display_name, x_handle').eq('id', userAId).single(),
    supabase.from('profiles').select('display_name, x_handle').eq('id', userBId).single(),
  ]);

  const nameA = profileA?.display_name || profileA?.x_handle || 'User A';
  const nameB = profileB?.display_name || profileB?.x_handle || 'User B';

  const contextA = [
    `Tags: ${(tagsA || []).map((t: { name: string }) => t.name).join(', ')}`,
    'Recent bookmarks:',
    ...(bookmarksA || []).slice(0, 25).map(
      (b: { x_author_handle: string; content_text: string }) =>
        `@${b.x_author_handle}: ${b.content_text.slice(0, 150)}`
    ),
  ].join('\n');

  const contextB = [
    `Tags: ${(tagsB || []).map((t: { name: string }) => t.name).join(', ')}`,
    'Recent bookmarks:',
    ...(bookmarksB || []).slice(0, 25).map(
      (b: { x_author_handle: string; content_text: string }) =>
        `@${b.x_author_handle}: ${b.content_text.slice(0, 150)}`
    ),
  ].join('\n');

  const result = await grokChat([
    {
      role: 'system',
      content: `You are analyzing bookmark compatibility between two X/Twitter users for "Bookmark Blend". Analyze their saved content and return a detailed JSON analysis.

Return ONLY valid JSON with this structure:
{
  "score": <0-100 compatibility score>,
  "tier": "<one of: Expanding Each Other's Horizons (0-25), Interesting Crossovers (26-50), Bookmark Buddies (51-75), Intellectual Twins (76-100)>",
  "commonGround": ["<3-5 shared topics/themes>"],
  "uniqueA": ["<2-3 topics unique to ${nameA}>"],
  "uniqueB": ["<2-3 topics unique to ${nameB}>"],
  "hiddenConnections": ["<1-3 surprising non-obvious overlaps>"],
  "summary": "<2-3 sentence natural language summary of the blend>",
  "signatureA": "<one phrase describing ${nameA}'s signature interest>",
  "signatureB": "<one phrase describing ${nameB}'s signature interest>"
}`,
    },
    {
      role: 'user',
      content: `=== ${nameA}'s Bookmarks ===\n${contextA}\n\n=== ${nameB}'s Bookmarks ===\n${contextB}`,
    },
  ]);

  let analysis: BlendAnalysis;
  try {
    analysis = JSON.parse(result.trim());
  } catch {
    analysis = {
      score: 50,
      tier: 'Interesting Crossovers',
      commonGround: ['Content curation'],
      uniqueA: ['Various topics'],
      uniqueB: ['Various topics'],
      hiddenConnections: ['Both are curious minds'],
      summary: 'An interesting blend of perspectives.',
      signatureA: 'Eclectic reader',
      signatureB: 'Eclectic reader',
    };
  }

  // Determine tier from score
  if (analysis.score <= 25) analysis.tier = 'Expanding Each Other\'s Horizons';
  else if (analysis.score <= 50) analysis.tier = 'Interesting Crossovers';
  else if (analysis.score <= 75) analysis.tier = 'Bookmark Buddies';
  else analysis.tier = 'Intellectual Twins';

  // Update blend in database
  await supabase
    .from('blends')
    .update({
      status: 'active',
      blend_score: analysis.score,
      analysis_json: analysis,
    })
    .eq('id', blendId);

  return analysis;
}
