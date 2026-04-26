import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';

class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  username!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

class LoginDto {
  @IsString()
  emailOrUsername!: string;

  @IsString()
  password!: string;
}

class TelegramDto {
  @IsString()
  initData!: string;
}

/**
 * Auth endpoints opt into the stricter `auth` throttler bucket (10 req / 60 s
 * per IP) on top of the global `short`/`default` defaults — register/login
 * are the only externally-controllable ways to provoke a bcrypt round, so
 * we cap them aggressively. See ADR-0013.
 */
@Controller('auth')
@Throttle({ auth: { limit: 10, ttl: 60_000 } })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.username, dto.password);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.emailOrUsername, dto.password);
  }

  @Post('telegram')
  telegram(@Body() dto: TelegramDto) {
    return this.auth.telegramLogin(dto.initData);
  }
}
