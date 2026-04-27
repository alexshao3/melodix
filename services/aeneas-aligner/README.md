# Aeneas aligner sidecar

Forced-aligns plain-text lyrics to an audio file and returns LRC. Used by the
Melodix API to auto-sync lyrics on uploaded tracks (e.g. SUNO AI generations).
See [`.agents/context/DECISIONS.md` ADR-0030](../../.agents/context/DECISIONS.md)
for the design rationale.

## Endpoint

`POST /align`

```jsonc
// Request
{
  "audio_url": "/api/storage/tracks/abc.mp3", // absolute or relative
  "lyrics_text": "First line\nSecond line\n…", // newline-separated
  "language": "eng", // ISO 639-3, default "eng"
}
```

```jsonc
// Response
{
  "lrc": "[00:00.50]First line\n[00:04.20]Second line\n",
  "line_count": 2,
  "duration_s": 187.4,
}
```

## Run standalone (debug)

```bash
docker build -t melodix-aeneas services/aeneas-aligner
docker run --rm -p 8000:8000 melodix-aeneas
curl -fsS http://localhost:8000/health
```

The service is intended to live on the docker-compose internal network as
`aeneas:8000`; nothing outside the network should ever reach it.
