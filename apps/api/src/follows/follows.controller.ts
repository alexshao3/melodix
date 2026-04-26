import { Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { FollowsService } from './follows.service';

interface AuthedRequest extends Request {
  user: { id: string; username: string };
}

@Controller('me/follows')
@UseGuards(AuthGuard('jwt'))
export class FollowsController {
  constructor(private readonly follows: FollowsService) {}

  /** List followed artists (hydrated via Jamendo). */
  @Get()
  list(@Req() req: AuthedRequest) {
    return this.follows.list(req.user.id);
  }

  /** List just the followed artist IDs — cheap call for "is following?" UI. */
  @Get('ids')
  ids(@Req() req: AuthedRequest) {
    return this.follows.ids(req.user.id);
  }

  @Post(':artistId')
  follow(@Req() req: AuthedRequest, @Param('artistId') artistId: string) {
    return this.follows.follow(req.user.id, artistId);
  }

  @Delete(':artistId')
  unfollow(@Req() req: AuthedRequest, @Param('artistId') artistId: string) {
    return this.follows.unfollow(req.user.id, artistId);
  }
}
