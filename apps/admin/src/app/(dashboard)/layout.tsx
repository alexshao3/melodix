import { AdminShell } from '@/components/AdminShell';
import { RequireAdmin } from '@/components/RequireAdmin';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAdmin>
      <AdminShell>{children}</AdminShell>
    </RequireAdmin>
  );
}
