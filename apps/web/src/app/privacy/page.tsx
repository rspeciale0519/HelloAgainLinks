import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy · HelloAgain',
  description: 'What HelloAgain collects, why, and how to remove it.',
};

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'flex', justifyContent: 'center', padding: '48px 24px' },
  wrap: { maxWidth: '640px', width: '100%', color: '#c9c9d4', fontSize: '15px', lineHeight: 1.7 },
  h1: { fontSize: '28px', fontWeight: 700, color: '#f0f0f5', marginBottom: '4px' },
  meta: { fontSize: '12px', color: '#8a8a96', marginBottom: '32px' },
  h2: { fontSize: '18px', fontWeight: 600, color: '#f0f0f5', marginTop: '32px', marginBottom: '10px' },
};

export default function PrivacyPage() {
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <h1 style={S.h1}>Privacy Policy</h1>
        <div style={S.meta}>HelloAgain (helloagainlinks.com) · Last updated July 31, 2026</div>

        <h2 style={S.h2}>What we collect</h2>
        <p>
          When you sign in with X, we receive your X profile basics (user id, handle, display
          name, avatar) and OAuth tokens with the scopes you approve (read your posts, profile,
          and bookmarks). When you save or import bookmarks, we store the bookmarked posts&apos;
          content, author, media links, and timestamps so we can show, search, and organize them
          for you. If you subscribe, payment is processed by Stripe — we store your subscription
          status and Stripe customer id, never your card details.
        </p>

        <h2 style={S.h2}>How we use it</h2>
        <p>
          Your bookmarks exist to serve you: search, folders, tags, and the AI features. Bookmark
          text is sent to xAI&apos;s Grok API to power auto-tagging, summaries, and the assistant —
          it is not used to train models under xAI&apos;s API terms. We log token counts and costs
          for our own billing, not your content.
        </p>

        <h2 style={S.h2}>What&apos;s shared</h2>
        <p>
          Nothing is public by default. If you accept a Bookmark Blend, its public page and share
          card show only aggregate themes, scores, and your handle — never individual bookmarks.
          Shared lists are visible only to people you invite via link. We don&apos;t sell data or
          share it with advertisers.
        </p>

        <h2 style={S.h2}>Where it lives, and deleting it</h2>
        <p>
          Data is stored in Supabase (Postgres) with row-level access controls; every account can
          only read its own rows. Deleting a bookmark, blend, or list removes it immediately. To
          delete your account and all associated data, email{' '}
          <a href="mailto:theyellowlettershop@gmail.com" style={{ color: '#00d4ff' }}>
            theyellowlettershop@gmail.com
          </a>{' '}
          from your sign-up address and we&apos;ll complete it within 30 days.
        </p>

        <h2 style={S.h2}>Browser extension</h2>
        <p>
          The Chrome extension runs only on x.com and helloagainlinks.com. It reads the bookmarks
          and posts you interact with in order to save them to your account, and stores your
          session token locally in extension storage. It does not track browsing on other sites.
        </p>

        <div style={{ marginTop: '40px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
          <Link href="/terms" style={{ color: '#00d4ff', marginRight: '20px' }}>Terms of Service</Link>
          <Link href="/" style={{ color: '#8a8a96' }}>Home</Link>
        </div>
      </div>
    </div>
  );
}
