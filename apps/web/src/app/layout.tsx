import type { CSSProperties } from 'react';
import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';
import './globals.css';
import { PlayerProvider } from '@/components/player/PlayerProvider';
import { AppShell } from '@/components/layout/AppShell';
import { MotionRoot } from '@/components/motion/MotionRoot';
import { ThemeProvider } from '@/components/theme/ThemeProvider';

// Variable fonts shipped via @fontsource-variable so that `next build` does not
// need to fetch from fonts.googleapis.com — important for self-hosted Docker
// builds behind firewalls / Cloudflare Tunnel where outbound DNS to Google can
// fail (see ADR-0027). Tailwind reads `var(--font-sans)` / `var(--font-display)`.
const fontVars: CSSProperties = {
  ['--font-sans' as string]: '"Inter Variable", system-ui, sans-serif',
  ['--font-display' as string]: '"Space Grotesk Variable", "Inter Variable", system-ui, sans-serif',
};

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
    <html lang="en" style={fontVars} suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider>
          <MotionRoot>
            <PlayerProvider>
              <AppShell>{children}</AppShell>
            </PlayerProvider>
          </MotionRoot>
        </ThemeProvider>
      </body>
    </html>
  );
}
