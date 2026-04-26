import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

export interface AdminJwtPayload {
  sub: string;
  username: string;
  isAdmin: true;
}

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(username: string, password: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { username } });
    if (!admin) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const payload: AdminJwtPayload = {
      sub: admin.id,
      username: admin.username,
      isAdmin: true,
    };
    const token = this.jwt.sign(payload);
    return { token, admin: { id: admin.id, username: admin.username } };
  }

  async createAdmin(username: string, password: string) {
    const count = await this.prisma.adminUser.count();
    if (count > 0) throw new ForbiddenException('Admin already set up');

    if (!username || !password) throw new BadRequestException('Missing fields');
    if (password.length < 6)
      throw new BadRequestException('Password must be at least 6 characters');

    const hash = await bcrypt.hash(password, 10);
    const admin = await this.prisma.adminUser.create({
      data: { username, password: hash },
    });
    return { id: admin.id, username: admin.username };
  }
}
