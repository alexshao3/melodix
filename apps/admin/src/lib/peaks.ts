/**
 * Generate a downsampled, normalized waveform peaks array from an audio
 * file, **client-side**, so we never need ffmpeg / `audiowaveform` on the
 * API container. The browser already decoded this file once for the
 * duration probe; we reuse that capability here.
 *
 * Algorithm:
 *  1. Decode the file into a `Float32Array` PCM buffer with `OfflineAudioContext`.
 *  2. Average all channels into a mono signal.
 *  3. Slice that signal into `bucketCount` equal-length windows and take
 *     the **maximum absolute amplitude** per window. Max (rather than RMS)
 *     produces a visibly punchy waveform that matches what desktop audio
 *     editors render.
 *  4. Normalize the resulting bucket maxima against the global max so the
 *     loudest bar is exactly 1.0. This makes quiet recordings render
 *     just as legibly as loud ones.
 *  5. Round to 4 decimals to keep the JSON payload small (~2 KB at 200
 *     buckets).
 *
 * If `decodeAudioData` throws (unsupported codec, corrupt file), we resolve
 * to `null` rather than rejecting — the upload still succeeds, the track
 * just falls back to the plain progress-bar UI in the players.
 */
export async function generatePeaks(file: File, bucketCount = 200): Promise<number[] | null> {
  if (typeof window === 'undefined') return null;

  const AudioContextCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return null;

  let audioBuffer: AudioBuffer;
  try {
    const arrayBuffer = await file.arrayBuffer();
    // A short-lived AudioContext just for decoding. We don't actually
    // play the buffer — `decodeAudioData` is the only API we need and
    // it works on an offline context too in modern browsers, but using
    // a regular `AudioContext` has the widest compatibility.
    const tmpCtx = new AudioContextCtor();
    try {
      audioBuffer = await tmpCtx.decodeAudioData(arrayBuffer.slice(0));
    } finally {
      void tmpCtx.close();
    }
  } catch {
    return null;
  }

  const channels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  if (length === 0 || channels === 0) return null;

  // Average the channels in-place into a single Float32Array. This avoids
  // allocating one buffer per channel for long tracks.
  const mono = new Float32Array(length);
  for (let c = 0; c < channels; c++) {
    const channelData = audioBuffer.getChannelData(c);
    for (let i = 0; i < length; i++) mono[i] += channelData[i] / channels;
  }

  const bucketSize = Math.max(1, Math.floor(length / bucketCount));
  const peaks = new Array<number>(bucketCount);
  let globalMax = 0;
  for (let b = 0; b < bucketCount; b++) {
    const start = b * bucketSize;
    const end = b === bucketCount - 1 ? length : Math.min(length, start + bucketSize);
    let max = 0;
    for (let i = start; i < end; i++) {
      const v = mono[i];
      const abs = v < 0 ? -v : v;
      if (abs > max) max = abs;
    }
    peaks[b] = max;
    if (max > globalMax) globalMax = max;
  }

  if (globalMax === 0) return null;
  for (let b = 0; b < bucketCount; b++) {
    peaks[b] = Math.round((peaks[b] / globalMax) * 10000) / 10000;
  }
  return peaks;
}
