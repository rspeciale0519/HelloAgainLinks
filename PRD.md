# HelloAgain — Product Requirements Document

> **Version:** 1.0  
> **Date:** February 7, 2026  
> **Status:** Draft  
> **Authors:** Jarvis (AI Partner) & Rob

---

## 1. Vision & Problem Statement

### The Problem

X/Twitter users accumulate thousands of bookmarks with zero organizational tools. The native bookmark experience is a reverse-chronological dump — no search, no tags, no folders, no way to rediscover what you saved. Users bookmark posts as a "read later" or "remember this" action, then never find them again.

Every existing solution (Dewey, Tweetsmash, Twillot) treats this as a **single-player problem** — organize YOUR bookmarks better. But bookmarks are inherently social signals. What you save reflects your interests, expertise, and intellectual curiosity. That signal is wasted in isolation.

### The Vision

**HelloAgain** is an X/Twitter bookmark manager that transforms bookmarks from a personal junk drawer into a social knowledge layer. It starts with best-in-class bookmark organization (search, tags, folders, AI categorization), then layers in social features that no competitor offers: taste-matching between users (Bookmark Blend), collaborative curation boards (Signal Boards), and collective intelligence (The Pulse).

The core insight: **bookmarks are the highest-signal user behavior on X.** Likes are cheap. Retweets are performative. Bookmarks are private and intentional — you save what you genuinely want to return to. HelloAgain turns that signal into a social product.

### Why Now

- **xAI's Grok API** provides X-native search, semantic understanding, and collections — capabilities no competitor can replicate without this API access.
- **X's bookmark UX has not improved** despite years of user complaints.
- **Pocket shut down (July 2025)** and **Matter removed all social features** — the read-later/bookmark space is in flux with no clear social winner.
- **Chrome Extension Manifest V3** is mature and stable, enabling powerful browser-native experiences.

---

## 2. Target Audience

### Primary: Power X Users (The "Curator" Persona)

- **Who:** 5K-100K followers, tweet/post daily, bookmark 10-50 posts/week
- **Age:** 25-45
- **Behavior:** Use X for professional development, industry news, networking
- **Pain:** "I know I saved a great thread about [topic] but I can't find it"
- **Segments:** Tech workers, founders, journalists, researchers, marketers, crypto/finance professionals
- **Size estimate:** ~2-5M users globally who actively use X bookmarks

### Secondary: Knowledge Workers & Teams

- **Who:** Small teams (2-8 people) that use X as a research source
- **Use case:** Investment research, journalism, competitive intelligence, academic research
- **Pain:** "We all save relevant posts individually but can't share what we find efficiently"

### Tertiary: Casual X Users

- **Who:** Bookmark occasionally, want better search/organization
- **Conversion path:** Free tier → discover social features → upgrade

---

## 3. Core Features (MVP — Phases 1-3)

### 3.1 Chrome Extension — Bookmark Management

| Feature | Description |
|---|---|
| **One-Click Save** | Enhanced bookmark button on X timeline with instant tag/folder assignment |
| **Bulk Import** | Import all existing X bookmarks via API on first install |
| **Search** | Full-text search across all bookmarked posts |
| **AI Auto-Tagging** | Grok automatically categorizes bookmarks by topic |
| **Folders & Tags** | Manual organization with drag-and-drop |
| **Quick Access Sidebar** | Slide-out panel on X.com for browsing saved bookmarks without leaving the timeline |
| **Export** | CSV/JSON export of all bookmarks with metadata |

### 3.2 AI-Powered Features (Grok Integration)

| Feature | Description |
|---|---|
| **Smart Search** | Natural language queries: "that thread about React Server Components from last month" |
| **Auto-Categorization** | Grok analyzes bookmark content and assigns topic tags automatically |
| **Related Content** | "Posts similar to this bookmark" using Grok's semantic understanding + `x_search()` |
| **Bookmark Summaries** | AI-generated summaries of long threads and grouped bookmarks |
| **Duplicate Detection** | Flag near-duplicate bookmarks |
| **AI Assistant** | Conversational chat interface to query, organize, and discover bookmarks using natural language. Powered by Grok API with function calling for bookmark CRUD operations. Supports actions like "Tag all my AI bookmarks as 'machine-learning'" and discovery like "Find posts similar to my distributed systems bookmarks" |

### 3.3 Bookmark Blend (Viral Social Feature)

| Feature | Description |
|---|---|
| **Blend Invite** | Send a Blend request to another HelloAgain user via link or X handle |
| **Taste Analysis** | Grok compares both libraries: common ground, unique tastes, hidden connections |
| **Blend Score** | 0-100% compatibility score with tier labels |
| **Shareable Card** | Visual card (image) with score, shared topics, and signature interests — optimized for posting to X |
| **Blend Feed** | Grok-curated posts at the intersection of both users' interests that neither has saved |

---

## 4. User Stories

### Bookmark Management

| ID | Story | Priority |
|---|---|---|
| BM-01 | As a user, I can install the Chrome extension and import all my existing X bookmarks in one click | P0 |
| BM-02 | As a user, I can search my bookmarks by keyword, author, date range, or topic | P0 |
| BM-03 | As a user, I can organize bookmarks into folders and apply multiple tags | P0 |
| BM-04 | As a user, I can save a new bookmark from the X timeline with one click | P0 |
| BM-05 | As a user, I can view my bookmarks in a sidebar without leaving X.com | P1 |
| BM-06 | As a user, I can export my bookmarks as CSV or JSON | P1 |
| BM-07 | As a user, I can delete bookmarks individually or in bulk | P0 |
| BM-08 | As a user, I can see my bookmark count and storage usage | P1 |

### AI Features

| ID | Story | Priority |
|---|---|---|
| AI-01 | As a user, my new bookmarks are automatically tagged by topic without manual effort | P0 |
| AI-02 | As a user, I can ask natural language questions to find bookmarks ("that startup funding thread from December") | P0 |
| AI-03 | As a user, I can see AI-generated summaries of long bookmarked threads | P1 |
| AI-04 | As a user, I can discover related X posts I haven't bookmarked based on my saved content | P1 |
| AI-05 | As a user, I am notified when I save a near-duplicate bookmark | P2 |
| AI-06 | As a user, I can open an AI Assistant chat and ask questions about my bookmarks in natural language | P1 |
| AI-07 | As a user, I can perform bookmark actions through chat (e.g., "Tag all my AI bookmarks as 'machine-learning'") | P1 |
| AI-08 | As a user, I can discover new X posts through the assistant (e.g., "Find posts similar to my saved ones about startups") | P1 |
| AI-09 | As a user, my assistant chat history is persisted so I can continue previous conversations | P2 |
| AI-10 | As a user, I see suggested prompt chips to help me get started with the AI Assistant | P1 |

### Bookmark Blend

| ID | Story | Priority |
|---|---|---|
| BL-01 | As a user, I can send a Blend invite to another user via a shareable link | P0 |
| BL-02 | As a user, I can see my Blend score, shared topics, and unique interests compared to another user | P0 |
| BL-03 | As a user, I can download/share a visual Blend card to post on X | P0 |
| BL-04 | As a user, I can view a Blend Feed of posts both users would enjoy | P1 |
| BL-05 | As a user, I can control which bookmarks are included/excluded from Blend analysis | P1 |
| BL-06 | As a free user, I can create 1 Blend per month | P0 |

### Authentication & Account

| ID | Story | Priority |
|---|---|---|
| AC-01 | As a user, I can sign up / log in with my X account via OAuth | P0 |
| AC-02 | As a user, I can manage my subscription (upgrade, downgrade, cancel) | P0 |
| AC-03 | As a user, I can delete my account and all associated data | P0 |
| AC-04 | As a user, I can control my privacy settings (Blend opt-in, data sharing) | P0 |

---

## 5. Technical Requirements

### Architecture

```
┌─────────────────────────────────────────────────┐
│              Chrome Extension (MV3)              │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ Content   │ │ Popup/   │ │ Service Worker   │ │
│  │ Scripts   │ │ Sidebar  │ │ (Background)     │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
└──────────────────┬──────────────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────────────┐
│           Next.js 16 + React 19 Backend          │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ API       │ │ Auth     │ │ Grok Integration │ │
│  │ Routes    │ │ Middleware│ │ Service          │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
└──────┬───────────────┬───────────────┬──────────┘
       │               │               │
┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
│  Supabase   │ │  Grok API   │ │   Stripe    │
│  (Postgres  │ │  (xAI)      │ │  Payments   │
│  + Auth)    │ │             │ │             │
└─────────────┘ └─────────────┘ └─────────────┘
```

### Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Extension** | Chrome Extension (Manifest V3), TypeScript, React 19 | MV3 is required for new extensions; React for popup/sidebar UI |
| **Backend** | Next.js 16, React 19, TypeScript | App Router, Server Actions, RSC for optimal performance |
| **Database** | Supabase (PostgreSQL) | Auth, real-time subscriptions, Row Level Security, pgvector for embeddings |
| **AI** | Grok API (xAI) | X-native search (`x_search()`), semantic analysis, collections API |
| **Payments** | Stripe | Subscriptions, checkout, customer portal |
| **Hosting** | Vercel | Optimal Next.js deployment, edge functions |
| **Storage** | Supabase Storage | Blend card images, user avatars |
| **Analytics** | PostHog or Plausible | Privacy-respecting product analytics |

### Performance Requirements

- Extension popup opens in < 200ms
- Search returns results in < 500ms for libraries up to 10K bookmarks
- Bookmark import processes 1000 bookmarks in < 30 seconds
- Blend generation completes in < 15 seconds
- API response times p95 < 300ms for standard CRUD operations

### Security & Privacy

- All data encrypted in transit (TLS 1.3) and at rest (AES-256)
- Supabase Row Level Security on all tables — users can only access their own data
- Blend participation is explicit opt-in per instance
- No bookmark content shared with third parties beyond Grok API for processing
- GDPR-compliant data export and deletion
- OAuth tokens stored encrypted, never in plaintext

### Browser Support

- Chrome 120+ (primary, Chrome Web Store distribution)
- Edge 120+ (Chromium-based, secondary)
- Firefox (future, post-MVP)

---

## 6. Success Metrics

### North Star Metric

**Weekly Active Bookmarkers (WAB):** Users who save ≥1 bookmark via HelloAgain per week.

### Acquisition

| Metric | Target (3 months) | Target (6 months) |
|---|---|---|
| Chrome Web Store installs | 5,000 | 25,000 |
| Registered users | 3,000 | 15,000 |
| Blend cards shared on X | 500 | 5,000 |

### Engagement

| Metric | Target |
|---|---|
| D7 retention | > 40% |
| D30 retention | > 25% |
| Bookmarks saved per active user per week | > 5 |
| Search queries per active user per week | > 3 |
| Blends created per month (total) | > 1,000 (month 3) |

### Revenue

| Metric | Target (6 months) |
|---|---|
| Free → Pro conversion rate | > 5% |
| Monthly Recurring Revenue (MRR) | $5,000 |
| LTD revenue (launch) | $10,000-20,000 |
| Churn rate (monthly) | < 8% |

---

## 7. Competitive Landscape

| Feature | HelloAgain | Dewey ($10/mo) | Tweetsmash ($14/mo) | Twillot (Free) | Raindrop.io |
|---|---|---|---|---|---|
| Bookmark import | ✅ | ✅ | ✅ | ✅ | ✅ |
| Search | ✅ AI-powered | ✅ Basic | ✅ Basic | ✅ Local | ✅ Full-text |
| Auto-tagging (AI) | ✅ Grok | ✅ Basic AI | ❌ | ❌ | ❌ |
| Folders/Tags | ✅ | ✅ | ❌ | ✅ | ✅ |
| Social features | ✅ Blend, Boards | ❌ (view-only sharing) | ❌ | ❌ | Basic shared collections |
| Viral/shareable artifacts | ✅ Blend cards | ❌ | ❌ | ❌ | ❌ |
| X-native AI (Grok) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Collaborative curation | ✅ Signal Boards | ❌ | ❌ | ❌ | Basic |
| Collective intelligence | ✅ The Pulse | ❌ | ❌ | ❌ | ❌ |
| Free tier | ✅ 500 bookmarks | ❌ | ❌ | ✅ Unlimited | ✅ Limited |

**Key insight from strategy research:** Every competitor is a single-player tool. Social features that failed elsewhere (Pocket, Matter) did so because they bolted on "social network" mechanics. HelloAgain's social features are different — they amplify the core utility (Blend = discover through comparison, Signal Boards = research together, Pulse = collective intelligence). See `SOCIAL_FEATURES_STRATEGY.md` for detailed competitive analysis and lessons from Pocket, Matter, Are.na, Pinterest, and Spotify Blend.

---

## 8. Monetization Model

### Pricing Tiers

| | Free | Pro ($9/month) |
|---|---|---|
| Bookmarks | 500 | Unlimited |
| Search | Basic keyword | AI-powered natural language |
| Auto-tagging | ❌ | ✅ |
| Folders & Tags | 5 folders | Unlimited |
| Bookmark Blend | 1/month | Unlimited |
| Blend Feed | ❌ | ✅ |
| AI Summaries | ❌ | ✅ |
| Related Content | ❌ | ✅ |
| Export | CSV only | CSV + JSON + API |
| Signal Boards (Phase 4) | 1 board, 3 members | Unlimited, 8 members |
| The Pulse (Phase 5) | Basic "Also Bookmarked" | Full dashboard + alerts |

### Launch Special: Lifetime Deal (LTD)

- **Price:** $79 one-time (equivalent to ~9 months of Pro)
- **What you get:** Pro features for life
- **Limited to:** First 500 buyers
- **Platform:** AppSumo or direct via Stripe
- **Purpose:** Fund initial development, build early user base, generate social proof

### Revenue Projections (Conservative)

| Month | Free Users | Pro Users | LTD Buyers | MRR | Total Revenue |
|---|---|---|---|---|---|
| 1 (Launch) | 500 | 25 | 100 | $225 | $8,125 |
| 3 | 2,000 | 100 | 200 | $900 | $16,700 |
| 6 | 8,000 | 400 | 300 | $3,600 | $27,300 |

---

## 9. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| X API changes break bookmark import | Medium | High | Build resilient scraping fallback; cache bookmark data locally |
| Grok API pricing increases | Medium | Medium | Abstract AI layer to allow fallback to other LLMs; cache results aggressively |
| Low viral uptake of Blend cards | Medium | High | A/B test card designs; optimize for X's image card preview; seed with influencers |
| Chrome Web Store rejection | Low | High | Strict MV3 compliance; minimal permissions; clear privacy policy |
| Competitor copies social features | Medium | Low | Speed to market + network effects create moat; Grok API access is unique |
| Privacy backlash on social features | Low | High | Explicit opt-in for everything; clear data handling docs; no individual data exposure |

---

## 10. Out of Scope (Post-MVP)

- Firefox extension
- Mobile app (iOS/Android)
- Signal Boards (Phase 4)
- The Pulse (Phase 5)
- Community Knowledge Graphs (Phase 6)
- Browser-agnostic web clipper
- Non-X platform support (Bluesky, Mastodon, Reddit)

---

## Appendix: Key Decisions Log

| Decision | Rationale | Date |
|---|---|---|
| Grok over OpenAI/Claude for AI | X-native `x_search()` and Collections API; no competitor has this | 2026-02-07 |
| Supabase over Firebase | PostgreSQL + pgvector for embeddings; RLS; better for relational data | 2026-02-07 |
| $9/mo over $5/mo for Pro | Dewey charges $10, Tweetsmash $14; $9 is competitive while sustainable | 2026-02-07 |
| Blend as first social feature | Highest virality, lowest effort; Spotify Blend precedent validates the concept | 2026-02-07 |
| 500 bookmark free limit | Generous enough to be useful; creates natural upgrade pressure for power users | 2026-02-07 |
