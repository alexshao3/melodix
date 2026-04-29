'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GradientButton, Monomark, Wordmark } from '@melodix/ui';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result =
        mode === 'login'
          ? await api.login(email || username, password)
          : await api.register(email, username, password);
      localStorage.setItem('melodix.token', result.token);
      router.push('/library');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto mt-10 w-full max-w-md">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl">
        <div aria-hidden className="aurora absolute inset-0 -z-10 opacity-40" />
        <div className="mb-6 flex items-center gap-2">
          <Monomark className="h-9 w-9" />
          <Wordmark className="text-xl text-white" />
        </div>
        <h1 className="font-display text-2xl font-bold text-white">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          {mode === 'login'
            ? 'Sign in to continue your sound journey.'
            : 'Sign up to save likes and playlists.'}
        </p>

        <form className="mt-6 flex flex-col gap-3" onSubmit={submit}>
          {mode === 'register' && (
            <input
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="Email"
              className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-[color:var(--accent-line)] focus:outline-none"
            />
          )}
          <input
            required
            value={mode === 'login' ? email : username}
            onChange={(e) =>
              mode === 'login' ? setEmail(e.target.value) : setUsername(e.target.value)
            }
            placeholder={mode === 'login' ? 'Email or username' : 'Username'}
            className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-[color:var(--accent-line)] focus:outline-none"
          />
          <input
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Password"
            className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-[color:var(--accent-line)] focus:outline-none"
          />
          {error && <div className="text-xs text-accent">{error}</div>}
          <GradientButton type="submit" size="md" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </GradientButton>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="mt-4 w-full text-center text-xs text-zinc-400 hover:text-white"
        >
          {mode === 'login'
            ? "Don't have an account? Create one"
            : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
