'use client';

import { useRef, useState } from 'react';
import { Layers, Trash2, Play, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { GradientButton } from '@melodix/ui';
import { adminApi, ApiError } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/components/Toast';
import { PageHeader } from '@/components/PageHeader';
import { formatBytes } from '@/lib/format';
import { generatePeaks } from '@/lib/peaks';

type ItemStatus = 'pending' | 'uploading' | 'done' | 'error';

interface QueueItem {
  id: string;
  file: File;
  title: string;
  status: ItemStatus;
  error?: string;
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

function fileToTitle(name: string): string {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim();
}

export default function BulkUploadPage() {
  const toast = useToast();
  const { signOut } = useAuth();

  const [items, setItems] = useState<QueueItem[]>([]);
  const [artistName, setArtistName] = useState('');
  const [genre, setGenre] = useState('');
  const [running, setRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const addFiles = (files: FileList | File[] | null) => {
    if (!files) return;
    const list = Array.from(files);
    setItems((prev) => [
      ...prev,
      ...list.map<QueueItem>((file) => ({
        id: makeId(),
        file,
        title: fileToTitle(file.name),
        status: 'pending',
      })),
    ]);
  };

  const remove = (id: string) =>
    setItems((prev) => prev.filter((i) => i.id !== id || i.status === 'uploading'));

  const updateTitle = (id: string, title: string) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, title } : i)));

  const reset = () => {
    if (running) return;
    setItems([]);
  };

  const startUpload = async () => {
    if (!artistName.trim()) {
      toast.error('Set an artist for the batch first.');
      return;
    }
    if (items.length === 0) return;

    setRunning(true);
    // Track successes locally — `items` is captured at call time and the
    // functional `setItems` updates inside the loop don't mutate this
    // binding, so reading `items[*].status` here would always see
    // 'pending'.
    let attempted = 0;
    let succeeded = 0;
    for (const item of items) {
      if (item.status === 'done') continue;
      attempted += 1;

      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'uploading', error: undefined } : i)),
      );

      try {
        // Same downsample-then-attach flow as the single-track uploader.
        // Per-file failures fall back to no peaks; the upload still succeeds.
        const peaks = await generatePeaks(item.file).catch(() => null);
        const form = new FormData();
        form.append('title', item.title || fileToTitle(item.file.name));
        form.append('artistName', artistName.trim());
        if (genre.trim()) form.append('genre', genre.trim());
        if (peaks) form.append('peaks', JSON.stringify(peaks));
        form.append('audio', item.file);
        await adminApi.createTrack(form);
        succeeded += 1;
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'done' } : i)));
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          signOut();
          setRunning(false);
          return;
        }
        const message = err instanceof Error ? err.message : 'Upload failed';
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: 'error', error: message } : i)),
        );
      }
    }
    setRunning(false);

    if (attempted > 0 && succeeded === attempted) {
      toast.success(`Uploaded ${succeeded} track${succeeded === 1 ? '' : 's'}.`);
    } else if (succeeded > 0) {
      toast.success(`Uploaded ${succeeded} of ${attempted} tracks.`);
    }
  };

  const pending = items.filter((i) => i.status === 'pending').length;
  const done = items.filter((i) => i.status === 'done').length;
  const failed = items.filter((i) => i.status === 'error').length;

  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Bulk upload"
        description="Drop multiple audio files in at once. Each will be uploaded to S3-compatible storage (Backblaze B2) and registered as a track. Title is taken from the filename and editable per row."
      />

      <section className="grid gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-widest text-zinc-400">
            Artist (applied to every track)
          </span>
          <input
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            placeholder="Aurora Drift"
            className="admin-input"
            disabled={running}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-widest text-zinc-400">
            Genre (optional)
          </span>
          <input
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            placeholder="ambient"
            className="admin-input"
            disabled={running}
          />
        </label>
      </section>

      <section
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(e.dataTransfer.files);
        }}
        className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-10 text-center backdrop-blur-xl transition-colors hover:border-white/25"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-cyan-300">
          <Layers className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-medium text-white">Drop audio files here</p>
          <p className="mt-1 text-xs text-zinc-400">or click below to pick from your device</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-xl bg-white/10 px-4 py-2 text-xs text-white hover:bg-white/15"
          disabled={running}
        >
          Choose files
        </button>
      </section>

      {items.length > 0 && (
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3 text-xs text-zinc-400 sm:px-6">
            <p>
              {items.length} file{items.length === 1 ? '' : 's'} ·{' '}
              <span className="text-emerald-300">{done} done</span> ·{' '}
              <span className="text-amber-300">{pending} pending</span>
              {failed > 0 && (
                <>
                  {' · '}
                  <span className="text-rose-300">{failed} failed</span>
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={reset}
                disabled={running}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/10 disabled:opacity-40"
              >
                Clear
              </button>
              <GradientButton
                type="button"
                onClick={startUpload}
                disabled={running || items.every((i) => i.status === 'done')}
              >
                <Play className="h-4 w-4" />
                {running ? 'Uploading…' : `Upload ${pending || ''}`.trim()}
              </GradientButton>
            </div>
          </header>

          <ul className="divide-y divide-white/5">
            {items.map((item) => (
              <li
                key={item.id}
                className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 sm:px-6"
              >
                <div className="min-w-0">
                  <input
                    value={item.title}
                    onChange={(e) => updateTitle(item.id, e.target.value)}
                    disabled={item.status === 'uploading' || item.status === 'done'}
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-white placeholder:text-zinc-500 focus:border-cyan-400/40 focus:outline-none disabled:opacity-60"
                  />
                  <p className="mt-1 truncate text-xs text-zinc-500">
                    {item.file.name} · {formatBytes(item.file.size)}
                    {item.error && <span className="ml-2 text-rose-300">{item.error}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={item.status} />
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    disabled={item.status === 'uploading'}
                    aria-label="Remove from queue"
                    className="rounded-lg p-2 text-zinc-400 hover:bg-rose-500/20 hover:text-rose-200 disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function StatusBadge({ status }: { status: ItemStatus }) {
  if (status === 'uploading') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">
        <Loader2 className="h-3 w-3 animate-spin" />
        Uploading
      </span>
    );
  }
  if (status === 'done') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
        <CheckCircle2 className="h-3 w-3" />
        Done
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-400/10 px-2 py-0.5 text-[10px] font-semibold text-rose-200">
        <AlertTriangle className="h-3 w-3" />
        Failed
      </span>
    );
  }
  return (
    <span className={clsx('admin-pill text-[10px] font-semibold uppercase tracking-widest')}>
      Pending
    </span>
  );
}
