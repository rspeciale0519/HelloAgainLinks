// packages/ui/hal/src/signal/sse-consumer.ts
//
// Tiny SSE reader used by AskTab and the standalone /assistant page (the
// page has its own copy because it can't depend on a 'use client'-only
// helper across the bundle boundary). Reads `data: { ... }` events and
// stops on `data: [DONE]`.

import type { CitationBookmark } from './CitationChip';

export interface SseChunkEvent {
  type: 'chunk';
  text: string;
}
export interface SseDoneEvent {
  type: 'done';
  message_id: string;
  cited_bookmark_ids: string[];
  /** Hydrated bookmark rows for the cited ids — populated server-side so the
   *  chat surface can render chips even when those bookmarks aren't on the
   *  user's current feed page. */
  cited_bookmarks?: CitationBookmark[];
  content: string;
}
export interface SseErrorEvent {
  type: 'error';
  error: string;
}
export type SseEvent = SseChunkEvent | SseDoneEvent | SseErrorEvent;

export async function consumeSseStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (e: SseEvent) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sepIdx;
    while ((sepIdx = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, sepIdx);
      buffer = buffer.slice(sepIdx + 2);
      const dataLines = rawEvent
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trim());
      for (const data of dataLines) {
        if (!data || data === '[DONE]') continue;
        try {
          onEvent(JSON.parse(data) as SseEvent);
        } catch {
          // Ignore malformed events.
        }
      }
    }
  }
}
