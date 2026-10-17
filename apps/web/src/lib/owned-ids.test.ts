import { describe, expect, it } from 'vitest';
import { allIdsOwned, ownedIds } from './owned-ids';

const USER_A = 'user-a';
const USER_B = 'user-b';
const TAG_A = 'tag-a';
const TAG_B = 'tag-b';

function mockClient(rows: { id: string; user_id: string }[]) {
  return {
    from() {
      const state = { ids: [] as string[], userId: '' };
      const chain = {
        select() {
          return chain;
        },
        in(_col: string, ids: string[]) {
          state.ids = ids;
          return chain;
        },
        eq(_col: string, userId: string) {
          state.userId = userId;
          return Promise.resolve({
            data: rows.filter((r) => state.ids.includes(r.id) && r.user_id === state.userId),
            error: null,
          });
        },
      };
      return chain;
    },
  };
}

describe('ownedIds IDOR guard', () => {
  it('User A cannot attach User B’s tag', async () => {
    const client = mockClient([
      { id: TAG_A, user_id: USER_A },
      { id: TAG_B, user_id: USER_B },
    ]);
    const owned = await ownedIds(client as never, 'tags', [TAG_A, TAG_B], USER_A);
    expect(owned).toEqual([TAG_A]);
    expect(allIdsOwned([TAG_A, TAG_B], owned)).toBe(false);
    expect(allIdsOwned([TAG_A], owned)).toBe(true);
  });
});
