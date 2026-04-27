import type { CSSProperties } from 'react';
import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';
import { MotionConfig } from 'framer-motion';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { ToastProvider } from '@/components/Toast';

// See apps/web/src/app/layout.tsx — fonts are bundled via npm to keep
// `next build` offline-safe (ADR-0027).
const fontVars: CSSProperties = {
  ['--font-sans' as string]: '"Inter Variable", system-ui, sans-serif',
  ['--font-display' as string]: '"Space Grotesk Variable", "Inter Variable", system-ui, sans-serif',
};

export const metadata: Metadata = {
  title: 'Melodix Admin',
  description: 'Manage uploaded tracks and music sources for the Melodix platform.',
  robots: { index: false, follow: false },
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
        <MotionConfig reducedMotion="user">
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </MotionConfig>
      </body>
    </html>
  );
}
