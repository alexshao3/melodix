import { BadGatewayException, Injectable, Logger, RequestTimeoutException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Thin HTTP client for the Aeneas forced-aligner sidecar (see
 * `services/aeneas-aligner/`). Lives behind an interface so the admin
 * tracks service can be unit-tested without spinning up Python.
 */
export interface AlignerClient {
  align(input: AlignInput): Promise<AlignResult>;
}

export interface AlignInput {
  audioUrl: string;
  lyrics: string;
  language?: string;
}

export interface AlignResult {
  lrc: string;
  lineCount: number;
  durationS: number;
}

/** Aeneas runs roughly 10× realtime on CPU; a 5-min track aligns in ~30s.
 * Cap at 5 minutes to fail fast if the sidecar is wedged. */
const ALIGN_TIMEOUT_MS = 5 * 60 * 1000;

@Injectable()
export class LyricsAlignerService implements AlignerClient {
  private readonly logger = new Logger(LyricsAlignerService.name);
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = (
      config.get<string>('AENEAS_URL', 'http://aeneas:8000') || 'http://aeneas:8000'
    ).replace(/\/+$/, '');
  }

  async align(input: AlignInput): Promise<AlignResult> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ALIGN_TIMEOUT_MS);
    try {
      const res = await fetch(`${this.baseUrl}/align`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          audio_url: input.audioUrl,
          lyrics_text: input.lyrics,
          language: input.language ?? 'eng',
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const body = await safeText(res);
        this.logger.warn(`aeneas /align ${res.status}: ${body.slice(0, 500)}`);
        throw new BadGatewayException(`Aeneas aligner returned HTTP ${res.status}`);
      }
      const data = (await res.json()) as {
        lrc?: string;
        line_count?: number;
        duration_s?: number;
      };
      if (typeof data.lrc !== 'string' || data.lrc.length === 0) {
        throw new BadGatewayException('Aeneas aligner returned empty lrc');
      }
      return {
        lrc: data.lrc,
        lineCount: typeof data.line_count === 'number' ? data.line_count : 0,
        durationS: typeof data.duration_s === 'number' ? data.duration_s : 0,
      };
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') {
        throw new RequestTimeoutException(
          `Aeneas aligner timed out after ${ALIGN_TIMEOUT_MS / 1000}s`,
        );
      }
      if (err instanceof BadGatewayException || err instanceof RequestTimeoutException) {
        throw err;
      }
      this.logger.warn(`aeneas /align failed: ${(err as Error).message}`);
      throw new BadGatewayException('Aeneas aligner unreachable');
    } finally {
      clearTimeout(timer);
    }
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}
