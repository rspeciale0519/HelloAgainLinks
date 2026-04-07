# X API v2 — Bookmarks Reference

> **Source:** Scraped from [docs.x.com/x-api/overview](https://docs.x.com/x-api/overview) and sub-pages on 2026-04-05.
> This document consolidates everything HAL needs to interact with the X API v2 Bookmarks endpoints, including authentication, scopes, rate limits, pagination, fields/expansions, the full data dictionary for returned objects, and end-to-end integration flows.
>
> **Scraping note:** `docs.x.com` is not supported by the Firecrawl MCP; content below was gathered via `WebFetch` + `WebSearch` against the same public documentation pages.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Base URL & API Version](#2-base-url--api-version)
3. [Authentication (OAuth 2.0 PKCE)](#3-authentication-oauth-20-pkce)
4. [Required Scopes](#4-required-scopes)
5. [Endpoint Catalog](#5-endpoint-catalog)
6. [Endpoint Reference](#6-endpoint-reference)
   - [6.1 GET /2/users/:id/bookmarks](#61-get-2usersidbookmarks--list-bookmarks)
   - [6.2 POST /2/users/:id/bookmarks](#62-post-2usersidbookmarks--create-bookmark)
   - [6.3 DELETE /2/users/:id/bookmarks/:tweet_id](#63-delete-2usersidbookmarkstweet_id--delete-bookmark)
   - [6.4 GET /2/users/:id/bookmarks/folders](#64-get-2usersidbookmarksfolders--list-bookmark-folders)
   - [6.5 GET /2/users/:id/bookmarks/folders/:folder_id](#65-get-2usersidbookmarksfoldersfolder_id--list-posts-in-folder)
7. [Rate Limits](#7-rate-limits)
8. [Pagination](#8-pagination)
9. [Fields Parameters](#9-fields-parameters)
10. [Expansions](#10-expansions)
11. [Data Dictionary](#11-data-dictionary)
12. [Error Model](#12-error-model)
13. [Hard Limits & Caveats](#13-hard-limits--caveats)
14. [End-to-End Integration Flow](#14-end-to-end-integration-flow)
15. [Reference Links](#15-reference-links)

---

## 1. Overview

The **Bookmarks** endpoints let the authenticated user view, add, and remove bookmarked Posts, and list their Bookmark folders.

Key properties from the docs:

- **Bookmarks are private** and only visible to the user who created them.
- All bookmark endpoints act on behalf of **the authenticated user** — the `:id` path parameter **must match** the authenticated user's numeric X ID.
- Authentication is **OAuth 2.0 Authorization Code Flow with PKCE** (app-only Bearer Tokens do **not** work on bookmark endpoints).
- The GET bookmarks endpoint returns **up to 800 most recent** bookmarked Posts.

Capabilities exposed by the API:

1. Retrieve a paginated list of the authenticated user's bookmarks.
2. Add a Post to the authenticated user's bookmarks.
3. Remove a Post from the authenticated user's bookmarks.
4. List the authenticated user's bookmark folders.
5. Retrieve Posts inside a specific bookmark folder.

---

## 2. Base URL & API Version

| | |
|---|---|
| **Base URL** | `https://api.x.com` |
| **Version prefix** | `/2` |
| **Full base** | `https://api.x.com/2` |

All endpoints in this doc are relative to `https://api.x.com/2`.

---

## 3. Authentication (OAuth 2.0 PKCE)

Bookmark endpoints are **user-context** only. You must obtain a **User Access Token** via OAuth 2.0 Authorization Code Flow with **PKCE**. App-only Bearer Tokens will return `403 client-forbidden`.

### 3.1 Client Types

| Client type | Examples | Credential model |
|---|---|---|
| **Confidential** | Web App, Automated App / Bot | Client ID + Client Secret (Basic auth header) + PKCE |
| **Public** | Native App, Single-Page App | Client ID + PKCE only (no Secret) |

### 3.2 Supported Grant Types

Only two grant types are supported on the X v2 OAuth2 endpoint:

- `authorization_code` (with PKCE)
- `refresh_token`

### 3.3 Token Lifetimes

- **Access token:** ~2 hours.
- **Refresh token:** issued only when the `offline.access` scope is requested at authorize time. Use it to mint new access tokens without user re-auth.

### 3.4 Step-by-Step Flow

#### Step 1 — Build the authorize URL

```
https://x.com/i/oauth2/authorize
  ?response_type=code
  &client_id=YOUR_CLIENT_ID
  &redirect_uri=https://your.app/callback
  &scope=tweet.read%20users.read%20bookmark.read%20bookmark.write%20offline.access
  &state=RANDOM_CSRF_STRING
  &code_challenge=CHALLENGE
  &code_challenge_method=S256
```

Parameters:

| Param | Required | Notes |
|---|---|---|
| `response_type` | Yes | Must be `code`. |
| `client_id` | Yes | From Developer Console. |
| `redirect_uri` | Yes | Must exactly match a whitelisted callback URL on the App (protocol, host, path, trailing slash). Max 10 URLs per App. HTTPS required in prod; `http://127.0.0.1` allowed for local dev. |
| `scope` | Yes | Space-separated list. See [section 4](#4-required-scopes). |
| `state` | Yes | CSRF token, up to 500 chars. Verify on callback. |
| `code_challenge` | Yes | PKCE challenge derived from a locally stored `code_verifier`. |
| `code_challenge_method` | Yes | `S256` (recommended) or `plain`. |

#### Step 2 — Handle the redirect

X redirects the user back to `redirect_uri` with `state` and `code`:

```
https://your.app/callback?state=RANDOM_CSRF_STRING&code=AUTHORIZATION_CODE
```

Verify `state` matches the value you originally sent.

#### Step 3 — Exchange code for tokens

`POST https://api.x.com/2/oauth2/token`

**Public client (PKCE only):**

```bash
curl --location --request POST 'https://api.x.com/2/oauth2/token' \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'code=AUTHORIZATION_CODE' \
  --data-urlencode 'grant_type=authorization_code' \
  --data-urlencode 'client_id=YOUR_CLIENT_ID' \
  --data-urlencode 'redirect_uri=https://your.app/callback' \
  --data-urlencode 'code_verifier=YOUR_CODE_VERIFIER'
```

**Confidential client (adds Basic auth):**

```bash
curl --location --request POST 'https://api.x.com/2/oauth2/token' \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --header 'Authorization: Basic BASE64(CLIENT_ID:CLIENT_SECRET)' \
  --data-urlencode 'code=AUTHORIZATION_CODE' \
  --data-urlencode 'grant_type=authorization_code' \
  --data-urlencode 'redirect_uri=https://your.app/callback' \
  --data-urlencode 'code_verifier=YOUR_CODE_VERIFIER'
```

Successful response:

```json
{
  "token_type": "bearer",
  "expires_in": 7200,
  "access_token": "...",
  "scope": "tweet.read users.read bookmark.read bookmark.write offline.access",
  "refresh_token": "..."
}
```

#### Step 4 — Call the API

```bash
curl --location --request GET 'https://api.x.com/2/users/me' \
  --header 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

#### Step 5 — Refresh the access token (if `offline.access` was requested)

**Public client:**

```bash
curl --location --request POST 'https://api.x.com/2/oauth2/token' \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'refresh_token=YOUR_REFRESH_TOKEN' \
  --data-urlencode 'grant_type=refresh_token' \
  --data-urlencode 'client_id=YOUR_CLIENT_ID'
```

**Confidential client:**

```bash
curl --location --request POST 'https://api.x.com/2/oauth2/token' \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --header 'Authorization: Basic BASE64(CLIENT_ID:CLIENT_SECRET)' \
  --data-urlencode 'refresh_token=YOUR_REFRESH_TOKEN' \
  --data-urlencode 'grant_type=refresh_token'
```

#### Step 6 — Revoke a token (logout)

```bash
curl --location --request POST 'https://api.x.com/2/oauth2/revoke' \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'token=YOUR_TOKEN' \
  --data-urlencode 'client_id=YOUR_CLIENT_ID'
```

---

## 4. Required Scopes

Each bookmark endpoint requires these OAuth 2.0 scopes:

| Action | Required scopes |
|---|---|
| List bookmarks (GET) | `bookmark.read`, `tweet.read`, `users.read` |
| List bookmark folders (GET) | `bookmark.read`, `users.read` |
| Get posts in a folder (GET) | `bookmark.read`, `tweet.read`, `users.read` |
| Add bookmark (POST) | `bookmark.write`, `tweet.read`, `users.read` |
| Delete bookmark (DELETE) | `bookmark.write`, `tweet.read`, `users.read` |

Other scopes commonly combined with the above:

| Scope | Purpose |
|---|---|
| `offline.access` | Issues a refresh token so HAL can keep syncing without re-auth every ~2 hours. **Strongly recommended.** |
| `tweet.read` | View any Post the user can see, including from protected accounts they follow. |
| `users.read` | View any account the user can see (needed for author expansion). |

**Minimum recommended scope set for HAL (full bookmark management + background sync):**

```
tweet.read users.read bookmark.read bookmark.write offline.access
```

---

## 5. Endpoint Catalog

| Method | Path | Purpose | Operation ID |
|---|---|---|---|
| GET | `/2/users/:id/bookmarks` | List authenticated user's bookmarked Posts | `getUsersBookmarks` |
| POST | `/2/users/:id/bookmarks` | Add a Post to the authenticated user's bookmarks | — |
| DELETE | `/2/users/:id/bookmarks/:tweet_id` | Remove a Post from the authenticated user's bookmarks | — |
| GET | `/2/users/:id/bookmarks/folders` | List the authenticated user's bookmark folders | — |
| GET | `/2/users/:id/bookmarks/folders/:folder_id` | List Posts inside a specific bookmark folder | — |

> `:id` must equal the authenticated user's numeric ID. Fetch it once via `GET /2/users/me` and cache it on the account record.

---

## 6. Endpoint Reference

### 6.1 `GET /2/users/:id/bookmarks` — List Bookmarks

**Full URL:** `https://api.x.com/2/users/{id}/bookmarks`
**Auth:** OAuth 2.0 User Token — scopes `bookmark.read`, `tweet.read`, `users.read`.

#### Path parameters

| Name | Type | Required | Notes |
|---|---|---|---|
| `id` | string | Yes | Numeric X user ID of the authenticated user. Pattern: `^[0-9]{1,19}$`. Must match the token's user. |

#### Query parameters

| Name | Type | Required | Notes |
|---|---|---|---|
| `max_results` | integer | No | 1–100. Recommend 100 to minimize calls. |
| `pagination_token` | string | No | Opaque base36 token from `meta.next_token` of a previous response. |
| `tweet.fields` | CSV | No | See [§9.1](#91-tweetfields). |
| `expansions` | CSV | No | See [§10](#10-expansions). |
| `media.fields` | CSV | No | Only returned when combined with `expansions=attachments.media_keys`. |
| `poll.fields` | CSV | No | Only returned when combined with `expansions=attachments.poll_ids`. |
| `user.fields` | CSV | No | Only returned when combined with an expansion that surfaces User objects (`author_id`, etc.). |
| `place.fields` | CSV | No | Only returned when combined with `expansions=geo.place_id`. |

#### Example request

```bash
curl --location --request GET \
  "https://api.x.com/2/users/2244994945/bookmarks?max_results=100&tweet.fields=created_at,public_metrics,author_id,entities,attachments&expansions=author_id,attachments.media_keys&user.fields=username,verified,profile_image_url&media.fields=url,preview_image_url,type,alt_text" \
  --header 'Authorization: Bearer USER_ACCESS_TOKEN'
```

#### Example 200 response

```json
{
  "data": [
    {
      "id": "1346889436626259968",
      "text": "Learn how to use the user Tweet timeline and user mention timeline endpoints in the X API v2 to explore Tweet…",
      "author_id": "2244994945",
      "created_at": "2021-01-06T18:40:40.000Z",
      "public_metrics": {
        "retweet_count": 0,
        "reply_count": 0,
        "like_count": 0,
        "impression_count": 0,
        "bookmark_count": 0
      }
    }
  ],
  "includes": {
    "users": [
      {
        "id": "2244994945",
        "name": "X Dev",
        "username": "TwitterDev",
        "created_at": "2013-12-14T04:35:55Z"
      }
    ]
  },
  "meta": {
    "result_count": 1,
    "next_token": "7140dibdnow9c7btw3z2vq2n2b9v6k9nhofgqj3l5yk8n"
  }
}
```

#### Hard cap

Returns at most **800 most-recent** bookmarked Posts, paginated.

---

### 6.2 `POST /2/users/:id/bookmarks` — Create Bookmark

**Full URL:** `https://api.x.com/2/users/{id}/bookmarks`
**Auth:** OAuth 2.0 User Token — scopes `bookmark.write`, `tweet.read`, `users.read`.
**Content-Type:** `application/json`

#### Path parameters

| Name | Type | Required | Notes |
|---|---|---|---|
| `id` | string | Yes | Numeric X user ID; must equal the authenticated user. |

#### Request body

```json
{ "tweet_id": "1346889436626259968" }
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `tweet_id` | string | Yes | Post (Tweet) ID. Pattern: `^[0-9]{1,19}$`. |

#### Example request

```bash
curl --location --request POST \
  'https://api.x.com/2/users/2244994945/bookmarks' \
  --header 'Authorization: Bearer USER_ACCESS_TOKEN' \
  --header 'Content-Type: application/json' \
  --data-raw '{"tweet_id": "1460323737035677698"}'
```

#### Example 200 response

```json
{ "data": { "bookmarked": true } }
```

---

### 6.3 `DELETE /2/users/:id/bookmarks/:tweet_id` — Delete Bookmark

**Full URL:** `https://api.x.com/2/users/{id}/bookmarks/{tweet_id}`
**Auth:** OAuth 2.0 User Token — scopes `bookmark.write`, `tweet.read`, `users.read`.

#### Path parameters

| Name | Type | Required | Notes |
|---|---|---|---|
| `id` | string | Yes | Numeric X user ID; must equal the authenticated user. |
| `tweet_id` | string | Yes | Post ID to unbookmark. Pattern: `^[0-9]{1,19}$`. |

#### Example request

```bash
curl --location --request DELETE \
  'https://api.x.com/2/users/2244994945/bookmarks/1460323737035677698' \
  --header 'Authorization: Bearer USER_ACCESS_TOKEN'
```

#### Example 200 response

```json
{ "data": { "bookmarked": false } }
```

---

### 6.4 `GET /2/users/:id/bookmarks/folders` — List Bookmark Folders

**Full URL:** `https://api.x.com/2/users/{id}/bookmarks/folders`
**Auth:** OAuth 2.0 User Token — scopes `bookmark.read`, `users.read`.

#### Path parameters

| Name | Type | Required | Notes |
|---|---|---|---|
| `id` | string | Yes | Numeric X user ID; must equal the authenticated user. |

#### Query parameters

| Name | Type | Required | Notes |
|---|---|---|---|
| `max_results` | integer | No | 1–100. |
| `pagination_token` | string | No | Base36 token from previous `meta.next_token`. |

#### Example 200 response

```json
{
  "data": [
    { "id": "1146654567674912769", "name": "Reading list" }
  ],
  "meta": { "next_token": "..." }
}
```

| Field | Type | Notes |
|---|---|---|
| `data[].id` | string | Folder ID (1–19 digit numeric string). |
| `data[].name` | string | Folder display name. |
| `meta.next_token` | string | Pagination token; absent on last page. |

> The docs do **not** publicly document create / rename / delete folder endpoints for the X API v2. HAL can **list** folders and **read posts inside** a folder, but cannot manage folder membership via the API — users create folders in the X app UI.

---

### 6.5 `GET /2/users/:id/bookmarks/folders/:folder_id` — List Posts in Folder

**Full URL:** `https://api.x.com/2/users/{id}/bookmarks/folders/{folder_id}`
**Auth:** OAuth 2.0 User Token — scopes `bookmark.read`, `tweet.read`, `users.read`.

#### Path parameters

| Name | Type | Required | Notes |
|---|---|---|---|
| `id` | string | Yes | Authenticated user ID. |
| `folder_id` | string | Yes | Folder ID from the folders listing. |

Accepts the same `max_results`, `pagination_token`, `tweet.fields`, `user.fields`, `media.fields`, `poll.fields`, `place.fields`, and `expansions` query parameters as [§6.1](#61-get-2usersidbookmarks--list-bookmarks).

#### Response shape

Identical to `GET /2/users/:id/bookmarks` (array of Post objects under `data`, `includes` for expanded objects, `meta` with `result_count` and `next_token`).

---

## 7. Rate Limits

Limits are enforced per-endpoint, per-user (user-context) and/or per-app (app-only). All windows are **15 minutes** unless noted. Exceeding a limit returns `429 Too Many Requests`.

### 7.1 Bookmark endpoint limits

| Endpoint | Method | Per user (15 min) | Per app (15 min) |
|---|---|---|---|
| `/2/users/:id/bookmarks` | GET | **180** | — |
| `/2/users/:id/bookmarks` | POST | **50** | — |
| `/2/users/:id/bookmarks/:tweet_id` | DELETE | **50** | — |
| `/2/users/:id/bookmarks/folders` | GET | **50** | 50 |
| `/2/users/:id/bookmarks/folders/:folder_id` | GET | **50** | 50 |

Plus the hard cap: GET bookmarks returns at most the **800 most-recent** bookmarked Posts regardless of how many times you call it.

### 7.2 Response headers

Every response includes quota headers:

| Header | Meaning |
|---|---|
| `x-rate-limit-limit` | Max requests permitted in the current window. |
| `x-rate-limit-remaining` | Requests remaining in the current window. |
| `x-rate-limit-reset` | Unix epoch (seconds) when the window resets. |

Example:

```
x-rate-limit-limit: 180
x-rate-limit-remaining: 172
x-rate-limit-reset: 1705420800
```

### 7.3 429 response

```json
{
  "errors": [
    { "code": 88, "message": "Rate limit exceeded" }
  ]
}
```

**Recommended handling:**

1. Read `x-rate-limit-reset` and back off until that wall-clock time.
2. On repeated 429s (e.g. clock skew, burst traffic), layer exponential backoff + jitter.
3. Never retry blindly; it will simply re-hit the same window.

---

## 8. Pagination

All list endpoints paginate via opaque cursors in `meta`.

| Field | Location | Usage |
|---|---|---|
| `meta.result_count` | Response | Number of records in this page. |
| `meta.next_token` | Response | Absent on last page. |
| `meta.previous_token` | Response | Optional back-nav (supported on some endpoints). |
| `pagination_token` | Request query | Set to the `next_token` (or `previous_token`) to fetch adjacent page. |
| `max_results` | Request query | Per-page size (endpoint-specific max; 100 for bookmarks). |

**Rules:**

- Tokens are **opaque**. Do not parse, modify, or persist assumptions about their format.
- Tokens may expire — persist them only for active pagination, not indefinite resumption.
- Always request the maximum `max_results` you can tolerate to minimize request count against the 180/15 min limit.
- Data is returned in **reverse chronological order**.

### 8.1 Loop pattern (pseudo)

```ts
let pagination_token: string | undefined;
const all: Tweet[] = [];

do {
  const res = await fetch(buildUrl({ max_results: 100, pagination_token }), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await res.json();
  all.push(...(body.data ?? []));
  pagination_token = body.meta?.next_token;
} while (pagination_token);
```

---

## 9. Fields Parameters

Fields control **which attributes** are returned on each object. By default, a Post lookup returns only `id`, `text`, and `edit_history_tweet_ids`. You must explicitly request anything else.

**You cannot request sub-fields.** For example, requesting `public_metrics` returns the entire metrics object (likes, replies, retweets, quotes, bookmarks, impressions) — you cannot ask for just `like_count`.

### 9.1 `tweet.fields`

Common values (CSV):

```
attachments, author_id, card_uri, community_id, context_annotations,
conversation_id, created_at, edit_controls, edit_history_tweet_ids,
entities, geo, id, in_reply_to_user_id, lang, non_public_metrics,
note_tweet, organic_metrics, possibly_sensitive, promoted_metrics,
public_metrics, referenced_tweets, reply_settings, scopes, text,
withheld
```

> `non_public_metrics`, `organic_metrics`, and `promoted_metrics` require the **author** of the Post to be the authenticated user.

### 9.2 `user.fields`

```
affiliation, confirmed_email, connection_status, created_at, description,
entities, id, is_identity_verified, location, most_recent_tweet_id, name,
parody, pinned_tweet_id, profile_banner_url, profile_image_url, protected,
public_metrics, receives_your_dm, subscription, subscription_type, url,
username, verified, verified_followers_count, verified_type, withheld
```

### 9.3 `media.fields`

```
alt_text, duration_ms, height, media_key, non_public_metrics, organic_metrics,
preview_image_url, promoted_metrics, public_metrics, type, url, variants, width
```

### 9.4 `poll.fields`

```
duration_minutes, end_datetime, id, options, voting_status
```

### 9.5 `place.fields`

```
contained_within, country, country_code, full_name, geo, id, name, place_type
```

### 9.6 Recommended combo for HAL bookmark ingest

```
tweet.fields=created_at,public_metrics,author_id,entities,attachments,
             referenced_tweets,possibly_sensitive,lang,conversation_id,
             reply_settings,note_tweet,context_annotations
user.fields=id,name,username,verified,verified_type,profile_image_url,
            description,public_metrics,created_at
media.fields=media_key,type,url,preview_image_url,alt_text,width,height,
             duration_ms,variants
poll.fields=id,options,end_datetime,voting_status,duration_minutes
place.fields=id,full_name,country,country_code,place_type,geo
expansions=author_id,attachments.media_keys,attachments.poll_ids,
           referenced_tweets.id,referenced_tweets.id.author_id,
           in_reply_to_user_id,geo.place_id,entities.mentions.username
```

---

## 10. Expansions

Expansions hydrate related objects in a single response instead of forcing follow-up lookups. Expanded objects appear under `includes.{type}[]`, keyed by IDs referenced in `data`.

### 10.1 Post-level expansions

| Expansion | Populates |
|---|---|
| `author_id` | `includes.users[]` — author of the Post |
| `referenced_tweets.id` | `includes.tweets[]` — quoted / replied / retweeted Posts |
| `referenced_tweets.id.author_id` | `includes.users[]` — authors of referenced Posts |
| `in_reply_to_user_id` | `includes.users[]` — user being replied to |
| `attachments.media_keys` | `includes.media[]` — images, videos, GIFs |
| `attachments.poll_ids` | `includes.polls[]` — poll options and state |
| `geo.place_id` | `includes.places[]` — attached place object |
| `entities.mentions.username` | `includes.users[]` — mentioned users |
| `edit_history_tweet_ids` | `includes.tweets[]` — prior Post versions |

### 10.2 User-level

| Expansion | Populates |
|---|---|
| `pinned_tweet_id` | `includes.tweets[]` — pinned Post |

### 10.3 Combining

Chain expansions as a comma-separated list:

```
expansions=author_id,referenced_tweets.id,attachments.media_keys
```

Combine with `*.fields` parameters to request additional attributes on the expanded objects.

---

## 11. Data Dictionary

### 11.1 Post (Tweet) object

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier of the Post. |
| `text` | string | UTF-8 text of the Post. |
| `edit_history_tweet_ids` | string[] | IDs of every version of the Post. |
| `article` | object | Metadata for long-form articles in the Post. |
| `attachments` | object | Attached media keys / poll IDs. |
| `author_id` | string | ID of the authoring User. |
| `card_uri` | string | Card URI, if present. |
| `community_id` | string | Community this Post belongs to (if any). |
| `context_annotations` | array | X-generated topic/entity annotations. |
| `conversation_id` | string | ID of the root Post of the conversation. |
| `created_at` | ISO-8601 string | Creation timestamp. |
| `display_text_range` | [number, number] | Start/end index of displayable text. |
| `edit_controls` | object | Remaining edit window information. |
| `entities` | object | Parsed URLs, hashtags, mentions, cashtags. |
| `geo` | object | Attached place / coordinates. |
| `in_reply_to_user_id` | string | Author of the Post being replied to, if any. |
| `lang` | string | Detected BCP-47 language code. |
| `non_public_metrics` | object | Private metrics (self-author only). |
| `note_tweet` | object | Full text for long-form Posts. |
| `organic_metrics` | object | Organic-only engagement (self-author only). |
| `possibly_sensitive` | boolean | Sensitive-content flag. |
| `promoted_metrics` | object | Promoted engagement (self-author only). |
| `public_metrics` | object | `retweet_count`, `reply_count`, `like_count`, `quote_count`, `bookmark_count`, `impression_count`. |
| `referenced_tweets` | array | `{type: "retweeted" \| "quoted" \| "replied_to", id}`. |
| `reply_settings` | string | Who can reply (`everyone`, `mentioned_users`, `following`, `subscribers`, `verified`). |
| `withheld` | object | Country/scope withholding details. |
| `scopes` | object | Scope details for the Post. |
| `media_metadata` | array | Metadata for attached media. |

### 11.2 User object

| Field | Type | Description |
|---|---|---|
| `id` | string | User ID. |
| `name` | string | Display name. |
| `username` | string | `@handle`. |
| `affiliation` | object | Affiliation details. |
| `confirmed_email` | string | Confirmed email (self only). |
| `connection_status` | string[] | Relation to the authed user. |
| `created_at` | ISO-8601 | Account creation. |
| `description` | string | Bio text. |
| `entities` | object | Parsed entities in bio/url. |
| `is_identity_verified` | boolean | ID-verified flag. |
| `location` | string | Free-text location. |
| `most_recent_tweet_id` | string | Newest Post by this user. |
| `parody` | boolean | Parody-label flag. |
| `pinned_tweet_id` | string | Pinned Post ID. |
| `profile_banner_url` | string | Banner image URL. |
| `profile_image_url` | string | Avatar URL. |
| `protected` | boolean | Protected-account flag. |
| `public_metrics` | object | `followers_count`, `following_count`, `tweet_count`, `listed_count`, `like_count`. |
| `receives_your_dm` | boolean | Can DM flag. |
| `subscription` | object | X Premium subscription details. |
| `subscription_type` | string | Premium tier. |
| `url` | string | Profile URL. |
| `verified` | boolean | Verified flag. |
| `verified_followers_count` | string | Count of verified followers. |
| `verified_type` | string | Verification type. |
| `withheld` | object | Withholding info. |

### 11.3 Media object

| Field | Type | Description |
|---|---|---|
| `media_key` | string | Unique media identifier. |
| `type` | string | `animated_gif` \| `photo` \| `video`. |
| `url` | string | Direct media URL (photos). |
| `preview_image_url` | string | Still-frame preview (videos/gifs). |
| `duration_ms` | integer | Video duration. |
| `height` | integer | Pixel height. |
| `width` | integer | Pixel width. |
| `alt_text` | string | Accessibility description (up to 1000 chars). |
| `variants` | array | Playback/display variants. |
| `public_metrics` | object | Public media metrics (e.g. `view_count`). |
| `non_public_metrics` | object | Self-author metrics. |
| `organic_metrics` | object | Organic-context metrics (self-author). |
| `promoted_metrics` | object | Promoted-context metrics (self-author). |

### 11.4 Bookmark Folder object

| Field | Type | Description |
|---|---|---|
| `id` | string | Folder ID (numeric string). |
| `name` | string | Folder name. |

### 11.5 Response envelope

Every list endpoint returns:

```jsonc
{
  "data": [ /* primary objects */ ],
  "includes": {
    "users": [],
    "tweets": [],
    "media": [],
    "polls": [],
    "places": []
  },
  "meta": {
    "result_count": 100,
    "next_token": "...",
    "previous_token": "..."
  },
  "errors": [ /* partial errors if any */ ]
}
```

> `errors` in the envelope are **partial errors** (e.g. a referenced Post was deleted) — the 200 response may still contain valid `data`. Treat them as warnings, not failures.

---

## 12. Error Model

X API v2 returns two error shapes:

### 12.1 RFC 7807 Problem Details (most v2 endpoints)

```json
{
  "type": "https://api.x.com/2/problems/invalid-request",
  "title": "Invalid Request",
  "status": 400,
  "detail": "One or more parameters to your request was invalid."
}
```

Common `type` values:

| Type | Meaning |
|---|---|
| `invalid-request` | Malformed request, bad params, bad JSON body. |
| `resource-not-found` | User, Post, or folder doesn't exist / is inaccessible. |
| `not-authorized-for-resource` | Token lacks permission for that resource. |
| `client-forbidden` | Wrong auth type (e.g. Bearer on a user-context endpoint). |
| `disallowed-resource` | Endpoint requires a higher access tier. |

### 12.2 Legacy v1.1-style error

```json
{ "errors": [{ "code": 88, "message": "Rate limit exceeded" }] }
```

Used primarily for rate limit and a few legacy paths.

### 12.3 HTTP status cheat sheet

| Status | Typical cause | HAL behavior |
|---|---|---|
| `200` | Success (may still contain partial `errors[]`). | Process `data`, log `errors[]` as warnings. |
| `400` | Bad parameters / bad JSON. | Fail fast, surface to UI; do not retry. |
| `401` | Expired / invalid access token. | Refresh token via `offline.access`. If refresh fails, re-run OAuth flow. |
| `403` | Wrong scope, wrong auth type, or user revoked access. | Re-prompt user; cannot recover silently. |
| `404` | User or Post no longer exists. | Mark resource as gone, continue. |
| `429` | Rate limit. | Honor `x-rate-limit-reset`; back off + retry. |
| `5xx` | X-side outage. | Exponential backoff with jitter; cap attempts. |

---

## 13. Hard Limits & Caveats

- **800 most-recent bookmarks maximum.** Even with unlimited pagination, GET bookmarks will not return older entries beyond that window. HAL must ingest incrementally and persist locally to retain history.
- **Bookmarks are private.** No app-only / public read path exists.
- **`:id` must match the token owner.** Apps cannot read another user's bookmarks.
- **Bookmark folder CRUD is not in the public v2 docs.** HAL can list folders and list posts inside a folder, but cannot create, rename, delete, or move Posts between folders via the API. Folder management must happen in the X app UI.
- **Write endpoints don't return the full Post object** — just `{ bookmarked: true|false }`. If HAL needs the Post details after a POST, issue a separate `GET /2/tweets/:id` or re-paginate the bookmarks list.
- **`offline.access` is opt-in.** Without it, HAL will force re-auth every ~2 hours.
- **Access tokens expire in ~2 hours.** Always refresh proactively.
- **Tokens are per-user.** You cannot share an access token across accounts.
- **No webhook / streaming** for bookmark events exists in public docs — HAL must poll.

---

## 14. End-to-End Integration Flow

This is the canonical shape of a bookmark feature backed by the X API:

```
┌─────────────────┐
│ User connects X │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 1. Build /oauth2/authorize URL      │
│    scopes: tweet.read users.read    │
│            bookmark.read            │
│            bookmark.write           │
│            offline.access           │
│    + state + code_challenge (S256)  │
└────────┬────────────────────────────┘
         │ redirect
         ▼
┌─────────────────────────────────────┐
│ 2. User approves → callback with    │
│    ?code=…&state=…                  │
│    Verify state.                    │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 3. POST /2/oauth2/token             │
│    grant_type=authorization_code    │
│    + code_verifier                  │
│    Store access_token + refresh_token│
│    + expires_at on account record.  │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 4. GET /2/users/me                  │
│    Cache the numeric user id.       │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 5. Initial sync:                    │
│    Paginate GET /2/users/:id/       │
│      bookmarks?max_results=100      │
│    Full field + expansion set       │
│    Until next_token is absent OR    │
│    800-post cap reached.            │
│    Upsert into local DB.            │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 6. Incremental sync (poll):         │
│    Run periodically; stop early     │
│    once you see a Post already in   │
│    local DB. Respect 180/15min rate │
│    limit.                           │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 7. Write-through actions from HAL   │
│    Add:    POST /2/users/:id/       │
│             bookmarks { tweet_id }  │
│    Remove: DELETE /2/users/:id/     │
│             bookmarks/:tweet_id     │
│    50/15min/user limit on each.     │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 8. Token maintenance:               │
│    Before each request, check       │
│    expires_at; if < 60s remaining   │
│    refresh via grant_type=          │
│    refresh_token.                   │
│    On 401, refresh + retry once.    │
│    On 403, surface re-auth prompt.  │
└─────────────────────────────────────┘
```

### 14.1 Things HAL should persist per connected account

- `x_user_id` (string, 19 digits max)
- `x_username` (handle, for display)
- `access_token`, `access_token_expires_at`
- `refresh_token` (only if `offline.access` granted)
- `granted_scopes[]`
- `oauth_client_type` (`public` | `confidential`)
- `last_full_sync_at`, `last_incremental_sync_at`
- `last_next_token` (optional, for resuming an interrupted full sync)

### 14.2 Sync strategy notes

- **First sync:** page to completion or until the 800 hard cap — whichever comes first.
- **Subsequent syncs:** page from the top until you hit a Post already in the local DB, then stop. This avoids burning rate limit on data you already have.
- **Deletions:** the API does **not** notify you when a user removes a bookmark in the X app. To detect removals, periodically do a full re-scan (e.g. daily) and mark Posts absent from the returned set as deleted.
- **Folder membership:** fetch `GET /bookmarks/folders` first, then for each folder call `GET /bookmarks/folders/:folder_id` to reconcile membership.
- **Cold author hydration:** always request `expansions=author_id` + `user.fields=...` so HAL never has to issue a separate users lookup.

---

## 15. Reference Links

Primary docs (authoritative):

- [X API Overview](https://docs.x.com/x-api/overview)
- [Bookmarks — Introduction](https://docs.x.com/x-api/posts/bookmarks/introduction)
- [Bookmarks Lookup quickstart](https://docs.x.com/x-api/posts/bookmarks/quickstart/bookmarks-lookup)
- [Manage Bookmarks quickstart](https://docs.x.com/x-api/posts/bookmarks/quickstart/manage-bookmarks)
- [Bookmarks Integration guide](https://docs.x.com/x-api/posts/bookmarks/integrate)
- [Get Bookmarks (API ref)](https://docs.x.com/x-api/users/get-bookmarks)
- [Create Bookmark (API ref)](https://docs.x.com/x-api/users/create-bookmark)
- [Delete Bookmark (API ref)](https://docs.x.com/x-api/users/delete-bookmark)
- [Get Bookmark Folders (API ref)](https://docs.x.com/x-api/users/get-bookmark-folders)

Fundamentals:

- [OAuth 2.0 Overview](https://docs.x.com/fundamentals/authentication/oauth-2-0/overview)
- [OAuth 2.0 Authorization Code Flow with PKCE](https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code)
- [Obtain a User Access Token (PKCE)](https://docs.x.com/fundamentals/authentication/oauth-2-0/user-access-token)
- [Developer Apps](https://docs.x.com/fundamentals/developer-apps)
- [Rate Limits](https://docs.x.com/x-api/fundamentals/rate-limits)
- [Pagination](https://docs.x.com/x-api/fundamentals/pagination)
- [Fields](https://docs.x.com/x-api/fundamentals/fields)
- [Expansions](https://docs.x.com/x-api/fundamentals/expansions)
- [Data Dictionary](https://docs.x.com/x-api/fundamentals/data-dictionary)
- [Make Your First Request](https://docs.x.com/x-api/getting-started/make-your-first-request)

Consolidated machine-readable index:

- [docs.x.com/llms.txt](https://docs.x.com/llms.txt)
