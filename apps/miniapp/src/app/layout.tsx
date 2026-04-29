import type { CSSProperties } from 'react';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import '@fontsource-variable/inter';
// Fraunces Variable carries the SOFT and WONK axes; we use them for the
// hero accent word so the Mini App matches the Build display voice in
// `apps/web`. Space Grotesk is no longer the display face but kept off the
// import path to drop ~25 kB of unused webfont payload.
import '@fontsource-variable/fraunces';
import './globals.css';
import { PlayerProvider } from '@/components/PlayerProvider';
import { MiniPlayer } from '@/components/MiniPlayer';
import { TelegramSync } from '@/components/TelegramSync';
import { MiniNav } from '@/components/MiniNav';
import { MotionRoot } from '@/components/MotionRoot';

// See apps/web/src/app/layout.tsx — fonts are bundled via npm to keep
// `next build` offline-safe (ADR-0027).
const fontVars: CSSProperties = {
  ['--font-sans' as string]: '"Inter Variable", system-ui, sans-serif',
  ['--font-display' as string]: '"Fraunces Variable", ui-serif, Georgia, serif',
};

export const metadata: Metadata = {
  title: 'Melodix Mini',
  description: 'Melodix — music streaming, inside Telegram.',
};

export const viewport: Viewport = {
  themeColor: '#06060a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={fontVars}>
      <body className="font-sans">
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <MotionRoot>
          <PlayerProvider>
            <TelegramSync />
            <main className="mx-auto w-full max-w-xl px-4 pb-52 pt-4">{children}</main>
            <MiniPlayer />
            <MiniNav />
          </PlayerProvider>
        </MotionRoot>
      </body>
    </html>
  );
}
