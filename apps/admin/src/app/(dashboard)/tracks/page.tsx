'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  Pencil,
  Trash2,
  Upload,
  Music,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { Spinner } from '@melodix/ui';
import type { Track } from '@melodix/shared';
import { adminApi, ApiError, type AdminTracksList } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/components/Toast';
import { PageHeader } from '@/components/PageHeader';
import { EditTrackDialog } from '@/components/EditTrackDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatDuration, formatRelativeDate } from '@/lib/format';

const PAGE_SIZE = 20;

export default function TracksPage() {
  const { signOut } = useAuth();
  const toast = useToast();

  const [data, setData] = useState<AdminTracksList | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Track | null>(null);
  const [deleting, setDeleting] = useState<Track | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  // debounce search → page reset
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(id);
  }, [search]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminApi.listTracks({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
      });
      setData(result);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        signOut();
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load tracks');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, signOut]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const totalPages = useMemo(
    () => (data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1),
    [data],
  );

  const onTrackUpdated = (updated: Track) => {
    setData((curr) =>
      curr ? { ...curr, items: curr.items.map((t) => (t.id === updated.id ? updated : t)) } : curr,
    );
    setEditing(null);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await adminApi.deleteTrack(deleting.id);
      toast.success(`Deleted "${deleting.title}".`);
      setDeleting(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeletingBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Uploaded tracks"
        description="Search, edit and delete tracks you've uploaded to Cloudflare R2."
        actions={
          <>
            <Link
              href="/tracks/bulk"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 hover:bg-white/10"
            >
              <Layers className="h-4 w-4" />
              Bulk upload
            </Link>
            <Link
              href="/tracks/upload"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-rose-500 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Upload className="h-4 w-4" />
              Upload track
            </Link>
          </>
        }
      />

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by track title…"
              className="admin-input pl-9"
            />
          </label>
          <p className="text-xs text-zinc-400 sm:ml-2">
            {data ? `${data.total} track${data.total === 1 ? '' : 's'}` : '—'}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl">
        {loading && !data ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner />
          </div>
        ) : data && data.items.length > 0 ? (
          <ul className="divide-y divide-white/5">
            {data.items.map((track) => (
              <li
                key={track.id}
                className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-white/[0.02] sm:px-6"
              >
                <Cover cover={track.cover ?? null} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{track.title}</p>
                  <p className="truncate text-xs text-zinc-400">
                    {track.artistName}
                    {track.genre ? ` · ${track.genre}` : ''}
                  </p>
                </div>
                <div className="hidden text-right text-xs text-zinc-500 sm:block">
                  <p>{formatDuration(track.duration)}</p>
                  <p>{formatRelativeDate(track.releaseDate ?? null)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(track)}
                    aria-label={`Edit ${track.title}`}
                    className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(track)}
                    aria-label={`Delete ${track.title}`}
                    className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-rose-500/20 hover:text-rose-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-cyan-300">
              <Music className="h-5 w-5" />
            </span>
            <p className="text-sm font-medium text-white">No tracks match.</p>
            <p className="max-w-xs text-xs text-zinc-400">
              Try a different search, or upload your first track to get started.
            </p>
            <Link
              href="/tracks/upload"
              className="rounded-xl bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/15"
            >
              Upload a track
            </Link>
          </div>
        )}
      </div>

      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
          <p>
            Page <strong className="text-white">{data.page}</strong> of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/10 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!data.hasMore || loading}
              className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/10 disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {editing && (
        <EditTrackDialog
          track={editing}
          onClose={() => setEditing(null)}
          onSaved={onTrackUpdated}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete this track?"
        description={`"${deleting?.title}" will be permanently removed from the catalog and from R2 storage. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        busy={deletingBusy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

function Cover({ cover }: { cover: string | null }) {
  if (cover) {
    /* eslint-disable-next-line @next/next/no-img-element */
    return <img src={cover} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />;
  }
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400/40 to-fuchsia-500/40 text-white">
      <Music className="h-5 w-5" />
    </span>
  );
}
