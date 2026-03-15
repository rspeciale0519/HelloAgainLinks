# Feature: Manual Bookmark Tagging

## Phase 1: Create Components & Wire Up

### Files to CREATE
1. `apps/web/src/components/TagPopover.tsx` — Floating popover for toggling tags on a bookmark
2. `apps/web/src/components/BookmarkCard.tsx` — Individual bookmark card with tag display/management

### Files to MODIFY
3. `apps/web/src/app/dashboard/bookmarks/page.tsx` — Extract card, add tag fetch, wire up components

## Verification
- `npm run build` — no TypeScript errors
- Navigate to `/dashboard/bookmarks` — tags display and popover work
- Playwright browser test — no console errors, proper z-index, API calls succeed
