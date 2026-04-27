'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Database,
  ListMusic,
  Upload,
  ToggleLeft,
  Music,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { Spinner } from '@melodix/ui';
import type { Track } from '@melodix/shared';
import { adminApi, ApiError, type MusicSource, type StorageInfo } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/components/Toast';
import { PageHeader } from '@/components/PageHeader';
import { formatDuration, formatRelativeDate } from '@/lib/format';

interface DashboardData {
  total: number;
  recent: Track[];
  sources: MusicSource[];
  storage: StorageInfo;
}

async function loadDashboard(): Promise<DashboardData> {
  const [tracks, sources, storage] = await Promise.all([
    adminApi.listTracks({ page: 1, limit: 5 }),
    adminApi.listSources(),
    adminApi.storageInfo(),
  ]);
  return { total: tracks.total, recent: tracks.items, sources, storage };
}

const BACKEND_LABEL: Record<StorageInfo['backend'], string> = {
  s3: 'Backblaze B2',
  postgres: 'Postgres database',
};

const BACKEND_HINT: Record<StorageInfo['backend'], string> = {
  s3: 'S3-compatible',
  postgres: 'Database blob storage',
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function DashboardPage() {
  const { admin, signOut } = useAuth();
  const toast = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingSource, setTogglingSource] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard()
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          signOut();
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      })
      .finally(() => setLoading(false));
  }, [signOut]);

  const toggleSource = async (source: MusicSource) => {
    setTogglingSource(source.name);
    const prev = data;
    // optimistic
    setData((d) =>
      d
        ? {
            ...d,
            sources: d.sources.map((s) => (s.id === source.id ? { ...s, enabled: !s.enabled } : s)),
          }
        : d,
    );
    try {
      const updated = await adminApi.toggleSource(source.name, !source.enabled);
      setData((d) =>
        d ? { ...d, sources: d.sources.map((s) => (s.id === updated.id ? updated : s)) } : d,
      );
      toast.success(`Source "${source.name}" ${updated.enabled ? 'enabled' : 'disabled'}.`);
    } catch (err) {
      setData(prev);
      toast.error(err instanceof Error ? err.message : 'Failed to toggle source');
    } finally {
      setTogglingSource(null);
    }
  };

  const enabledSources = data?.sources.filter((s) => s.enabled).length ?? 0;
  const totalSources = data?.sources.length ?? 0;

  return (
    <>
      <PageHeader
        eyebrow={`Welcome back, ${admin?.username ?? 'admin'}`}
        title="Catalog control center"
        description="Upload tracks, manage your live music sources, and keep the Melodix experience in sync."
        actions={
          <Link
            href="/tracks/upload"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-rose-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/20 transition-transform hover:scale-[1.02]"
          >
            <Upload className="h-4 w-4" />
            Upload track
          </Link>
        }
      />

      {error && (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<ListMusic className="h-4 w-4" />}
          label="Uploaded tracks"
          value={loading ? '—' : String(data?.total ?? 0)}
          hint="Tracks in object storage"
        />
        <StatCard
          icon={<ToggleLeft className="h-4 w-4" />}
          label="Active sources"
          value={loading ? '—' : `${enabledSources}/${totalSources}`}
          hint="Enabled / total"
        />
        <StatCard
          icon={<Database className="h-4 w-4" />}
          label="Storage backend"
          value={
            loading || !data?.storage
              ? '—'
              : data.storage.backend === 'postgres' && data.storage.totalBytes !== null
                ? `${BACKEND_LABEL.postgres} · ${formatBytes(data.storage.totalBytes)}`
                : BACKEND_LABEL[data.storage.backend]
          }
          hint={
            loading || !data?.storage
              ? 'Loading…'
              : data.storage.backend === 'postgres' && data.storage.objectCount !== null
                ? `${data.storage.objectCount} object${data.storage.objectCount === 1 ? '' : 's'}`
                : BACKEND_HINT[data.storage.backend]
          }
        />
        <StatCard
          icon={<Sparkles className="h-4 w-4" />}
          label="Catalog"
          value="Jamendo + Upload"
          hint="Merged on read"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-white">Recent uploads</h2>
              <p className="text-xs text-zinc-400">
                Latest 5 tracks added via the admin upload flow.
              </p>
            </div>
            <Link
              href="/tracks"
              className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200"
            >
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </header>

          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Spinner />
            </div>
          ) : data && data.recent.length > 0 ? (
            <ul className="divide-y divide-white/5">
              {data.recent.map((track) => (
                <li key={track.id} className="flex items-center gap-3 py-3">
                  <Cover cover={track.cover ?? null} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{track.title}</p>
                    <p className="truncate text-xs text-zinc-400">
                      {track.artistName} · {track.genre ?? 'no genre'}
                    </p>
                  </div>
                  <div className="text-right text-xs text-zinc-500">
                    <p>{formatDuration(track.duration)}</p>
                    <p>{formatRelativeDate(track.releaseDate ?? null)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<Upload className="h-5 w-5" />}
              title="No uploads yet"
              description="Your first uploaded track will show up here."
              cta={{ href: '/tracks/upload', label: 'Upload your first track' }}
            />
          )}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
          <header className="mb-4">
            <h2 className="font-display text-lg font-semibold text-white">Music sources</h2>
            <p className="text-xs text-zinc-400">
              Toggle which catalogs feed the public app. Disabled sources are hidden from listeners
              instantly.
            </p>
          </header>

          {loading ? (
            <div className="flex h-24 items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <ul className="space-y-2">
              {data?.sources.map((source) => (
                <li
                  key={source.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium capitalize text-white">{source.name}</p>
                    <p className="text-xs text-zinc-500">priority {source.priority}</p>
                  </div>
                  <SourceToggle
                    enabled={source.enabled}
                    busy={togglingSource === source.name}
                    onClick={() => toggleSource(source)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-400">
        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/10 text-cyan-300">
          {icon}
        </span>
        {label}
      </div>
      <p className="mt-3 font-display text-2xl font-bold text-white">{value}</p>
      <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>
    </div>
  );
}

function Cover({ cover }: { cover: string | null }) {
  if (cover) {
    /* eslint-disable-next-line @next/next/no-img-element */
    return <img src={cover} alt="" className="h-10 w-10 rounded-lg object-cover" />;
  }
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400/40 to-fuchsia-500/40 text-white">
      <Music className="h-4 w-4" />
    </span>
  );
}

function SourceToggle({
  enabled,
  busy,
  onClick,
}: {
  enabled: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-pressed={enabled}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
        enabled ? 'bg-emerald-400/80' : 'bg-white/10'
      } disabled:opacity-50`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function EmptyState({
  icon,
  title,
  description,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-cyan-300">
        {icon}
      </span>
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-zinc-400">{description}</p>
      </div>
      {cta && (
        <Link
          href={cta.href}
          className="rounded-xl bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/15"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
