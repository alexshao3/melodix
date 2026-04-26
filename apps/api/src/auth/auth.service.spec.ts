import * as crypto from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { PrismaService } from '../prisma/prisma.service';

type UserRow = {
  id: string;
  username: string;
  email: string | null;
  password: string | null;
  displayName: string | null;
  avatar: string | null;
  telegramId: string | null;
  createdAt: Date;
};

/**
 * Build an in-memory PrismaService stub that's just enough for AuthService.
 * We deliberately avoid mocking bcrypt — we want to assert on the real hash.
 */
function buildPrismaStub() {
  const users: UserRow[] = [];
  return {
    users,
    user: {
      findFirst: jest.fn(async ({ where }: { where: { OR?: Array<Record<string, string>> } }) => {
        if (!where?.OR) return null;
        return (
          users.find((u) =>
            where.OR!.some((cond) =>
              Object.entries(cond).every(([k, v]) => (u as Record<string, unknown>)[k] === v),
            ),
          ) ?? null
        );
      }),
      create: jest.fn(async ({ data }: { data: Partial<UserRow> }) => {
        const now = new Date();
        const row: UserRow = {
          id: `u_${users.length + 1}`,
          username: data.username ?? '',
          email: data.email ?? null,
          password: data.password ?? null,
          displayName: data.displayName ?? null,
          avatar: data.avatar ?? null,
          telegramId: data.telegramId ?? null,
          createdAt: now,
        };
        users.push(row);
        return row;
      }),
      upsert: jest.fn(
        async ({
          where,
          create,
          update,
        }: {
          where: { telegramId: string };
          create: Partial<UserRow>;
          update: Partial<UserRow>;
        }) => {
          const existing = users.find((u) => u.telegramId === where.telegramId);
          if (existing) {
            Object.assign(existing, update);
            return existing;
          }
          const row: UserRow = {
            id: `u_${users.length + 1}`,
            username: create.username ?? '',
            email: create.email ?? null,
            password: create.password ?? null,
            displayName: create.displayName ?? null,
            avatar: create.avatar ?? null,
            telegramId: create.telegramId ?? null,
            createdAt: new Date(),
          };
          users.push(row);
          return row;
        },
      ),
    },
  };
}

function buildConfig(env: Record<string, string | undefined>): ConfigService {
  return { get: (key: string) => env[key] } as unknown as ConfigService;
}

function buildJwt(): JwtService {
  // The real JwtService requires a secret in module config; just stub `sign`.
  return { sign: jest.fn(() => 'jwt-token') } as unknown as JwtService;
}

/** Build a valid Telegram WebApp `initData` string signed with the given bot token. */
function signInitData(botToken: string, fields: Record<string, string>): string {
  const params = new URLSearchParams(fields);
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  params.set('hash', hash);
  return params.toString();
}

describe('AuthService', () => {
  let prisma: ReturnType<typeof buildPrismaStub>;
  let service: AuthService;

  beforeEach(() => {
    prisma = buildPrismaStub();
    service = new AuthService(
      prisma as unknown as PrismaService,
      buildJwt(),
      buildConfig({ TELEGRAM_BOT_TOKEN: 'test-bot-token' }),
    );
  });

  describe('register / login (password flow)', () => {
    it('hashes the password before storing it', async () => {
      await service.register('alice@example.com', 'alice', 'hunter22');
      expect(prisma.users).toHaveLength(1);
      const stored = prisma.users[0];
      expect(stored.password).toBeTruthy();
      expect(stored.password).not.toBe('hunter22');
      // bcrypt hashes look like $2a$/$2b$ with a 60-char body.
      expect(stored.password!.length).toBeGreaterThanOrEqual(60);
      expect(stored.password!.startsWith('$2')).toBe(true);
    });

    it('rejects passwords shorter than 6 characters', async () => {
      await expect(service.register('a@b.co', 'alice', 'short')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('logs in with the correct password and rejects the wrong one', async () => {
      await service.register('alice@example.com', 'alice', 'hunter22');

      const ok = await service.login('alice', 'hunter22');
      expect(ok.token).toBe('jwt-token');
      expect(ok.user.username).toBe('alice');

      await expect(service.login('alice', 'wrong-password')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('refuses to register a duplicate email or username', async () => {
      await service.register('alice@example.com', 'alice', 'hunter22');
      await expect(
        service.register('alice@example.com', 'alice2', 'hunter22'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('verifyTelegramInitData', () => {
    it('accepts a correctly-signed payload', () => {
      const initData = signInitData('test-bot-token', {
        auth_date: '1700000000',
        user: JSON.stringify({ id: 42, first_name: 'Bob', username: 'bob' }),
      });
      const result = service.verifyTelegramInitData(initData);
      expect(result).toEqual({ id: 42, first_name: 'Bob', username: 'bob' });
    });

    it('rejects a tampered hash', () => {
      const initData = signInitData('test-bot-token', {
        auth_date: '1700000000',
        user: JSON.stringify({ id: 42, first_name: 'Bob' }),
      });
      const tampered = initData.replace(/hash=[a-f0-9]+/, 'hash=' + 'a'.repeat(64));
      expect(service.verifyTelegramInitData(tampered)).toBeNull();
    });

    it('returns null when TELEGRAM_BOT_TOKEN is unset', () => {
      const noTokenService = new AuthService(
        prisma as unknown as PrismaService,
        buildJwt(),
        buildConfig({}),
      );
      const initData = signInitData('any', {
        auth_date: '1700000000',
        user: JSON.stringify({ id: 1 }),
      });
      expect(noTokenService.verifyTelegramInitData(initData)).toBeNull();
    });
  });

  describe('telegramLogin', () => {
    it('upserts a user and issues a JWT for a valid signed payload', async () => {
      const initData = signInitData('test-bot-token', {
        auth_date: '1700000000',
        user: JSON.stringify({ id: 99, first_name: 'Carol', last_name: 'Q', username: 'carolq' }),
      });
      const result = await service.telegramLogin(initData);
      expect(result.token).toBe('jwt-token');
      expect(result.user.username).toBe('carolq');
      expect(prisma.users).toHaveLength(1);
      expect(prisma.users[0].telegramId).toBe('99');
      expect(prisma.users[0].displayName).toBe('Carol Q');
    });

    it('rejects an invalid payload', async () => {
      await expect(service.telegramLogin('hash=bad&user=%7B%7D')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
