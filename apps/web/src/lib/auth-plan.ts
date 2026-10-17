import type { Plan } from '@helloagain/shared';

/**
 * The JWT payload is decoded without verification so we can prefetch the
 * profile in parallel with supabase.auth.getUser. The plan MUST only be used
 * when that unverified `sub` matches the verified user id — otherwise a
 * mutated payload could prefetch another user's tier (User B / admin).
 */
export function planFromPrefetch(
  verifiedUserId: string,
  decodedSub: string | null | undefined,
  prefetchedPlan: Plan | null | undefined,
): Plan {
  if (!decodedSub || decodedSub !== verifiedUserId) return 'free';
  return prefetchedPlan || 'free';
}
