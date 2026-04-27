'use client';

import { useEffect, useState } from 'react';
import { Spinner } from '@melodix/ui';
import { adminApi, ApiError, type MusicSource } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/components/Toast';
import { PageHeader } from '@/components/PageHeader';

const SOURCE_DESCRIPTIONS: Record<string, string> = {
  jamendo: 'Public Jamendo catalog. Disable to hide all Jamendo-sourced tracks from the apps.',
  upload: 'Tracks uploaded via this admin panel and stored in Cloudflare R2.',
  fma: 'Free Music Archive — additional public catalog (planned).',
  demo: 'Bundled royalty-free demo tracks. Used as a fallback when Jamendo is unavailable.',
};

export default function SourcesPage() {
  const { signOut } = useAuth();
  const toast = useToast();
  const [sources, setSources] = useState<MusicSource[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyName, setBusyName] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .listSources()
      .then((s) => {
        setSources(s);
        setError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          signOut();
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load sources');
      });
  }, [signOut]);

  const toggle = async (source: MusicSource) => {
    setBusyName(source.name);
    const prev = sources;
    setSources(
      (curr) => curr?.map((s) => (s.id === source.id ? { ...s, enabled: !s.enabled } : s)) ?? curr,
    );
    try {
      const updated = await adminApi.toggleSource(source.name, !source.enabled);
      setSources((curr) => curr?.map((s) => (s.id === updated.id ? updated : s)) ?? curr);
      toast.success(`Source "${source.name}" ${updated.enabled ? 'enabled' : 'disabled'}.`);
    } catch (err) {
      setSources(prev);
      toast.error(err instanceof Error ? err.message : 'Failed to toggle source');
    } finally {
      setBusyName(null);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Music sources"
        description="Toggle which catalogs feed the Melodix apps. Disabled sources are filtered out before any merge — listeners stop seeing them immediately."
      />

      {error && (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      {!sources ? (
        <div className="flex h-32 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {sources.map((source) => (
            <li
              key={source.id}
              className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-semibold capitalize text-white">
                    {source.name}
                  </p>
                  <p className="text-xs text-zinc-400">
                    Priority {source.priority} ·{' '}
                    <span className={source.enabled ? 'text-emerald-300' : 'text-zinc-500'}>
                      {source.enabled ? 'enabled' : 'disabled'}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(source)}
                  disabled={busyName === source.name}
                  aria-pressed={source.enabled}
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
                    source.enabled ? 'bg-emerald-400/80' : 'bg-white/10'
                  } disabled:opacity-50`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      source.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-sm leading-relaxed text-zinc-300">
                {SOURCE_DESCRIPTIONS[source.name] ?? 'No description.'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
