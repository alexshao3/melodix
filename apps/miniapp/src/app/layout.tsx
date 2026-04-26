import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { PlayerProvider } from '@/components/PlayerProvider';
import { MiniPlayer } from '@/components/MiniPlayer';
import { TelegramSync } from '@/components/TelegramSync';
import { MiniNav } from '@/components/MiniNav';
import { MotionRoot } from '@/components/MotionRoot';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', display: 'swap' });

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
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
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
