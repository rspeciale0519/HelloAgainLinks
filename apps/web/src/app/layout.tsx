import type { Metadata, Viewport } from 'next';
import { Inter, Instrument_Serif, Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

// The HAL token system asks for Geist and Geist Mono but nothing ever loaded
// them, so --hal-sans / --hal-mono silently fell back to the system UI font and
// Consolas/Courier. That only looked correct on machines with Geist installed
// locally; every other visitor saw a different, worse-fitting face — especially
// at the 9-11px mono labels this UI leans on heavily.
const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

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
    <html
      lang="en"
      className={`${inter.variable} ${instrumentSerif.variable} ${geist.variable} ${geistMono.variable}`}
    >
      <body style={{ background: '#0a0a0f', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  );
}
