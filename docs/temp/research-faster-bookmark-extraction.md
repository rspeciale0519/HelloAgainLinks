# Research: Faster X.com Bookmark Extraction Methods

**Date:** 2026-03-29
**Context:** HAL currently uses a browser-based auto-scroll scraper (`bulk-import.ts`) that navigates to `x.com/i/bookmarks`, scrolls down, parses DOM articles, and sends batches to the HAL API. This is slow for users with many bookmarks (1500ms per scroll, ~25 tweets per batch).

---

## 1. X/Twitter API v2 Bookmarks Endpoint

### Does it exist?
Yes. The official endpoint is `GET /2/users/:id/bookmarks`.

### Access level required
- **Free tier:** Does NOT include bookmarks access.
- **Basic tier:** $200/month (was $100/month, raised in late 2024). Includes bookmarks.
- **Pro tier:** $5,000/month. Includes bookmarks.
- **Pay-per-use (launched Feb 2026):** Credit-based consumption model. Bookmarks endpoint has itemized pricing. You buy credits upfront in the Developer Console and are charged per request. Capped at 2M post reads/month.

### Rate limits
- **GET bookmarks:** 180 requests per 15-minute window (user rate limit).
- **Max per request:** Returns up to 800 of your most recent bookmarked posts (with pagination via cursors, `max_results` parameter allows up to 100 per page).

### Authentication
- Requires **OAuth 2.0 Authorization Code Flow with PKCE** (user context).
- Scopes needed: `tweet.read`, `users.read`, `bookmark.read`.

### Verdict
- **Cost:** NOT FREE. Minimum $200/month (Basic) or pay-per-use credits.
- **Speed:** Very fast. 180 requests/15min with 100 items/request = up to 18,000 bookmarks in 15 minutes.
- **Blocking risk:** Low (official API).
- **Complexity:** Medium (OAuth 2.0 PKCE flow, developer app registration).
- **Limit:** Only returns 800 most recent bookmarks via official API.

---

## 2. Firecrawl

### Can it scrape X.com bookmarks?
**No.** Firecrawl actively blocks social media scraping across major platforms (Instagram, YouTube, TikTok). While X.com is not explicitly named in every source, the pattern of blocking major social media platforms means X.com is very likely blocked or will return errors.

### Authentication support
Firecrawl can save and reuse browser state (cookies, localStorage) for authenticated scraping of general websites, but this would not help with restricted social media platforms.

### Verdict
- **Cost:** Free tier available (500 credits/month), but irrelevant.
- **Speed:** N/A.
- **X.com compatibility:** Blocked.
- **Complexity:** N/A.

---

## 3. Other Scraping Tools/Services

### Crawlee (by Apify, open-source)
- **What:** Open-source web scraping and browser automation library (Node.js + Python). Works with Puppeteer, Playwright, Cheerio. Supports headful/headless mode.
- **Cost:** Free and open-source forever.
- **X.com compatibility:** Has auto-generated headers, TLS fingerprint randomization, and proxy rotation. Some Twitter scrapers exist built on Crawlee. However, X.com's aggressive anti-scraping (Cloudflare WAF, guest token binding, doc_id rotation) makes it fragile.
- **Speed:** Depends on implementation. Supports parallel scraping with configurable concurrency.
- **Complexity:** High. Must handle authentication, anti-bot evasion, and constant maintenance as X rotates defenses.

### Apify (hosted platform)
- **Free tier:** $5/month in platform credits, 4GB actor RAM, 7-day data retention.
- **Twitter actors exist:** "Bookmarks Tweet API" actor available at $10/month (NOT free).
- **X.com compatibility:** Third-party actors that scrape X exist but require paid plans.
- **Speed:** Cloud-based, can be fast. But free tier credits run out quickly.
- **Verdict:** Free tier too limited for meaningful bookmark scraping. Paid actors start at $10/month.

### Browserless
- **Free tier:** 1,000 units/month ("Free Forever" tier). Very limited.
- **What:** Cloud-based headless browser platform (Chromium, Firefox, WebKit) with stealth, CAPTCHA solving, IP rotation.
- **X.com compatibility:** Works by running a real browser and scraping rendered DOM. Subject to X's anti-bot detection.
- **Speed:** Cloud browser instances, reasonable speed.
- **Verdict:** Free tier (1,000 units) insufficient for bulk scraping. Paid starts at $50/month. Legacy free tiers being retired.

### twscrape (Python, open-source)
- **What:** Python library using X's internal GraphQL API. Supports search, profiles, followers, tweets, and **bookmarks** (FetchBookmarks endpoint).
- **Cost:** FREE and open-source.
- **Speed:** Direct API calls without browser overhead. Very fast.
- **X.com compatibility:** Requires authenticated X accounts. Handles rate limiting automatically. Actively maintained (last release April 2025).
- **Complexity:** Medium. Need to provide X account credentials. Must handle doc_id rotation (library handles this automatically to some extent).
- **Risk:** Account suspension possible if detected. Cap recommended at ~500 tweets/day/account.

### twitter-api-client (Python, by trevorhobenshield)
- **What:** Full implementation of X/Twitter v1, v2, and GraphQL APIs.
- **Cost:** FREE and open-source.
- **Speed:** Direct HTTP calls, very fast. Batch endpoints available.
- **Authentication:** Cookie-based (auth_token + ct0). Username/password login unstable since Fall 2023.
- **Complexity:** Medium-high. Must extract cookies from browser.

### TweetXVault (by lhl)
- **What:** Archive tool for Twitter/X likes and bookmarks.
- **Cost:** FREE and open-source.
- **Speed:** Uses cookie extraction + direct API calls. Incremental sync.
- **How:** Extracts browser cookies automatically, calls X's internal APIs.

---

## 4. X.com's Internal/Undocumented GraphQL API

### Endpoint format
When you scroll the bookmarks page, X.com's React frontend makes GraphQL calls:

```
POST https://x.com/i/api/graphql/{query_id}/Bookmarks
```

### Request structure
- **query_id:** A rotating identifier (changes every 2-4 weeks).
- **variables:** JSON with `count` (typically 20), `cursor` (opaque pagination token), `seenTweetIds`.
- **features:** JSON with feature flags (e.g., `dont_mention_me_view_api_enabled`, etc.).

### Required headers
- `Authorization: Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D...` (hardcoded app bearer token)
- `x-csrf-token:` (must match the `ct0` cookie value)
- `Cookie: auth_token=...; ct0=...`
- `User-Agent:` (must look like a real browser)
- `Content-Type: application/json`

### Rate limits on internal endpoints
- Not officially documented, but community reports ~500 requests/day/account as a safe threshold.
- Guest tokens (unauthenticated) are severely limited and bind to browser fingerprints.
- Authenticated requests have higher limits but can trigger account locks if abusive.

### Key challenge: doc_id rotation
X rotates the `query_id` (doc_id) values every 2-4 weeks. Scrapers must update these regularly. Libraries like twscrape handle this automatically by extracting doc_ids from X's JavaScript bundles.

### Verdict
- **Cost:** FREE (uses user's own auth).
- **Speed:** Extremely fast. No browser overhead. Direct HTTP calls.
- **Blocking risk:** Medium-high. Account suspension possible. doc_id rotation requires maintenance.
- **Complexity:** High if building from scratch. Medium if using existing libraries (twscrape, twitter-api-client).

---

## 5. X.com's Anti-Scraping Measures

### Current defenses (2025-2026, rated 4/5 difficulty)
1. **Cloudflare WAF:** Aggressive IP reputation checks. Datacenter IPs permanently banned within seconds.
2. **Guest token binding:** Tokens bound to browser TLS fingerprints since Jan 2025.
3. **doc_id rotation:** GraphQL operation identifiers change every 2-4 weeks.
4. **TLS fingerprinting:** Detects headless browsers and non-standard TLS stacks.
5. **Rate limiting:** Per-user, per-IP, per-session limits. Shift periodically.
6. **Login wall:** Most data requires authentication.
7. **puppeteer-stealth detection:** As of Feb 2025, puppeteer-extra-stealth is no longer actively maintained and Cloudflare has updated detection for it.

### What this means for HAL
- Browser automation (Puppeteer/Playwright) is increasingly difficult.
- Residential proxies are essential for any non-browser approach.
- Direct API calls with real user cookies are the most reliable method.
- The extension-based approach (running in the user's real browser) is actually one of the MOST resilient approaches because it uses a real browser session with real cookies.

---

## 6. Browser Extension Approach (Network Interception)

### Concept
Instead of scraping the DOM (current approach), intercept the actual GraphQL API responses that X.com makes when loading bookmarks. The data comes back as structured JSON, which is far richer and faster to process than DOM parsing.

### How it works technically

**Option A: XMLHttpRequest/Fetch monkey-patching (content script injection)**
- Inject a script that overrides `XMLHttpRequest.prototype.open` and/or `window.fetch`.
- Intercept responses matching the Bookmarks GraphQL endpoint.
- Parse the JSON response directly (contains full tweet data, author info, media URLs, timestamps).
- No DOM parsing needed.
- **Proven approach:** `twitter-web-exporter` by prinsss uses exactly this technique as a Tampermonkey userscript.

**Option B: chrome.webRequest API**
- The webRequest API can intercept requests but **cannot read response bodies** (Chrome limitation).
- Not suitable for capturing bookmark data.

**Option C: chrome.devtools.network API**
- Can read response bodies via `request.getContent()`.
- **Requires DevTools to be open** at all times. Not practical for users.

**Option D: chrome.debugger API**
- Can attach to tabs and intercept network traffic including response bodies.
- Requires `debugger` permission. Shows a warning banner "Extension is debugging this browser."
- Intrusive UX but technically works.

### Recommended: Option A (fetch/XHR interception)
- **How twitter-web-exporter does it:** Installs a network interceptor that captures GraphQL responses initiated by the Twitter web app. The script itself does NOT send any requests to Twitter's API. It piggybacks on the requests X.com's own frontend makes.
- **No 800-bookmark limit:** Unlike the official API, the internal GraphQL endpoint returns all bookmarks (paginated, but no artificial cap).
- **No developer account needed.**
- **No API costs.**
- **Data is already structured JSON** -- no DOM parsing, no brittle CSS selectors.

### Existing extensions doing this
- **twitter-web-exporter (prinsss):** Open-source userscript. Intercepts GraphQL responses. Exports bookmarks, tweets, lists. Free.
- **Twillot:** Chrome extension. Syncs bookmarks locally. Has folder management. Free with premium features.
- **bookmark-export (sahil-lalani):** Simple Chrome extension that exports bookmarks to JSON.
- **Export Twitter Bookmarks:** Chrome Web Store extension.
- **Dewey:** Chrome extension with "Grab Bookmarks" button.

### Verdict
- **Cost:** FREE.
- **Speed:** As fast as X.com loads data. No additional network requests. Each GraphQL response contains ~20 tweets of rich structured data.
- **Blocking risk:** ZERO additional risk. Uses the user's own authenticated session. X.com cannot distinguish this from normal browsing.
- **Complexity:** Medium. Need to inject a content script that monkey-patches fetch/XHR.

---

## 7. Parallel/Concurrent Approaches

### Current bottleneck
HAL's `bulk-import.ts` scrolls 800px, waits 1500ms, scrapes DOM, sends batch. This is sequential and slow.

### Speedup strategies

**A. Network interception eliminates DOM wait**
If we intercept GraphQL responses (approach #6), we get data as soon as X delivers it. No need to wait for DOM rendering or parse HTML. This alone could be 2-5x faster.

**B. Trigger faster pagination programmatically**
Instead of scrolling, we could programmatically trigger the next page of bookmarks by calling X's internal API directly from the extension (using the user's cookies). This avoids scroll-wait cycles entirely.

**C. Parallel page fetching is NOT recommended**
X rate-limits per authenticated user. Making multiple concurrent bookmark requests from the same account risks triggering rate limits or account locks. Sequential pagination with fast turnaround is the optimal approach.

**D. Reduce batch processing overhead**
- Increase batch size from 25 to 50-100.
- Use streaming/pipeline approach: process batches while the next page is being fetched.
- Skip duplicate checking on the client; let the server handle 409s.

**E. Use cursor-based pagination directly**
If we intercept the GraphQL response, we get the pagination cursor. We can immediately fire the next request with that cursor, rather than waiting for scrolling to trigger it.

### Verdict
The biggest win is switching from DOM-scraping-after-scrolling to network-interception (or direct API calls). Parallelism within a single account is limited by X's rate limits.

---

## 8. Cookie/Session-Based Direct API Calls

### Can we use auth cookies to make direct fetch calls?
**Yes.** This is exactly how twscrape, twitter-api-client, and TweetXVault work.

### Required tokens
1. **auth_token** cookie: The main session cookie.
2. **ct0** cookie: The CSRF token. Must also be sent as `x-csrf-token` header (they must match).
3. **Bearer token**: A hardcoded app-level bearer token embedded in X's JavaScript bundles (rarely changes).

### How to obtain them
- From the extension: The extension already has `host_permissions` for `x.com`. It can read cookies via `chrome.cookies.get()`.
- The ct0 and auth_token cookies are accessible to the extension.

### Direct fetch example (conceptual)
```javascript
const response = await fetch('https://x.com/i/api/graphql/{query_id}/Bookmarks', {
  method: 'GET', // or POST depending on the endpoint
  headers: {
    'Authorization': 'Bearer AAAA...', // hardcoded app bearer
    'x-csrf-token': ct0Value,
    'Content-Type': 'application/json',
  },
  credentials: 'include', // sends cookies
});
const data = await response.json();
// data contains full bookmark data as structured JSON
```

### Challenges
1. **query_id rotation:** Must be updated every 2-4 weeks. Can be extracted from X's main JS bundle.
2. **Feature flags:** The `features` parameter in GraphQL requests changes periodically.
3. **Rate limits:** ~180 requests per 15 minutes for authenticated users (estimated from official API limits).
4. **CORS:** Direct fetch from extension background script works (no CORS restrictions for extensions with host permissions).

### Verdict
- **Cost:** FREE.
- **Speed:** Fastest possible. Direct HTTP calls, no browser rendering, no DOM parsing. Could fetch 100 bookmarks per request, paginate through thousands in seconds.
- **Blocking risk:** Low-medium. Uses real user session. But making requests outside the normal web app flow could theoretically be detected via request pattern analysis.
- **Complexity:** Medium-high. Must handle query_id extraction, feature flag updates, and pagination cursor management.

---

## Summary Comparison

| Method | Cost | Speed | Blocking Risk | Complexity | Bookmark Limit |
|--------|------|-------|---------------|------------|----------------|
| Current (DOM scraping + scroll) | Free | Slow | None | Low (done) | Unlimited |
| Official API v2 | $200+/mo | Very fast | None | Medium | 800 most recent |
| Firecrawl | N/A | N/A | Blocked | N/A | N/A |
| Crawlee/Playwright | Free | Medium | High | High | Unlimited |
| Apify actors | $10+/mo | Fast | Medium | Low | Varies |
| Browserless | $50+/mo | Medium | Medium | Medium | Unlimited |
| twscrape (Python) | Free | Very fast | Medium-High | Medium | Unlimited |
| **Network interception (ext)** | **Free** | **Fast** | **None** | **Medium** | **Unlimited** |
| **Direct API from extension** | **Free** | **Fastest** | **Low-Med** | **Med-High** | **Unlimited** |

---

## Recommended Approach for HAL

### Best option: Hybrid Network Interception + Direct API

**Phase 1 (Quick Win): Intercept GraphQL responses**
- Modify the content script to monkey-patch `fetch`/`XMLHttpRequest`.
- When user scrolls bookmarks page (or during bulk import), capture the GraphQL Bookmarks responses.
- Parse the structured JSON directly instead of scraping DOM.
- This gives us richer data (full tweet metadata) with zero additional network requests.
- Eliminates DOM parsing brittleness.
- Still requires scrolling but processing is instant.

**Phase 2 (Maximum Speed): Direct API pagination from extension**
- Use `chrome.cookies.get()` to read auth_token and ct0.
- Extract the current query_id from X's JS bundle (one-time fetch + regex).
- Make direct `fetch()` calls from the extension's background script to the Bookmarks GraphQL endpoint.
- Paginate using cursors from each response.
- No scrolling, no DOM, no visible browser activity needed.
- Could import 1000+ bookmarks in under 30 seconds.

**Phase 3 (Resilience): Fallback chain**
- Try direct API first (fastest).
- If it fails (query_id changed, rate limited), fall back to network interception.
- If that fails, fall back to current DOM scraping approach.

### Why NOT the official API v2
- Costs $200+/month minimum.
- Only returns 800 most recent bookmarks.
- Requires complex OAuth 2.0 PKCE flow per user.
- HAL's user base would need to each set up API keys or HAL would need to pay for API access.

---

## Sources

- [X API Rate Limits](https://docs.x.com/x-api/fundamentals/rate-limits)
- [Bookmarks Introduction - X Developer Platform](https://developer.x.com/en/docs/x-api/tweets/bookmarks/introduction)
- [Bookmarks Integration Guide - X Developer Platform](https://developer.x.com/en/docs/x-api/tweets/bookmarks/integrate)
- [Get Bookmarks - X API Docs](https://docs.x.com/x-api/users/get-bookmarks)
- [X API Pricing](https://docs.x.com/x-api/getting-started/pricing)
- [X API pricing in 2026 - Postproxy](https://postproxy.dev/blog/x-api-pricing-2026/)
- [X API Pricing in 2026: Every Tier Explained](https://www.wearefounders.uk/the-x-api-price-hike-a-blow-to-indie-hackers/)
- [X API Pay-Per-Use Launch Announcement](https://devcommunity.x.com/t/announcing-the-launch-of-x-api-pay-per-use-pricing/256476)
- [Can I access Twitter bookmarks for free? - X Developers](https://devcommunity.x.com/t/can-i-access-twitter-bookmarks-for-development-purpose-for-free/221728)
- [How to fetch bookmarks with X API (Feb 2026)](https://gist.github.com/peterc/7f3d55d46c02f662e5a5e08e070954be)
- [Firecrawl Social Media Scraping Restrictions](https://scrapecreators.com/blog/firecrawl-s-social-media-scraping-restrictions-market-gap-or-strategic-decision)
- [Firecrawl GitHub Discussion #1362 - Social Media Scrapping](https://github.com/firecrawl/firecrawl/discussions/1362)
- [Crawlee - GitHub](https://github.com/apify/crawlee)
- [Apify Free Tier Pricing 2026](https://use-apify.com/docs/what-is-apify/apify-free-plan)
- [Browserless Pricing](https://www.browserless.io/pricing)
- [Browserless - Build Your Own Twitter Scraper](https://www.browserless.io/blog/twitter-scraper)
- [twscrape - GitHub](https://github.com/vladkens/twscrape)
- [twitter-api-client - GitHub](https://github.com/trevorhobenshield/twitter-api-client)
- [TweetXVault - GitHub](https://github.com/lhl/tweetxvault/)
- [twitter-web-exporter - GitHub](https://github.com/prinsss/twitter-web-exporter)
- [twitter-web-exporter on Greasy Fork](https://greasyfork.org/en/scripts/492218-twitter-web-exporter)
- [bookmark-export by sahil-lalani - GitHub](https://github.com/sahil-lalani/bookmark-export)
- [Twillot - GitHub](https://github.com/twillot-app/twillot)
- [How to Scrape X.com in 2026 - Scrapfly](https://scrapfly.io/blog/posts/how-to-scrape-twitter)
- [Overcoming Twitter/X Scraping Challenges in 2025](https://apiscrapy.com/twitter-x-scraping-challenges/)
- [Scrape X.com in 2025: The No-Maintenance Way](https://sites.google.com/view/alexwritesthings/scrape-x-com-twitter-in-2025-the-no-maintenance-way)
- [Twitter Undocumented Bookmark Endpoints (deprecated gist)](https://gist.github.com/stepney141/c161a83f02c42e161c905249733b9225)
- [Twitter Undocumented Bookmark Endpoints (WIP gist)](https://gist.github.com/igorbrigadir/de2a6cf16dfcdd4506816ef9a89aaa18)
- [Intercepting Network Response Body with Chrome Extension](https://medium.com/@ddamico.125/intercepting-network-response-body-with-a-chrome-extension-b5b9f2ef9466)
- [Chrome Extension: Reading HTTP Response Body](https://betterprogramming.pub/chrome-extension-intercepting-and-reading-the-body-of-http-requests-dd9ebdf2348b)
- [chrome.webRequest API Reference](https://developer.chrome.com/docs/extensions/reference/api/webRequest)
- [Capturing AJAX Requests with Chrome Extension - Moesif](https://www.moesif.com/blog/technical/apirequest/How-We-Captured-AJAX-Requests-with-a-Chrome-Extension/)
- [Intercepting Network Requests in Chrome Extensions](https://rxliuli.com/blog/intercepting-network-requests-in-chrome-extensions/)
- [API Design of X Home Timeline](https://trekhleb.dev/blog/2024/api-design-x-home-timeline/)
- [Crawlee Parallel Scraping Guide](https://crawlee.dev/js/docs/guides/parallel-scraping)
- [Speed Up Web Scraping with Concurrency - ZenRows](https://www.zenrows.com/blog/speed-up-web-scraping-with-concurrency-in-python)
