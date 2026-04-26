import { Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { UsersService } from './users.service';

interface AuthedRequest extends Request {
  user: { id: string; username: string };
}

@Controller('me')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  me(@Req() req: AuthedRequest) {
    return this.users.me(req.user.id);
  }

  @Get('likes')
  likes(@Req() req: AuthedRequest) {
    return this.users.likes(req.user.id);
  }

  @Post('likes/:trackId')
  like(@Req() req: AuthedRequest, @Param('trackId') trackId: string) {
    return this.users.like(req.user.id, trackId);
  }

  @Delete('likes/:trackId')
  unlike(@Req() req: AuthedRequest, @Param('trackId') trackId: string) {
    return this.users.unlike(req.user.id, trackId);
  }
}
