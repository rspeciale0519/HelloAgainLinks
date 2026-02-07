import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'HelloAgain — Your X Bookmarks, Reimagined',
  description: 'AI-powered bookmark manager for X/Twitter with social features. Organize, search, and blend your bookmarks.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body style={{ background: '#0a0a0f', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  );
}
