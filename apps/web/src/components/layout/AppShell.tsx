import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { PlayerBar } from '@/components/player/PlayerBar';
import { MobileNav } from './MobileNav';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="lg:flex">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <TopBar />
          <main className="relative flex-1 px-4 pb-40 pt-4 sm:px-6 lg:px-10">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
      <PlayerBar />
      <MobileNav />
    </div>
  );
}
