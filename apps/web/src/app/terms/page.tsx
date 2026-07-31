import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service · HelloAgain',
  description: 'The terms for using HelloAgain.',
};

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'flex', justifyContent: 'center', padding: '48px 24px' },
  wrap: { maxWidth: '640px', width: '100%', color: '#c9c9d4', fontSize: '15px', lineHeight: 1.7 },
  h1: { fontSize: '28px', fontWeight: 700, color: '#f0f0f5', marginBottom: '4px' },
  meta: { fontSize: '12px', color: '#8a8a96', marginBottom: '32px' },
  h2: { fontSize: '18px', fontWeight: 600, color: '#f0f0f5', marginTop: '32px', marginBottom: '10px' },
};

export default function TermsPage() {
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <h1 style={S.h1}>Terms of Service</h1>
        <div style={S.meta}>HelloAgain (helloagainlinks.com) · Last updated July 31, 2026</div>

        <h2 style={S.h2}>The service</h2>
        <p>
          HelloAgain organizes your X bookmarks: saving, importing, search, folders, tags, AI
          features, and social features like Bookmark Blend. You need an X account to use it, and
          you authorize us to access your X data through the permissions you grant at sign-in.
        </p>

        <h2 style={S.h2}>Your account and content</h2>
        <p>
          Your bookmarks remain yours. You&apos;re responsible for activity on your account and for
          keeping access to your X login. Don&apos;t use the service to violate X&apos;s terms,
          scrape other people&apos;s data, or abuse the AI features. We may rate-limit or suspend
          accounts that harm the service or other users.
        </p>

        <h2 style={S.h2}>Plans and billing</h2>
        <p>
          The free plan has usage limits (bookmarks, folders, AI usage). Paid plans are billed by
          Stripe monthly or annually and can be cancelled anytime from Settings — access continues
          until the end of the paid period. Lifetime purchases are one-time payments for ongoing
          Pro-level access. Prices may change with notice; changes never apply retroactively to a
          period you&apos;ve already paid for.
        </p>

        <h2 style={S.h2}>AI features</h2>
        <p>
          Summaries, tags, blend analyses, and assistant answers are machine-generated and can be
          wrong. They&apos;re provided as-is, for organizing your own library — not as advice.
        </p>

        <h2 style={S.h2}>Service changes and liability</h2>
        <p>
          We may change or discontinue features as the product evolves; if we ever shut down,
          we&apos;ll give notice and a way to export your data. The service is provided
          &quot;as is&quot; without warranties, and our liability is limited to the amount
          you&apos;ve paid us in the last 12 months.
        </p>

        <h2 style={S.h2}>Contact</h2>
        <p>
          Questions:{' '}
          <a href="mailto:theyellowlettershop@gmail.com" style={{ color: '#00d4ff' }}>
            theyellowlettershop@gmail.com
          </a>
        </p>

        <div style={{ marginTop: '40px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
          <Link href="/privacy" style={{ color: '#00d4ff', marginRight: '20px' }}>Privacy Policy</Link>
          <Link href="/" style={{ color: '#8a8a96' }}>Home</Link>
        </div>
      </div>
    </div>
  );
}
