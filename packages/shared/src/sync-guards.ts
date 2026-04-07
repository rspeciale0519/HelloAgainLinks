export interface SyncGuardConfig {
  /** Stop after this many consecutive pages with 0 new inserts. Default: 3 */
  maxStalePages?: number;
  /** Stop after this many total new bookmarks imported. Default: Infinity */
  targetAdds?: number;
  /** Stop after this many milliseconds. Default: 120_000 (2 min) */
  maxDurationMs?: number;
}

export interface SyncGuardState {
  stalePageCount: number;
  totalAdded: number;
  startedAt: number;
  stopReason: string | null;
}

/**
 * Factory for multi-stop-condition sync guards.
 * Handles 4 guards: end_of_data, stale_pages, target_reached, time_limit.
 * The 5th guard (caught-up via newestKnownPostId) requires DB access
 * and is implemented in each route's loop body.
 *
 * Inspired by fieldtheory-cli's 5-guard sync model.
 */
export function createSyncGuards(config: SyncGuardConfig = {}): {
  state: SyncGuardState;
  /** Call after each page. Returns stop reason or null to continue. */
  check: (pageNewCount: number, hasNextCursor: boolean) => string | null;
} {
  const maxStale = config.maxStalePages ?? 3;
  const targetAdds = config.targetAdds ?? Infinity;
  const maxDuration = config.maxDurationMs ?? 120_000;

  const state: SyncGuardState = {
    stalePageCount: 0,
    totalAdded: 0,
    startedAt: Date.now(),
    stopReason: null,
  };

  function check(pageNewCount: number, hasNextCursor: boolean): string | null {
    state.totalAdded += pageNewCount;

    // Guard 1: End of data
    if (!hasNextCursor) {
      state.stopReason = 'end_of_data';
      return state.stopReason;
    }

    // Guard 2: Stale pages
    if (pageNewCount === 0) {
      state.stalePageCount++;
      if (state.stalePageCount >= maxStale) {
        state.stopReason = 'stale_pages';
        return state.stopReason;
      }
    } else {
      state.stalePageCount = 0;
    }

    // Guard 3: Target reached
    if (state.totalAdded >= targetAdds) {
      state.stopReason = 'target_reached';
      return state.stopReason;
    }

    // Guard 4: Time limit
    if (Date.now() - state.startedAt > maxDuration) {
      state.stopReason = 'time_limit';
      return state.stopReason;
    }

    return null;
  }

  return { state, check };
}
