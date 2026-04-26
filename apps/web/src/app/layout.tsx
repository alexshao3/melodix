import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { PlayerProvider } from '@/components/player/PlayerProvider';
import { AppShell } from '@/components/layout/AppShell';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', display: 'swap' });

export const metadata: Metadata = {
  title: 'Melodix — Where every beat finds you.',
  description:
    'Melodix is a modern music streaming experience. Discover, play, and curate music with a beautifully fluid interface.',
  applicationName: 'Melodix',
  authors: [{ name: 'Melodix' }],
  openGraph: {
    title: 'Melodix — Where every beat finds you.',
    description: 'A modern music streaming web app and Telegram Mini App.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#06060a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <body className="font-sans">
        <PlayerProvider>
          <AppShell>{children}</AppShell>
        </PlayerProvider>
      </body>
    </html>
  );
}
