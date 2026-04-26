import { BadRequestException, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthResponse, User } from '@melodix/shared';

interface TelegramInitData {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(email: string, username: string, password: string): Promise<AuthResponse> {
    if (!email || !username || !password) throw new BadRequestException('Missing fields');
    if (password.length < 6) throw new BadRequestException('Password must be at least 6 characters');

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) throw new BadRequestException('User with that email or username already exists');

    const hash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, username, password: hash, displayName: username },
    });

    return this.makeAuth(user);
  }

  async login(emailOrUsername: string, password: string): Promise<AuthResponse> {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: emailOrUsername }, { username: emailOrUsername }] },
    });
    if (!user || !user.password) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return this.makeAuth(user);
  }

  /**
   * Verify Telegram WebApp initData per https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
   * If TELEGRAM_BOT_TOKEN is not set, returns null and the caller should reject.
   */
  verifyTelegramInitData(initData: string): TelegramInitData | null {
    const botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set; cannot verify Telegram initData');
      return null;
    }
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;
    params.delete('hash');
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computed = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    if (computed !== hash) return null;
    const userJson = params.get('user');
    if (!userJson) return null;
    try {
      return JSON.parse(userJson) as TelegramInitData;
    } catch {
      return null;
    }
  }

  async telegramLogin(initData: string): Promise<AuthResponse> {
    const tg = this.verifyTelegramInitData(initData);
    if (!tg) throw new UnauthorizedException('Invalid Telegram initData');

    const telegramId = String(tg.id);
    const username = tg.username ?? `tg_${telegramId}`;
    const displayName = [tg.first_name, tg.last_name].filter(Boolean).join(' ') || username;

    const user = await this.prisma.user.upsert({
      where: { telegramId },
      update: { displayName, avatar: tg.photo_url },
      create: { telegramId, username, displayName, avatar: tg.photo_url },
    });
    return this.makeAuth(user);
  }

  private makeAuth(user: { id: string; username: string }): AuthResponse {
    const token = this.jwt.sign({ sub: user.id, username: user.username });
    return { token, user: this.toUser(user as Parameters<typeof this.toUser>[0]) };
  }

  private toUser(u: {
    id: string;
    username: string;
    email?: string | null;
    displayName?: string | null;
    avatar?: string | null;
    telegramId?: string | null;
    createdAt?: Date;
  }): User {
    return {
      id: u.id,
      username: u.username,
      email: u.email ?? null,
      displayName: u.displayName ?? null,
      avatar: u.avatar ?? null,
      telegramId: u.telegramId ?? null,
      createdAt: (u.createdAt ?? new Date()).toISOString(),
    };
  }
}
