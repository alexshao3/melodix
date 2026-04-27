'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, Lock, UserPlus } from 'lucide-react';
import { GradientButton } from '@melodix/ui';
import { adminApi, ApiError } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

type Mode = 'login' | 'setup';

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { signIn } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'setup' && password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'setup') {
        await adminApi.setup(username, password);
        // After creating the first admin, log them in immediately.
      }
      const result = await adminApi.login(username, password);
      signIn(result.token, result.admin);
      const next = params.get('next') ?? '/';
      router.replace(next.startsWith('/') ? next : '/');
    } catch (err) {
      if (err instanceof ApiError && err.status === 403 && mode === 'setup') {
        setError('Setup is locked — an admin already exists. Please sign in instead.');
        setMode('login');
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-16">
      <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl">
        <div
          aria-hidden
          className="aurora animate-gradient-pan absolute inset-0 -z-10 opacity-40"
        />

        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-fuchsia-500 to-rose-500">
            <Sparkles className="h-4 w-4 text-white" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-white">
            Melodix
            <span className="ml-1 text-xs font-medium text-zinc-400">/ admin</span>
          </span>
        </div>

        <h1 className="font-display text-2xl font-bold text-white">
          {mode === 'login' ? 'Admin sign in' : 'First-time admin setup'}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          {mode === 'login'
            ? 'Enter your admin credentials to manage uploaded tracks and music sources.'
            : 'Create the first admin account. Once set, this form locks — there is no second-time setup.'}
        </p>

        <form className="mt-6 flex flex-col gap-3" onSubmit={submit}>
          <input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="username"
            className="admin-input"
          />
          <input
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="admin-input"
          />
          {mode === 'setup' && (
            <input
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              type="password"
              placeholder="Confirm password"
              autoComplete="new-password"
              className="admin-input"
            />
          )}

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
            >
              {error}
            </div>
          )}

          <GradientButton type="submit" disabled={loading} className="mt-2 w-full justify-center">
            {loading ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create admin & sign in'}
          </GradientButton>
        </form>

        <div className="mt-6 flex items-center justify-between text-xs text-zinc-400">
          {mode === 'login' ? (
            <>
              <span className="inline-flex items-center gap-1.5">
                <Lock className="h-3 w-3" /> Admin-only area
              </span>
              <button
                type="button"
                onClick={() => setMode('setup')}
                className="inline-flex items-center gap-1.5 text-cyan-300 hover:text-cyan-200"
              >
                <UserPlus className="h-3 w-3" />
                First-time setup
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setMode('login')}
              className="text-cyan-300 hover:text-cyan-200"
            >
              ← Back to sign in
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
