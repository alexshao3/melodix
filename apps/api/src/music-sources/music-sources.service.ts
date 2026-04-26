import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_SOURCES = [
  { name: 'jamendo', enabled: true, priority: 0 },
  { name: 'upload', enabled: true, priority: 1 },
];

@Injectable()
export class MusicSourcesService {
  private readonly logger = new Logger(MusicSourcesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async ensureDefaults(): Promise<void> {
    for (const src of DEFAULT_SOURCES) {
      await this.prisma.musicSource.upsert({
        where: { name: src.name },
        create: src,
        update: {},
      });
    }
  }

  async list() {
    return this.prisma.musicSource.findMany({ orderBy: { priority: 'asc' } });
  }

  async toggle(name: string, enabled: boolean) {
    return this.prisma.musicSource.update({
      where: { name },
      data: { enabled },
    });
  }

  async isEnabled(name: string): Promise<boolean> {
    const source = await this.prisma.musicSource.findUnique({
      where: { name },
    });
    return source?.enabled ?? true;
  }
}
