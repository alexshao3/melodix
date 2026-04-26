import { Suspense } from 'react';
import { Spinner } from '@melodix/ui';
import { SearchClient } from './SearchClient';

export const dynamic = 'force-dynamic';

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner size={28} />
        </div>
      }
    >
      <SearchClient />
    </Suspense>
  );
}
