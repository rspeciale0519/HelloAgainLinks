'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { authFetch } from '@/lib/auth-fetch';
import { timeAgo } from '@helloagain/shared';
import { Avatar } from '@helloagain/ui-hal';
import { PageShell, SectionLabel, HalPanel } from '@/components/hal/PageShell';

interface Bookmark {
  id: string;
  x_post_id: string;
  x_author_handle: string;
  x_author_name: string;
  x_author_avatar_url?: string | null;
  content_text: string;
  bookmarked_at: string;
}

interface Tag {
  name: string;
  bookmark_count?: number;
}

interface DashboardUser {
  name: string;
  handle: string;
}

const RECENT_LIMIT = 5;
const TAG_LIMIT = 8;

export default function DashboardPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [tagCount, setTagCount] = useState(0);
  const [topTags, setTopTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<DashboardUser | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const meta = session.user.user_metadata || {};
      setUser({
        name: meta.full_name || meta.name || '',
        handle: meta.preferred_username || meta.user_name || '',
      });

      const bmRes = await authFetch(
        `/api/bookmarks?pageSize=${RECENT_LIMIT}&sort=bookmarked_at&order=desc`,
      );
      if (bmRes?.ok) {
        const data = await bmRes.json();
        setBookmarks(data.data || []);
        setBookmarkCount(data.count ?? data.data?.length ?? 0);
      }

      const tagRes = await authFetch('/api/tags');
      if (tagRes?.ok) {
        const data = await tagRes.json();
        const tags = data.tags || data || [];
        setTagCount(tags.length);
        setTopTags(tags.slice(0, TAG_LIMIT));
      }

      setLoading(false);
    }

    load();
  }, []);

  const greeting = user
    ? `Hello, ${user.name || `@${user.handle}`}`
    : 'Hello';
  const subtitle = bookmarkCount > 0
    ? `${bookmarkCount.toLocaleString()} bookmark${bookmarkCount === 1 ? '' : 's'} indexed.`
    : 'Install the HAL Chrome extension to start saving bookmarks from X.';

  return (
    <PageShell eyebrow="DASHBOARD · HOME" title={greeting} subtitle={subtitle}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
          marginTop: 8,
        }}
      >
        <Stat label="BOOKMARKS" value={bookmarkCount.toLocaleString()} hint="all time" />
        <Stat label="TAGS" value={tagCount.toString()} hint="manual + AI" />
        <Stat label="BLEND SCORE" value="—" hint="invite a friend" />
        <Stat label="AI SEARCHES" value="0" hint="pro feature" />
      </div>

      {topTags.length > 0 && (
        <>
          <SectionLabel count={topTags.length}>TAGS · TOP {TAG_LIMIT}</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {topTags.map((tag) => (
              <Link
                key={tag.name}
                href={`/dashboard/bookmarks?tag=${encodeURIComponent(tag.name)}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  fontFamily: 'var(--hal-mono)',
                  fontSize: 11,
                  color: 'var(--hal-a)',
                  background: 'var(--hal-a-dim)',
                  border: '1px solid rgba(var(--hal-a-rgb), 0.25)',
                  borderRadius: 2,
                  textDecoration: 'none',
                  letterSpacing: '0.02em',
                }}
              >
                #{tag.name}
                {typeof tag.bookmark_count === 'number' && tag.bookmark_count > 0 && (
                  <span style={{ color: 'var(--hal-text-3)' }}>{tag.bookmark_count}</span>
                )}
              </Link>
            ))}
          </div>
        </>
      )}

      <SectionLabel count={loading ? '…' : bookmarks.length}>
        RECENT · LAST {RECENT_LIMIT}
      </SectionLabel>

      {loading ? (
        <LoadingRow label="QUERYING…" />
      ) : bookmarks.length === 0 ? (
        <HalPanel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div
              style={{
                fontFamily: 'var(--hal-mono)',
                fontSize: 10,
                letterSpacing: '0.16em',
                color: 'var(--hal-text-3)',
              }}
            >
              EMPTY ARCHIVE
            </div>
            <div style={{ fontSize: 14, color: 'var(--hal-text-1)', lineHeight: 1.55 }}>
              Install the HAL Chrome extension, then browse X. Click the bookmark
              icon on any post to save it here, or import your existing bookmarks
              from{' '}
              <Link
                href="/dashboard/settings"
                style={{ color: 'var(--hal-a)', textDecoration: 'none' }}
              >
                Settings
              </Link>
              .
            </div>
          </div>
        </HalPanel>
      ) : (
        <div
          style={{
            border: '1px solid var(--hal-line-1)',
            borderRadius: 4,
            background: 'var(--hal-bg-1)',
            overflow: 'hidden',
          }}
        >
          {bookmarks.map((bm, i) => (
            <RecentRow
              key={bm.id}
              bookmark={bm}
              isLast={i === bookmarks.length - 1}
            />
          ))}
        </div>
      )}

      {bookmarks.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <Link
            href="/dashboard/bookmarks"
            style={{
              fontFamily: 'var(--hal-mono)',
              fontSize: 10,
              color: 'var(--hal-text-3)',
              letterSpacing: '0.12em',
              textDecoration: 'none',
              transition: 'color 0.1s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--hal-a)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--hal-text-3)';
            }}
          >
            VIEW ALL BOOKMARKS →
          </Link>
        </div>
      )}
    </PageShell>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div
      style={{
        background: 'var(--hal-bg-1)',
        border: '1px solid var(--hal-line-1)',
        borderRadius: 4,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--hal-mono)',
          fontSize: 9,
          letterSpacing: '0.18em',
          color: 'var(--hal-text-3)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 500,
          color: 'var(--hal-text-0)',
          fontFamily: 'var(--hal-sans)',
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: 'var(--hal-mono)',
          fontSize: 9,
          color: 'var(--hal-a)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {hint}
      </div>
    </div>
  );
}

function RecentRow({ bookmark, isLast }: { bookmark: Bookmark; isLast: boolean }) {
  return (
    <Link
      href={`/dashboard/bookmarks?open=${bookmark.id}`}
      style={{
        display: 'grid',
        gridTemplateColumns: '28px 1fr auto',
        gap: 12,
        padding: '12px 16px',
        textDecoration: 'none',
        borderBottom: isLast ? 'none' : '1px solid var(--hal-line-0)',
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--hal-bg-2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <Avatar
        avatarUrl={bookmark.x_author_avatar_url}
        name={bookmark.x_author_name || bookmark.x_author_handle}
        handle={bookmark.x_author_handle}
        size={28}
      />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            marginBottom: 3,
          }}
        >
          <span
            style={{
              fontSize: 12.5,
              color: 'var(--hal-text-0)',
              fontWeight: 500,
            }}
          >
            {bookmark.x_author_name || bookmark.x_author_handle}
          </span>
          <span
            style={{
              fontFamily: 'var(--hal-mono)',
              fontSize: 10.5,
              color: 'var(--hal-text-3)',
            }}
          >
            @{bookmark.x_author_handle}
          </span>
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: 'var(--hal-text-2)',
            lineHeight: 1.45,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {bookmark.content_text}
        </div>
      </div>
      <div
        style={{
          fontFamily: 'var(--hal-mono)',
          fontSize: 10,
          color: 'var(--hal-text-3)',
          letterSpacing: '0.04em',
          alignSelf: 'flex-start',
          paddingTop: 2,
          whiteSpace: 'nowrap',
        }}
      >
        {timeAgo(bookmark.bookmarked_at)}
      </div>
    </Link>
  );
}

function LoadingRow({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: '24px 16px',
        textAlign: 'center',
        fontFamily: 'var(--hal-mono)',
        fontSize: 10,
        letterSpacing: '0.16em',
        color: 'var(--hal-text-3)',
      }}
    >
      {label}
    </div>
  );
}
