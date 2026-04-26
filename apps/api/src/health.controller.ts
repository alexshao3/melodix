import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

/**
 * Liveness probe. Skipped from rate-limiting on purpose — load-balancers and
 * uptime checkers may hit this once per second.
 */
@Controller('health')
@SkipThrottle()
export class HealthController {
  @Get()
  health() {
    return {
      status: 'ok',
      service: 'melodix-api',
      timestamp: new Date().toISOString(),
    };
  }
}
