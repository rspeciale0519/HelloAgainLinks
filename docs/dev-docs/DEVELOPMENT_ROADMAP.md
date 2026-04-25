# HelloAgain — Development Roadmap

> **Version:** 1.0  
> **Date:** February 7, 2026  
> **MVP Scope:** Phases 1-3 (Core Extension + AI + Bookmark Blend)  
> **Estimated MVP Timeline:** 4 weeks

---

## Active Initiative: HAL Dashboard Redesign

> **Spec:** `docs/superpowers/specs/2026-04-22-hal-redesign-design.md`  
> **Plan:** `.claude/plans/feature-hal-redesign.md`  
> **Branch:** `feature/hal-redesign`  
> **Goal:** Replace `/dashboard/bookmarks` with the new obsidian+lime 3-pane design while preserving every existing feature; add user-editable folders with X-import, fully-wired Signal AI rail, ⌘K palette, Spread modal, Tweaks panel, bulk selection.

- [x] **Phase 1 — Foundation** *(complete)*
  - [x] Migration 005 (folders, conversations, messages, bookmarks AI annotation columns)
  - [x] `@helloagain/ui-hal` package scaffold + workspace registration
  - [x] Theme tokens + scoped CSS (`globals.css` under `[data-hal="on"]`)
  - [x] Six primitives: `Icon`, `Chip`, `HalButton`, `StatusDot`, `BackgroundLayers`, `SegButton`
- [ ] **Phase 2 — Shell + feed** — rewrite `/dashboard/bookmarks` as 3-pane shell with all preserved features
- [ ] **Phase 3 — Folders + X import** — folder CRUD + extension folder-walk import
- [ ] **Phase 4 — Signal rail** — Ask + Threads + Related, real AI with conversation persistence
- [ ] **Phase 5 — Palette + Spread + Tweaks + AI annotations** — ⌘K palette, detail modal, classification pipeline extension
- [ ] **Phase 6 — Bulk + polish + cutover** — bulk selection, accessibility pass, remove boot splash + scanlines

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Extension | Chrome Extension (Manifest V3), TypeScript, React 19 | MV3 |
| Backend | Next.js 16, React 19, TypeScript | 16.x |
| Database | Supabase (PostgreSQL + pgvector + Auth + RLS) | Latest |
| AI | Grok API (xAI) — `x_search()`, Collections, Chat | Latest |
| Payments | Stripe (Subscriptions + Checkout + Portal) | Latest |
| Hosting | Vercel | Latest |
| Package Manager | pnpm | 9.x |
| Monorepo | Turborepo | Latest |

---

## Phase 1: Foundation & Core Extension (Week 1-2)

> **Goal:** Working Chrome extension that imports, stores, searches, and organizes X bookmarks.

### 1.1 Project Setup & Infrastructure

- [ ] **Initialize monorepo with Turborepo**
  - [ ] Create root `package.json` with pnpm workspaces
  - [ ] Configure `turbo.json` with build/dev/lint/test pipelines
  - [ ] Create workspace packages: `apps/web`, `apps/extension`, `packages/shared`, `packages/ui`
  - [ ] Set up shared TypeScript config (`tsconfig.base.json`)
  - [ ] Set up shared ESLint config (`eslint.config.mjs`)
  - [ ] Add `.nvmrc` with Node 22 LTS

- [ ] **Set up Next.js 16 backend (`apps/web`)**
  - [ ] Initialize Next.js 16 with App Router and TypeScript
  - [ ] Configure environment variables (`.env.local.example`)
  - [ ] Set up `src/app` directory structure: `(auth)`, `(dashboard)`, `api/`
  - [ ] Add Tailwind CSS 4 + shadcn/ui component library
  - [ ] Create base layout with responsive design
  - [ ] Set up error boundary and loading states

- [ ] **Set up Supabase project**
  - [ ] Create Supabase project (production + staging)
  - [ ] Enable pgvector extension for future embedding storage
  - [ ] Configure Auth providers (X/Twitter OAuth 2.0)
  - [ ] Set up Row Level Security policies for all tables
  - [ ] Create database migration system using Supabase CLI
  - [ ] Set up Supabase client (`@supabase/ssr` for Next.js, `@supabase/supabase-js` for extension)

- [ ] **Design and create database schema**
  - [ ] `profiles` table (id, x_user_id, x_handle, display_name, avatar_url, plan, created_at)
  - [ ] `bookmarks` table (id, user_id, x_post_id, x_author_handle, x_author_name, content_text, media_urls, post_created_at, bookmarked_at, created_at)
  - [ ] `tags` table (id, user_id, name, color, created_at)
  - [ ] `bookmark_tags` junction table (bookmark_id, tag_id)
  - [ ] `folders` table (id, user_id, name, parent_id, sort_order, created_at)
  - [ ] `bookmark_folders` junction table (bookmark_id, folder_id)
  - [ ] `subscriptions` table (id, user_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end)
  - [ ] Add indexes: full-text search on `bookmarks.content_text`, btree on `user_id`, `x_post_id`, `bookmarked_at`
  - [ ] Write RLS policies: users can only CRUD their own bookmarks, tags, folders
  - [ ] Create initial migration file and apply

- [ ] **Set up Chrome Extension scaffold (`apps/extension`)**
  - [ ] Create `manifest.json` (Manifest V3) with required permissions: `activeTab`, `storage`, `identity`
  - [ ] Set up Vite/CRXJS or Plasmo for extension bundling with HMR
  - [ ] Create service worker (`background.ts`) — handles API communication, auth token management
  - [ ] Create content script (`content.ts`) — injected on `x.com` pages
  - [ ] Create popup UI (`popup/`) — React 19 app for quick access
  - [ ] Create sidebar panel (`sidepanel/`) — React 19 app for full bookmark management
  - [ ] Configure message passing between content script ↔ service worker ↔ popup/sidebar
  - [ ] Set up extension storage for offline cache and auth tokens

- [ ] **Implement authentication flow**
  - [ ] Configure X/Twitter OAuth 2.0 in Supabase Auth
  - [ ] Build login page in Next.js (`/login`) with X OAuth button
  - [ ] Implement extension auth: open web login → receive token → store in extension
  - [ ] Create auth middleware for API routes (verify Supabase JWT)
  - [ ] Build session management (auto-refresh tokens, handle expiry)
  - [ ] Create `/api/auth/callback` route for OAuth redirect
  - [ ] Test auth flow end-to-end: extension → web login → token → extension authenticated

### 1.2 Bookmark Import & Storage

- [ ] **Build X bookmark import pipeline**
  - [ ] Research X API v2 bookmark endpoints (GET /2/users/:id/bookmarks)
  - [ ] Implement paginated bookmark fetch (X API returns max 100 per page)
  - [ ] Parse bookmark response: extract post ID, author, content, media, timestamps
  - [ ] Handle rate limits (X API: 180 requests/15 min for user auth)
  - [ ] Build progress indicator for import (show X of Y bookmarks imported)
  - [ ] Implement deduplication check (skip already-imported bookmarks by x_post_id)
  - [ ] Store raw bookmark data in Supabase `bookmarks` table
  - [ ] Handle edge cases: deleted posts, suspended accounts, private accounts

- [ ] **Create bookmark CRUD API routes**
  - [ ] `POST /api/bookmarks` — create bookmark (manual save or import)
  - [ ] `GET /api/bookmarks` — list bookmarks with pagination, sorting, filtering
  - [ ] `GET /api/bookmarks/:id` — get single bookmark with tags and folders
  - [ ] `PATCH /api/bookmarks/:id` — update bookmark metadata
  - [ ] `DELETE /api/bookmarks/:id` — delete single bookmark
  - [ ] `POST /api/bookmarks/bulk-delete` — delete multiple bookmarks
  - [ ] `GET /api/bookmarks/count` — get bookmark count for plan limit enforcement
  - [ ] Add input validation with Zod schemas for all routes
  - [ ] Add plan limit enforcement: reject saves above 500 for free tier

- [ ] **Build one-click save from X timeline**
  - [ ] Content script: detect X bookmark button clicks (intercept or add adjacent button)
  - [ ] Extract post data from DOM or X's internal API responses (content, author, media, timestamp)
  - [ ] Send bookmark data to service worker → API
  - [ ] Show save confirmation toast on X timeline
  - [ ] Handle save failures gracefully (retry, offline queue)
  - [ ] Add "Save + Tag" option: show quick tag selector on save

### 1.3 Search & Organization

- [ ] **Implement bookmark search**
  - [ ] `GET /api/bookmarks/search?q=` — full-text search using PostgreSQL `tsvector`
  - [ ] Create GIN index on content_text for fast full-text search
  - [ ] Support filters: author, date range, tags, folders
  - [ ] Support sorting: date saved, date posted, relevance
  - [ ] Implement search highlighting (return matched snippets)
  - [ ] Build search UI in extension sidebar with real-time results (debounced input)
  - [ ] Add recent searches history (stored in extension local storage)

- [ ] **Build folder management**
  - [ ] `POST /api/folders` — create folder (enforce 5-folder limit on free tier)
  - [ ] `GET /api/folders` — list folders with bookmark counts
  - [ ] `PATCH /api/folders/:id` — rename folder
  - [ ] `DELETE /api/folders/:id` — delete folder (bookmarks remain, unlinked)
  - [ ] `POST /api/bookmarks/:id/folders` — add bookmark to folder
  - [ ] `DELETE /api/bookmarks/:id/folders/:folderId` — remove from folder
  - [ ] Build folder tree UI in sidebar with drag-and-drop (using dnd-kit)
  - [ ] Support nested folders (parent_id reference)

- [ ] **Build tag management**
  - [ ] `POST /api/tags` — create tag with optional color
  - [ ] `GET /api/tags` — list all tags with usage counts
  - [ ] `PATCH /api/tags/:id` — update tag name/color
  - [ ] `DELETE /api/tags/:id` — delete tag (removes from all bookmarks)
  - [ ] `POST /api/bookmarks/:id/tags` — add tags to bookmark
  - [ ] `DELETE /api/bookmarks/:id/tags/:tagId` — remove tag from bookmark
  - [ ] Build tag input component: autocomplete, create-on-the-fly, color picker
  - [ ] Support bulk tagging (select multiple bookmarks → apply tags)

### 1.4 Extension UI

- [ ] **Build popup UI**
  - [ ] Quick search bar (opens sidebar with results)
  - [ ] Recent bookmarks list (last 5)
  - [ ] Bookmark count and plan status
  - [ ] Quick save button for current page (if on x.com)
  - [ ] Settings/login link
  - [ ] "Open full dashboard" link (opens web app)

- [ ] **Build sidebar panel UI**
  - [ ] Full bookmark list with virtual scrolling (handle 10K+ bookmarks)
  - [ ] Search bar with filter chips (author, date, tags, folders)
  - [ ] Folder navigation tree (left panel)
  - [ ] Bookmark card component: post preview, author, date, tags, actions
  - [ ] Bookmark detail view: full post content, all metadata, edit tags/folders
  - [ ] Bulk selection mode (select all, select range, bulk actions)
  - [ ] Import progress view with real-time count
  - [ ] Empty states and onboarding prompts

- [ ] **Build web dashboard (`apps/web`)**
  - [ ] Dashboard home: bookmark stats, recent saves, quick search
  - [ ] Full bookmark library view (same as sidebar but full-page)
  - [ ] Settings page: account, privacy, plan management
  - [ ] Billing page: current plan, upgrade/downgrade, Stripe customer portal
  - [ ] Data export page: download CSV/JSON
  - [ ] Mobile-responsive design for all pages

### 1.5 Payments & Plan Enforcement

- [ ] **Integrate Stripe**
  - [ ] Create Stripe products and prices (Pro monthly $9, Pro annual $86, LTD $79)
  - [ ] Implement `POST /api/stripe/checkout` — create checkout session
  - [ ] Implement `POST /api/stripe/portal` — create customer portal session
  - [ ] Implement `POST /api/stripe/webhook` — handle subscription events
  - [ ] Handle webhook events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
  - [ ] Sync subscription status to `subscriptions` table
  - [ ] Build upgrade prompt component (shown when hitting free tier limits)
  - [ ] Test full payment flow in Stripe test mode

---

## Phase 2: AI Integration & Smart Features (Week 2-3)

> **Goal:** Grok-powered auto-tagging, smart search, and content intelligence.

### 2.1 Grok API Integration Layer

- [ ] **Build Grok API client service**
  - [ ] Create `packages/shared/src/grok.ts` — typed Grok API wrapper
  - [ ] Implement chat completions endpoint (for summaries, analysis)
  - [ ] Implement `x_search()` tool calling (keyword, semantic, user search)
  - [ ] Implement Collections API (create, upload, search)
  - [ ] Add rate limiting and retry logic with exponential backoff
  - [ ] Add response caching layer (Redis or Supabase cache table) to reduce API costs
  - [ ] Add cost tracking: log token usage per user per request
  - [ ] Create environment config for API keys and model selection

### 2.2 Auto-Tagging System

- [ ] **Implement AI auto-tagging pipeline**
  - [ ] Create `POST /api/ai/auto-tag` endpoint
  - [ ] Build prompt template: given bookmark content, return 1-5 topic tags from a curated taxonomy
  - [ ] Define initial tag taxonomy (50-100 topics: "AI/ML", "Web Dev", "Startups", "Crypto", "Design", etc.)
  - [ ] Allow user-defined custom tags to be included in the taxonomy for personalization
  - [ ] Batch processing: auto-tag new bookmarks in background (queue with pg_cron or Supabase Edge Function)
  - [ ] Run auto-tag on bulk import (process in batches of 20 to manage API costs)
  - [ ] Build UI: show suggested tags with accept/reject, show confidence indicator
  - [ ] Store auto-generated tags with `source: 'ai'` flag to distinguish from manual tags
  - [ ] Add toggle in settings: enable/disable auto-tagging

### 2.3 Smart Search (Natural Language)

- [ ] **Implement AI-powered search**
  - [ ] Create `POST /api/ai/search` endpoint
  - [ ] Build search pipeline: user query → Grok extracts intent (keywords, author, date hints, topic) → construct PostgreSQL query → return results
  - [ ] Generate and store embeddings for bookmarks using Grok (store in pgvector column)
  - [ ] Implement semantic search: embed query → cosine similarity against bookmark embeddings
  - [ ] Hybrid search: combine full-text (BM25) + semantic (vector) scores
  - [ ] Build "smart search" UI toggle in search bar (basic search vs. AI search)
  - [ ] Free tier: basic keyword search only; Pro tier: AI natural language search
  - [ ] Cache frequent queries to reduce Grok API calls

### 2.5 AI Assistant (Conversational Interface)

- [ ] **Build AI Assistant chat UI**
  - [ ] Create `/dashboard/assistant` page with full chat interface
  - [ ] Add "Assistant" nav item to dashboard sidebar with sparkle/AI icon
  - [ ] Design chat panel with dark Stark/Iron Man theme consistent with existing UI
  - [ ] User messages right-aligned, assistant messages left-aligned with subtle cyan glow
  - [ ] Input bar at bottom with send button and mic icon placeholder
  - [ ] Typing indicator animation (pulsing dots with cyan glow)
  - [ ] Framer Motion animations for messages appearing (slide-in + fade)
  - [ ] Suggested prompt chips for new users above input bar

- [ ] **Implement conversational bookmark queries**
  - [ ] Natural language understanding: "Show me everything about startup fundraising from last week"
  - [ ] Context-aware responses: assistant knows user's bookmarks, tags, folders
  - [ ] Parse date-relative queries ("last week", "this month", "yesterday")
  - [ ] Parse topic queries (map to existing tags and full-text search)
  - [ ] Parse author queries ("everything from @naval")
  - [ ] Return formatted bookmark results inline in chat

- [ ] **Implement chat-based bookmark actions**
  - [ ] Tag operations: "Tag all my AI bookmarks as 'machine-learning'"
  - [ ] Folder operations: "Create a folder called 'Fundraising' and move these there"
  - [ ] Bulk actions: "Delete all bookmarks older than 6 months with no tags"
  - [ ] Confirmation prompts before destructive actions
  - [ ] Success/failure feedback in chat after action execution

- [ ] **Implement bookmark discovery via chat**
  - [ ] "Find me X posts similar to my saved ones about distributed systems"
  - [ ] Use Grok `x_search()` with user's interest profile for discovery
  - [ ] Show discoverable posts inline with "Save" action buttons
  - [ ] Related bookmark suggestions based on conversation context

- [ ] **Build Grok API function calling integration**
  - [ ] Define function schemas for bookmark CRUD operations
  - [ ] Implement Grok chat completions with function calling enabled
  - [ ] Map function calls to existing API endpoints (search, tag, folder, delete)
  - [ ] Handle multi-step function chains (e.g., search → tag results)
  - [ ] Rate limit and cost tracking per assistant conversation

- [ ] **Chat history and persistence**
  - [ ] `chat_sessions` table (id, user_id, title, created_at, updated_at)
  - [ ] `chat_messages` table (id, session_id, role, content, function_calls_json, created_at)
  - [ ] Auto-generate session titles from first user message
  - [ ] List previous chat sessions in sidebar or assistant page
  - [ ] Load and continue previous conversations

- [ ] **Suggested prompts and onboarding**
  - [ ] Show suggested prompt chips for new users: "Find my most saved topics", "Summarize my bookmarks from this week", "Show bookmarks about AI"
  - [ ] Context-aware suggestions based on user's library (e.g., if they have many AI bookmarks, suggest AI-related queries)
  - [ ] Empty state with welcome message and feature overview
  - [ ] Pro-only gating: free tier gets 5 assistant queries/day, Pro unlimited

### 2.4 Content Intelligence

- [ ] **Implement bookmark summaries**
  - [ ] Create `POST /api/ai/summarize` endpoint
  - [ ] Single bookmark summary: Grok summarizes long threads into 2-3 sentences
  - [ ] Folder/tag summary: Grok summarizes all bookmarks in a folder/tag ("Your AI/ML collection covers: ...")
  - [ ] Build summary UI: expandable summary card on bookmark detail view
  - [ ] Cache summaries in database (regenerate only if new bookmarks added)

- [ ] **Implement related content discovery**
  - [ ] Create `GET /api/ai/related/:bookmarkId` endpoint
  - [ ] Use bookmark's embedding to find similar bookmarks in user's library
  - [ ] Use Grok `x_search()` to find similar public posts the user hasn't saved
  - [ ] Build "Related" tab on bookmark detail view
  - [ ] Limit: 5 related bookmarks + 5 related public posts

- [ ] **Implement duplicate detection**
  - [ ] On new bookmark save, check cosine similarity against existing embeddings
  - [ ] Flag duplicates above 0.92 similarity threshold
  - [ ] Show "You may have already saved this" warning with link to existing bookmark
  - [ ] Build merge UI: keep one, transfer tags/folders from the other

---

## Phase 3: Bookmark Blend — Viral Feature (Week 3-4)

> **Goal:** Ship the flagship social feature that drives viral growth through shareable artifacts on X.

### 3.1 Blend Infrastructure

- [ ] **Design Blend database schema**
  - [ ] `blends` table (id, user_a_id, user_b_id, status: pending/active/expired, blend_score, analysis_json, card_image_url, created_at, expires_at)
  - [ ] `blend_invites` table (id, inviter_id, invite_code, invitee_id nullable, status: pending/accepted/declined, created_at)
  - [ ] Add RLS policies: users can only see Blends they're part of
  - [ ] Add indexes on user_a_id, user_b_id, invite_code

- [ ] **Build Blend invite system**
  - [ ] `POST /api/blends/invite` — generate invite link with unique code
  - [ ] `GET /api/blends/invite/:code` — view invite details (inviter's display name, avatar)
  - [ ] `POST /api/blends/invite/:code/accept` — accept invite, trigger Blend generation
  - [ ] `POST /api/blends/invite/:code/decline` — decline invite
  - [ ] Build invite landing page (`/blend/invite/:code`) — shows inviter info, CTA to sign up or accept
  - [ ] If invitee doesn't have HelloAgain: show signup flow, then auto-accept after onboarding
  - [ ] Enforce free tier limit: 1 Blend per calendar month (check `blends` count)

### 3.2 Blend Analysis Engine

- [ ] **Build taste analysis pipeline**
  - [ ] Compute topic distribution for each user (aggregate tag frequencies + embeddings centroid per topic cluster)
  - [ ] Use Grok to identify **Common Ground**: topics/authors both users save frequently
  - [ ] Use Grok to identify **Unique Tastes**: topics distinctive to each user
  - [ ] Use Grok to identify **Hidden Connections**: semantic overlaps not obvious from surface tags
  - [ ] Compute Blend Score (0-100) based on cosine similarity of user topic vectors
  - [ ] Map score to tier label: 0-25% "Expanding Each Other's Horizons", 26-50% "Interesting Crossovers", 51-75% "Bookmark Buddies", 76-100% "Intellectual Twins"
  - [ ] Generate natural language summary: "You both obsess over distributed systems. [User A] brings biotech insights while [User B] adds game design perspective."
  - [ ] Store full analysis as JSON in `blends.analysis_json`
  - [ ] Handle edge cases: user with < 10 bookmarks (not enough data), users with identical libraries

- [ ] **Build Blend Feed generation**
  - [ ] Find the intersection of both users' topic interests
  - [ ] Use Grok `x_search()` with intersection topics to find posts neither user has bookmarked
  - [ ] Rank results by relevance to both users' profiles
  - [ ] Return top 10-20 posts as the Blend Feed
  - [ ] `GET /api/blends/:id/feed` — paginated Blend Feed endpoint
  - [ ] Cache Blend Feed for 24 hours (regenerate on demand)

### 3.3 Shareable Blend Card

- [ ] **Design Blend card visual**
  - [ ] Create card template (1200x630px for X card preview): both user avatars, Blend Score prominently displayed, tier label, top 3 shared topics, each user's "signature interest"
  - [ ] Design 4 card color themes (one per score tier)
  - [ ] Use Satori (Vercel's OG image library) or Canvas API for server-side image generation
  - [ ] Implement `GET /api/blends/:id/card` — returns generated PNG image
  - [ ] Add OG meta tags on Blend public page for rich X card preview

- [ ] **Build Blend public page**
  - [ ] Create `/blend/:id` public page (viewable by anyone with the link)
  - [ ] Show Blend Score, tier label, topic analysis, both users' handles
  - [ ] "Create your own Blend" CTA for non-users (viral loop)
  - [ ] Download card as image button
  - [ ] "Share on X" button with pre-filled tweet text: "My bookmark blend with @[user] — we're [tier label]! 🔖 [link]"
  - [ ] Add `<meta>` OG tags: title, description, image (card), twitter:card = summary_large_image

### 3.4 Blend UI in Extension & Dashboard

- [ ] **Build Blend management UI**
  - [ ] "Blends" tab in sidebar/dashboard navigation
  - [ ] "Create New Blend" button → generate invite link or enter X handle
  - [ ] Pending Blends list (invites sent/received)
  - [ ] Active Blends list with score preview cards
  - [ ] Blend detail view: full analysis, Blend Feed, share options
  - [ ] Blend privacy controls: exclude specific bookmarks or tags from analysis
  - [ ] Free tier: show Blend count (1/1 used this month) with upgrade prompt

### 3.5 Blend Privacy & Safety

- [ ] **Implement privacy controls**
  - [ ] Add `blend_opt_in` boolean to profiles (default: true for new users)
  - [ ] Add `blend_excluded_tags` and `blend_excluded_bookmark_ids` to profiles
  - [ ] Blend analysis only processes non-excluded bookmarks
  - [ ] Public Blend page shows aggregate themes only — never specific bookmark URLs or content
  - [ ] Users can delete a Blend at any time (removes analysis, card, and public page)
  - [ ] Rate limit Blend creation to prevent abuse (max 10 per user per month even on Pro)

---

## Phase 4: Signal Boards (Month 2)

> **Goal:** Small-group collaborative bookmark collections with Grok-powered AI scout.

### 4.1 Signal Board Infrastructure

- [ ] **Design Signal Board database schema**
  - [ ] `boards` table (id, owner_id, name, description, topic_scope, is_public, scout_frequency: hourly/daily/weekly, created_at)
  - [ ] `board_members` table (board_id, user_id, role: owner/editor/viewer, joined_at)
  - [ ] `board_bookmarks` table (id, board_id, bookmark_id or x_post_id, added_by_user_id, source: member/scout, status: active/dismissed, created_at)
  - [ ] `board_invites` table (id, board_id, invite_code, created_at, expires_at)
  - [ ] `scout_runs` table (id, board_id, ran_at, candidates_found, candidates_promoted, candidates_dismissed)
  - [ ] Add RLS policies for multi-user board access
  - [ ] Add indexes on board_id, user_id, status

- [ ] **Build Board CRUD API**
  - [ ] `POST /api/boards` — create board (enforce limits: free 1 board, pro unlimited)
  - [ ] `GET /api/boards` — list user's boards with member counts and bookmark counts
  - [ ] `GET /api/boards/:id` — get board with members, bookmarks, scout status
  - [ ] `PATCH /api/boards/:id` — update name, description, topic scope, scout frequency, visibility
  - [ ] `DELETE /api/boards/:id` — delete board (owner only)
  - [ ] `POST /api/boards/:id/invite` — generate invite link
  - [ ] `POST /api/boards/:id/join` — join via invite code (enforce member limits: free 3, pro 8)
  - [ ] `DELETE /api/boards/:id/members/:userId` — remove member (owner only)
  - [ ] `POST /api/boards/:id/bookmarks` — add bookmark to board
  - [ ] `PATCH /api/boards/:id/bookmarks/:bookmarkId` — promote/dismiss scout candidate
  - [ ] `DELETE /api/boards/:id/bookmarks/:bookmarkId` — remove bookmark from board

### 4.2 Grok Scout Agent

- [ ] **Build Scout pipeline**
  - [ ] Create scheduled job (Supabase Edge Function + pg_cron) per scout frequency
  - [ ] For each board due for a scout run: extract topic scope + analyze existing board bookmarks
  - [ ] Construct semantic search queries from board's content profile
  - [ ] Call Grok `x_search()` with date range filter (since last scout run)
  - [ ] Filter out posts already on the board or dismissed previously
  - [ ] Score candidates by relevance to board's topic profile
  - [ ] Insert top 5-10 candidates into `board_bookmarks` with status: 'candidate'
  - [ ] Log scout run in `scout_runs` table
  - [ ] Send notification to board members: "Your Scout found 7 new posts for [Board Name]"

- [ ] **Build Radar tab UI**
  - [ ] Show scout candidates in a dedicated "Radar" tab on the board view
  - [ ] Each candidate shows: post preview, relevance score, Grok's reason for surfacing it
  - [ ] Quick actions: "Add to Board" (promote) or "Dismiss" with one click
  - [ ] Bulk promote/dismiss actions
  - [ ] Show scout run history: when it ran, how many found, how many promoted

### 4.3 Board UI

- [ ] **Build Board views in dashboard & extension**
  - [ ] Board list view with cards: name, topic, member avatars, bookmark count
  - [ ] Board detail view: bookmarks grid/list, Radar tab, members panel, settings
  - [ ] Board public page (opt-in): browsable by non-members, "Join" CTA
  - [ ] Real-time updates via Supabase Realtime: new bookmarks, scout candidates appear live
  - [ ] Member activity feed: "[User] added [post] to the board"
  - [ ] Board settings panel: topic scope, scout frequency, visibility, member management

---

## Phase 5: Social Proof & The Pulse (Month 3)

> **Goal:** Collective intelligence layer — "X users who bookmarked this also bookmarked..." and niche trending.

### 5.1 Anonymous Signal Collection

- [ ] **Build privacy-preserving signal pipeline**
  - [ ] Add Pulse opt-in toggle in user settings (default: off)
  - [ ] On bookmark save (for opted-in users): compute topic embedding locally in extension
  - [ ] Add calibrated noise to embedding (local differential privacy)
  - [ ] Send noisy topic vector to server — NOT the bookmark URL or content
  - [ ] Store anonymous signals in `pulse_signals` table (id, noisy_embedding, topic_clusters, created_at) — no user_id
  - [ ] Build privacy documentation page explaining exactly what is collected

### 5.2 "Also Bookmarked" Recommendations

- [ ] **Build collaborative filtering engine**
  - [ ] Aggregate anonymous signals into topic co-occurrence matrix
  - [ ] Build "users who saved posts about [topic A] also save posts about [topic B]" model
  - [ ] Create `GET /api/pulse/related-topics/:topicId` endpoint
  - [ ] When user views a bookmark, show: "HelloAgain users who save posts like this also explore: [Topic 1], [Topic 2]"
  - [ ] Clicking a topic triggers Grok `x_search()` for top recent posts in that topic
  - [ ] Build subtle UI indicator on bookmark cards in extension sidebar

### 5.3 Pulse Trends Dashboard (Pro)

- [ ] **Build trending topics engine**
  - [ ] Compute topic velocity: rate of bookmark signals per topic over rolling 24h/7d windows
  - [ ] Filter trends by user's interest profile (don't show mass-market trends, show niche ones)
  - [ ] Create `GET /api/pulse/trends` endpoint with personalization
  - [ ] Build Pulse Trends dashboard page: topic cards with velocity indicators, sparkline charts
  - [ ] "Rising Posts" feed: posts with accelerating save rates among similar users
  - [ ] Grok integration: for each trending topic, fetch latest notable posts via `x_search()`

### 5.4 Save Velocity Indicators

- [ ] **Build on-timeline social proof (extension content script)**
  - [ ] For opted-in users: when viewing X timeline, check posts against Pulse data
  - [ ] Show subtle indicator (small icon) on posts being actively saved by similar users
  - [ ] Indicator appears only for posts with significant velocity (not every post)
  - [ ] Clicking indicator shows: "Saved by N users with interests like yours"
  - [ ] Ensure indicator doesn't interfere with X's UI or violate extension policies

---

## Phase 6: Community Knowledge Graphs (Month 4+)

> **Goal:** Self-assembling knowledge maps from community bookmark behavior.

### 6.1 Community Infrastructure

- [ ] **Design Community database schema**
  - [ ] `communities` table (id, name, description, domain, is_public, owner_id, max_members, created_at)
  - [ ] `community_members` table (community_id, user_id, role, joined_at)
  - [ ] `community_signals` table (id, community_id, topic_cluster, post_metadata, contributed_at) — anonymous
  - [ ] `knowledge_nodes` table (id, community_id, topic, parent_topic_id, post_count, velocity, key_authors_json, canonical_posts_json, updated_at)
  - [ ] RLS policies for community access

- [ ] **Build Community CRUD API**
  - [ ] Create, list, join, leave, manage community endpoints
  - [ ] Enforce limits: free 2 communities, pro unlimited + create communities
  - [ ] Community discovery page: browse public communities by domain
  - [ ] Invite system similar to Signal Boards

### 6.2 Knowledge Graph Engine

- [ ] **Build automatic knowledge graph construction**
  - [ ] When community members bookmark posts relevant to the community domain, auto-contribute anonymous topic signal
  - [ ] Use Grok Collections API: upload community's aggregate content into a searchable collection
  - [ ] Periodic Grok synthesis job (weekly): analyze accumulated signals and build/update topic graph
  - [ ] Identify topic clusters, subtopic hierarchy, key voices, canonical threads
  - [ ] Compute topic velocity (emerging vs. established)
  - [ ] Store graph in `knowledge_nodes` table

- [ ] **Build gap-filling with Grok**
  - [ ] Compare community's bookmarked coverage against live X conversation
  - [ ] Use `x_search()` to find notable posts/threads on community topics that nobody has bookmarked
  - [ ] Surface gaps as "Recommended for community" in a moderation queue

### 6.3 Knowledge Graph UI

- [ ] **Build visual knowledge graph browser**
  - [ ] Interactive topic map (D3.js or similar): nodes = topics, edges = relationships, size = post count
  - [ ] Topic detail view: top posts, key authors, velocity chart, Grok-curated latest posts
  - [ ] Heat map overlay: which topics are gaining/fading
  - [ ] Community dashboard: member count, total contributions, weekly activity
  - [ ] "Community Digest" notification: weekly Grok-generated summary of community activity

### 6.4 Community Digest

- [ ] **Build weekly digest system**
  - [ ] Grok generates natural language summary of each community's weekly activity
  - [ ] Topics gaining momentum, top saved threads, emerging subtopics, key voices
  - [ ] Deliver via email (Resend or SendGrid) and in-app notification
  - [ ] Digest settings: email frequency, topic filters
  - [ ] Digest public page (for public communities) — drives SEO and discovery

---

## Cross-Cutting Concerns (Ongoing)

### Testing

- [ ] **Unit tests**
  - [ ] API route tests with Vitest (all CRUD operations, edge cases, auth)
  - [ ] Grok API client tests with mocked responses
  - [ ] Blend analysis algorithm tests with sample data
  - [ ] Database query tests against Supabase local dev

- [ ] **Integration tests**
  - [ ] Auth flow: signup → login → token refresh → logout
  - [ ] Bookmark lifecycle: import → save → tag → search → delete
  - [ ] Blend lifecycle: invite → accept → generate → share
  - [ ] Payment flow: checkout → webhook → plan update → feature access

- [ ] **E2E tests**
  - [ ] Extension installed and functional in Chrome
  - [ ] Import flow with mock X API
  - [ ] Search returns correct results
  - [ ] Blend card generates and displays correctly

### DevOps & CI/CD

- [ ] **Set up CI/CD pipeline (GitHub Actions)**
  - [ ] Lint + type check on every PR
  - [ ] Run unit + integration tests on every PR
  - [ ] Build extension and web app on every PR
  - [ ] Auto-deploy web app to Vercel on merge to `main`
  - [ ] Extension build artifact uploaded to GitHub releases
  - [ ] Environment-specific deploys: staging (on PR), production (on release tag)

- [ ] **Monitoring & observability**
  - [ ] Error tracking with Sentry (web app + extension)
  - [ ] API performance monitoring (Vercel Analytics or custom)
  - [ ] Grok API cost tracking dashboard
  - [ ] Supabase database performance monitoring
  - [ ] Uptime monitoring (Checkly or BetterStack)

### Chrome Web Store Launch

- [ ] **Prepare for Chrome Web Store submission**
  - [ ] Write extension description, screenshots (5+), promotional images
  - [ ] Create privacy policy page (hosted on web app)
  - [ ] Create terms of service page
  - [ ] Justify all requested permissions in the CWS developer dashboard
  - [ ] Submit for review (allow 3-7 days for initial review)
  - [ ] Prepare Product Hunt launch assets in parallel

---

## Milestone Summary

| Milestone | Target Date | Deliverable |
|---|---|---|
| **M1: Core Extension** | End of Week 2 | Working extension: import, save, search, organize, payments |
| **M2: AI Features** | End of Week 3 | Auto-tagging, smart search, summaries, related content |
| **M3: Bookmark Blend (MVP Complete)** | End of Week 4 | Blend invite, analysis, shareable card, public page |
| **M4: Signal Boards** | End of Month 2 | Collaborative boards with Grok Scout |
| **M5: Social Proof & Pulse** | End of Month 3 | Anonymous aggregate intelligence, trending, on-timeline indicators |
| **M6: Community Knowledge Graphs** | Month 4+ | Self-assembling community knowledge maps with digests |

---

## Pricing Reference

| Feature | Free | Pro ($9/mo) |
|---|---|---|
| Bookmarks | 500 | Unlimited |
| Folders | 5 | Unlimited |
| Search | Keyword | AI natural language |
| Auto-tagging | ❌ | ✅ |
| AI Summaries | ❌ | ✅ |
| Related Content | ❌ | ✅ |
| Bookmark Blend | 1/month | Unlimited |
| Blend Feed | ❌ | ✅ |
| Signal Boards | 1 board, 3 members | Unlimited, 8 members |
| Scout frequency | Daily | Hourly |
| The Pulse | "Also Bookmarked" only | Full dashboard + alerts |
| Communities | Join 2 | Unlimited + create |
| Export | CSV | CSV + JSON + API |

**Lifetime Deal (Launch):** $79 one-time = Pro forever (limited to first 500 buyers)

---

## Mobile Delivery Track (Capacitor)

### ✅ Completed
- Added Capacitor to `apps/web`
- Added Android/iOS platforms
- Added Share Target plugin + Android intent filters
- Added shared URL ingestion endpoint (`/api/mobile/share`)
- Added background sync endpoint (`/api/sync/background`)
- Added pull-to-refresh + haptic feedback improvements
- Added mobile scripts and README mobile docs

### 🔜 Next
- Finalize iOS Share Extension setup/verification in Xcode release pipeline
- Add background sync scheduler wiring (Vercel Cron/GitHub Actions/worker)
- Add telemetry for share ingestion success/failure rates
- Add retry/backoff for sync runs across large user sets
