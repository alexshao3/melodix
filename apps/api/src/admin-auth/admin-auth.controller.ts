import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto, CreateAdminDto } from './admin-auth.dto';

@Controller('admin/auth')
@Throttle({ auth: { limit: 10, ttl: 60_000 } })
export class AdminAuthController {
  constructor(private readonly adminAuth: AdminAuthService) {}

  @Post('login')
  login(@Body() dto: AdminLoginDto) {
    return this.adminAuth.login(dto.username, dto.password);
  }

  @Post('setup')
  createAdmin(@Body() dto: CreateAdminDto) {
    return this.adminAuth.createAdmin(dto.username, dto.password);
  }
}
