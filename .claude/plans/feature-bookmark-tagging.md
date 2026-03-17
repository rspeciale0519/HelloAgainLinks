# Feature: Manual Bookmark Tagging

## Context

Users can create tags and the background sync auto-tags bookmarks via Grok AI, but there is **no UI to manually add or remove tags from bookmarks**. The backend API endpoints already exist (`POST /api/bookmarks/[id]/tags` and `DELETE /api/bookmarks/[id]/tags/[tagId]`), so this feature is purely a frontend UI task. The bookmarks list API already returns tag relationship data (`bookmark_tags`) — it's just not displayed or used.

**Goal:** Add tag display and tag management to the bookmarks page so users can see which tags are on each bookmark and toggle tags on/off via a popover.

---

## Design Direction

**Consistent with existing app aesthetic:** Dark glass-morphism, `#00d4ff` cyan accents, Inter font, Framer Motion animations, inline styles. No new dependencies.

**Key interaction:** Each bookmark card gets a small tag icon button. Clicking it opens a popover showing all user tags as toggleable pills. Tags already assigned are visually distinct (filled). Toggling is instant via optimistic UI.

---

## Phase 1: Create Components & Wire Up

### Files to CREATE

#### 1. `apps/web/src/components/TagPopover.tsx` (~170 lines)

Floating popover for toggling tags on a bookmark.

- **Positioning:** Absolute, below trigger button, `zIndex: 50`
- **Styling:** Match `UserMenu.tsx` popover pattern exactly:
  - `background: rgba(18, 18, 26, 0.98)`, `backdropFilter: blur(20px)`
  - `border: 1px solid rgba(0,212,255,0.12)`, `borderRadius: 12px`
  - `boxShadow: 0 -8px 32px rgba(0,0,0,0.5), 0 0 16px rgba(0,212,255,0.06)`
- **Animation:** `AnimatePresence` + `motion.div` with `opacity/y/scale` (same as `UserMenu.tsx` lines 91-95)
- **Close behavior:** Click-outside (`mousedown` listener) + Escape key (same pattern as `UserMenu.tsx` lines 27-46)
- **Content:**
  - Header: "Manage Tags" label (13px, `#8a8a9a`)
  - Tag pills in flex-wrap layout, each as a `<motion.button>` with `whileTap={{ scale: 0.95 }}`
  - **Active tag** (on bookmark): background `hexToRgba(tag.color, 0.15)`, border `hexToRgba(tag.color, 0.4)`, text `tag.color`, small checkmark prefix
  - **Inactive tag:** background transparent, border `rgba(255,255,255,0.08)`, text `#8a8a9a`
  - Hover: lighten border/background slightly
  - Empty state: "No tags yet" with link text to Tags page
- **Props:**
  ```typescript
  interface TagPopoverProps {
    allTags: TagInfo[];
    activeTagIds: Set<string>;
    onToggle: (tagId: string, add: boolean) => void;
    onClose: () => void;
  }
  ```

**Reference files:**
- `src/components/UserMenu.tsx` — popover animation, click-outside, Escape-to-close, glass styling
- `src/app/dashboard/tags/page.tsx` — tag pill styling pattern

#### 2. `apps/web/src/components/BookmarkCard.tsx` (~200 lines)

Individual bookmark card with tag display, tag management trigger, and X link.

- **Structure change:** Current `<motion.a>` becomes `<motion.div>` so interactive elements (tag button, popover) don't trigger navigation
- **Layout:**
  - Header row: `@handle` (cyan, 14px bold) | author name (gray) | external-link SVG icon (`<a>` to X post, `target="_blank"`, stops propagation) | time ago (gray)
  - Content text (14px, `#c0c0d0`)
  - Tag pills row (only if bookmark has tags): horizontal flex-wrap of small colored pills
  - Tag button: small tag SVG icon, bottom-right area, opens TagPopover on click
- **Tag pill styling** (displayed tags):
  - `borderRadius: 100px`, `padding: 3px 10px`, `fontSize: 12px`
  - Background/border/text use the tag's `color` field via `hexToRgba()` helper
- **Tag button styling:**
  - Small (28x28px), transparent background, `#4a4a5a` icon color
  - Hover: `rgba(0,212,255,0.08)` background, cyan icon
- **Optimistic tag toggle:**
  1. Update local state immediately
  2. Fire API call (POST to add, DELETE to remove)
  3. On failure: revert local state
  4. Auth: get session token inline (same pattern as `tags/page.tsx` lines 59-67)
- **Props:**
  ```typescript
  interface BookmarkCardProps {
    bookmark: BookmarkWithTags;
    index: number;
    allTags: TagInfo[];
    onTagsChanged: (bookmarkId: string, tags: BookmarkTag[]) => void;
  }
  ```
- **Exports shared types:**
  ```typescript
  export interface TagInfo { id: string; name: string; color: string; }
  export interface BookmarkTag { tag_id: string; tags: TagInfo; }
  export interface BookmarkWithTags { /* existing fields + bookmark_tags?: BookmarkTag[] */ }
  ```
- **Utility function** (inline, 5 lines):
  ```typescript
  function hexToRgba(hex: string, alpha: number): string
  ```

### Files to MODIFY

#### 3. `apps/web/src/app/dashboard/bookmarks/page.tsx`

**Changes:**
1. **Import** `BookmarkCard` and types from `@/components/BookmarkCard`
2. **Update `Bookmark` interface** → use `BookmarkWithTags` from BookmarkCard
3. **Add `allTags` state** and fetch from `GET /api/tags` on mount (alongside bookmarks fetch)
4. **Add `handleTagsChanged` callback** that updates the specific bookmark's tags in the `bookmarks` state array
5. **Replace inline `<motion.a>` card rendering** (lines 155-187) with:
   ```tsx
   <BookmarkCard
     bookmark={bm}
     index={i}
     allTags={allTags}
     onTagsChanged={handleTagsChanged}
   />
   ```
6. **Remove** inline `timeAgo` function (moves into BookmarkCard)
7. Page stays well under 450 lines (~150 lines after extraction)

---

## API Endpoints Used (all existing, no backend changes)

| Action | Method | Endpoint | Body |
|--------|--------|----------|------|
| Fetch all tags | GET | `/api/tags` | — |
| Add tag to bookmark | POST | `/api/bookmarks/[id]/tags` | `{ tag_ids: [uuid] }` |
| Remove tag from bookmark | DELETE | `/api/bookmarks/[id]/tags/[tagId]` | — |
| Fetch bookmarks (already returns tags) | GET | `/api/bookmarks?...` | — |

---

## Verification

1. **Build:** `npm run build` — no TypeScript errors
2. **Visual:** Navigate to `/dashboard/bookmarks`
   - Bookmarks with existing tags should show colored pills below content
   - Click the tag icon on any bookmark → popover opens with all user tags
   - Active tags show filled/checked, inactive show outline
   - Toggle a tag → pill appears/disappears instantly (optimistic)
   - Click outside or press Escape → popover closes
   - External link icon still navigates to the X post
3. **Browser test:** Use Playwright MCP to verify:
   - No console errors
   - Popover z-index renders above other cards
   - Tag toggle API calls succeed (check Network tab)
   - Optimistic revert works (simulate by temporarily breaking the API endpoint)
4. **Deploy:** `vercel deploy --prod` and test on production
