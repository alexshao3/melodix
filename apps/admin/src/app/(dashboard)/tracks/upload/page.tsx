'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Upload, Music, ImageIcon, FileAudio } from 'lucide-react';
import { GradientButton } from '@melodix/ui';
import { adminApi, ApiError } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/components/Toast';
import { PageHeader } from '@/components/PageHeader';
import { formatBytes } from '@/lib/format';
import { generatePeaks } from '@/lib/peaks';

export default function UploadTrackPage() {
  const router = useRouter();
  const toast = useToast();
  const { signOut } = useAuth();

  const [audio, setAudio] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [genre, setGenre] = useState('');
  const [duration, setDuration] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Probe audio duration client-side; the API also accepts a duration field.
  useEffect(() => {
    if (!audio) {
      setDuration(null);
      return;
    }
    const url = URL.createObjectURL(audio);
    const el = document.createElement('audio');
    audioRef.current = el;
    el.preload = 'metadata';
    el.src = url;
    const onMeta = () => {
      if (Number.isFinite(el.duration)) setDuration(Math.round(el.duration));
    };
    el.addEventListener('loadedmetadata', onMeta);
    if (!title) {
      const stem = audio.name
        .replace(/\.[^.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .trim();
      if (stem) setTitle(stem);
    }
    return () => {
      el.removeEventListener('loadedmetadata', onMeta);
      URL.revokeObjectURL(url);
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audio]);

  useEffect(() => {
    if (!cover) {
      setCoverPreview(null);
      return;
    }
    const url = URL.createObjectURL(cover);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [cover]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!audio) {
      setError('Please choose an audio file.');
      return;
    }
    setSubmitting(true);
    try {
      // Decode + downsample the audio buffer to ~200 amplitude buckets so
      // the players can render a real waveform instead of a plain bar.
      // Failures (unsupported codec, OOM on a multi-hour track) silently
      // fall back to no peaks — the upload itself is unaffected.
      const peaks = await generatePeaks(audio).catch(() => null);

      const form = new FormData();
      form.append('title', title);
      form.append('artistName', artistName);
      if (genre) form.append('genre', genre);
      if (duration && Number.isFinite(duration)) form.append('duration', String(duration));
      if (peaks) form.append('peaks', JSON.stringify(peaks));
      form.append('audio', audio);
      if (cover) form.append('cover', cover);
      const created = await adminApi.createTrack(form);
      toast.success(`Uploaded "${created.title}".`);
      router.push('/tracks');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        signOut();
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to upload');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Upload a track"
        description="Drop in an audio file (MP3, WAV, FLAC) plus optional cover art and metadata. The file is uploaded to S3-compatible storage (Backblaze B2) and immediately surfaces in the public catalog."
      />

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="space-y-4">
          <FilePicker
            label="Audio file"
            description="MP3, WAV, FLAC. Required."
            accept="audio/*"
            file={audio}
            onChange={setAudio}
            Icon={FileAudio}
          />

          <div className="grid gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-widest text-zinc-400">
                Title
              </span>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Stargazer"
                className="admin-input"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-widest text-zinc-400">
                Artist
              </span>
              <input
                required
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                placeholder="Aurora Drift"
                className="admin-input"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-widest text-zinc-400">
                Genre
              </span>
              <input
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="ambient · downtempo · synthwave"
                className="admin-input"
              />
            </label>
            <p className="text-xs text-zinc-500">
              Detected duration:{' '}
              <span className="text-zinc-300">
                {duration ? `${duration}s` : audio ? 'analysing…' : '—'}
              </span>
            </p>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => router.push('/tracks')}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-zinc-200 hover:bg-white/10"
            >
              Cancel
            </button>
            <GradientButton type="submit" disabled={submitting || !audio}>
              <Upload className="h-4 w-4" />
              {submitting ? 'Uploading…' : 'Upload track'}
            </GradientButton>
          </div>
        </section>

        <aside className="space-y-4">
          <FilePicker
            label="Cover art"
            description="Optional. Square JPG/PNG/WebP works best."
            accept="image/*"
            file={cover}
            onChange={setCover}
            Icon={ImageIcon}
          />

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl">
            <div className="aspect-square w-full">
              {coverPreview ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={coverPreview}
                  alt="Cover preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-400/10 via-fuchsia-500/10 to-rose-500/10 text-zinc-400">
                  <div className="text-center">
                    <Music className="mx-auto h-8 w-8" />
                    <p className="mt-2 text-xs">Cover preview</p>
                  </div>
                </div>
              )}
            </div>
            <div className="border-t border-white/10 px-4 py-3 text-xs text-zinc-500">
              {audio ? (
                <p>
                  <span className="text-zinc-300">{audio.name}</span> · {formatBytes(audio.size)}
                </p>
              ) : (
                <p>No audio file selected.</p>
              )}
            </div>
          </div>
        </aside>
      </form>
    </>
  );
}

interface FilePickerProps {
  label: string;
  description: string;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
  Icon: typeof Upload;
}

function FilePicker({ label, description, accept, file, onChange, Icon }: FilePickerProps) {
  const [dragOver, setDragOver] = useState(false);
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped) onChange(dropped);
      }}
      className={`flex cursor-pointer flex-col items-start gap-3 rounded-3xl border border-dashed bg-white/[0.03] p-6 backdrop-blur-xl transition-colors ${
        dragOver ? 'border-cyan-400/60 bg-cyan-400/5' : 'border-white/15 hover:border-white/25'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 text-cyan-300">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="text-xs text-zinc-400">{description}</p>
        </div>
      </div>
      <input
        type="file"
        accept={accept}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className="block w-full text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:text-white hover:file:bg-white/15"
      />
      {file && (
        <p className="text-xs text-zinc-400">
          <span className="text-zinc-200">{file.name}</span> · {formatBytes(file.size)}
        </p>
      )}
    </label>
  );
}
