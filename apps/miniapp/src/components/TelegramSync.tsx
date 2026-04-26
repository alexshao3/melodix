'use client';

import { useEffect } from 'react';
import { getTelegramWebApp } from '@/lib/telegram';
import { api } from '@/lib/api';

export function TelegramSync() {
  useEffect(() => {
    const wa = getTelegramWebApp();
    if (!wa) return;
    wa.ready();
    wa.expand();

    // Try Telegram-based auth, gracefully degrade if not available
    if (wa.initData) {
      api.telegramLogin(wa.initData).then((resp) => {
        if (resp?.token && typeof window !== 'undefined') {
          localStorage.setItem('melodix.token', resp.token);
        }
      });
    }
  }, []);
  return null;
}
