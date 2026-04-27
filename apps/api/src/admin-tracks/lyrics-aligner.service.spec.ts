import { BadGatewayException, RequestTimeoutException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { LyricsAlignerService } from './lyrics-aligner.service';

/**
 * Unit-tests for the Aeneas HTTP client. The sidecar itself is a Python
 * service; we mock `global.fetch` to assert request shape and verify the
 * three error-translation paths (HTTP ≠ 2xx, malformed body, AbortError).
 */

const config = {
  get: <T>(_key: string, defaultValue?: T) => defaultValue,
} as unknown as ConfigService;

function makeService() {
  return new LyricsAlignerService(config);
}

describe('LyricsAlignerService', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('forwards audio + lyrics + language to the sidecar', async () => {
    const captured: { url: string; init: RequestInit }[] = [];
    global.fetch = (async (url: string, init: RequestInit) => {
      captured.push({ url, init });
      return new Response(
        JSON.stringify({ lrc: '[00:00.00]hello\n', line_count: 1, duration_s: 12.5 }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }) as unknown as typeof fetch;

    const out = await makeService().align({
      audioUrl: '/api/storage/tracks/abc.mp3',
      lyrics: 'hello\nworld',
      language: 'vie',
    });

    expect(out).toEqual({ lrc: '[00:00.00]hello\n', lineCount: 1, durationS: 12.5 });
    expect(captured).toHaveLength(1);
    expect(captured[0]!.url).toBe('http://aeneas:8000/align');
    expect(captured[0]!.init.method).toBe('POST');
    expect(JSON.parse(captured[0]!.init.body as string)).toEqual({
      audio_url: '/api/storage/tracks/abc.mp3',
      lyrics_text: 'hello\nworld',
      language: 'vie',
    });
  });

  test('defaults the language to "eng" when omitted', async () => {
    const captured: RequestInit[] = [];
    global.fetch = (async (_url: string, init: RequestInit) => {
      captured.push(init);
      return new Response(JSON.stringify({ lrc: '[00:00.00]x\n' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as unknown as typeof fetch;
    await makeService().align({ audioUrl: '/x', lyrics: 'x' });
    expect(JSON.parse(captured[0]!.body as string).language).toBe('eng');
  });

  test('translates non-2xx into BadGatewayException', async () => {
    global.fetch = (async () => new Response('boom', { status: 500 })) as unknown as typeof fetch;
    await expect(makeService().align({ audioUrl: '/x', lyrics: 'x' })).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  test('rejects an empty `lrc` body as a BadGateway', async () => {
    global.fetch = (async () =>
      new Response(JSON.stringify({ lrc: '' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })) as unknown as typeof fetch;
    await expect(makeService().align({ audioUrl: '/x', lyrics: 'x' })).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  test('translates AbortError into RequestTimeoutException', async () => {
    global.fetch = (async () => {
      const e = new Error('aborted');
      (e as { name: string }).name = 'AbortError';
      throw e;
    }) as unknown as typeof fetch;
    await expect(makeService().align({ audioUrl: '/x', lyrics: 'x' })).rejects.toBeInstanceOf(
      RequestTimeoutException,
    );
  });

  test('translates other network failures into BadGateway', async () => {
    global.fetch = (async () => {
      throw new Error('ECONNREFUSED');
    }) as unknown as typeof fetch;
    await expect(makeService().align({ audioUrl: '/x', lyrics: 'x' })).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});
