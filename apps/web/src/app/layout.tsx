import type { Metadata, Viewport } from 'next';
import { Inter, Instrument_Serif } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

// The HAL token system declares --hal-serif: 'Instrument Serif' but nothing ever
// loaded the face, so it silently fell back to Times New Roman. Loading it makes
// the token real. Scoped effect only: --hal-serif has no other consumers today,
// so this changes nothing that already renders.
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-instrument-serif',
});

export const metadata: Metadata = {
  title: 'Hello Again Links — Your X Bookmarks, Reimagined',
  description: 'HAL — AI-powered bookmark manager for X/Twitter with social features. Organize, search, and blend your bookmarks.',
};

// maximumScale/userScalable disable the iOS focus-zoom that shifted the mobile
// app off-screen when tapping a field; viewportFit=cover + env(safe-area-inset-*)
// padding (see mobile/layout.tsx) let the native app use the full screen and
// respect the notch / home indicator.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${instrumentSerif.variable}`}>
      <body style={{ background: '#0a0a0f', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  );
}
