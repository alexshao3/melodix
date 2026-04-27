'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Spinner } from '@melodix/ui';
import { useAuth } from './AuthProvider';

/**
 * Client-side gate: redirects unauthenticated visitors to /login. Renders a
 * lightweight skeleton while the auth context is hydrating to avoid layout
 * flicker on the dashboard pages.
 */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { ready, admin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (!admin) {
      const next = pathname && pathname !== '/' ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${next}`);
    }
  }, [ready, admin, router, pathname]);

  if (!ready || !admin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return <>{children}</>;
}
