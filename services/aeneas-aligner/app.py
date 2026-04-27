"""Aeneas forced-aligner sidecar.

Exposes a single endpoint, `POST /align`, that takes raw audio + plain-text
lyrics and returns line-level timestamps in standard LRC format. Aeneas does
the heavy lifting (DTW between the input audio's MFCC and a TTS-synthesized
reference of the lyrics text via eSpeak), so accuracy is high *because* we
already have the exact lyrics — no ASR / hallucination involved.

The Melodix API is the only intended client; it calls this on the internal
Docker network at http://aeneas:8000/align. Nothing here is exposed publicly.

Why FastAPI: Aeneas's own CLI is awkward for a service (writes temp files,
verbose env-var config), and we want a typed JSON contract.
"""

from __future__ import annotations

import json
import logging
import os
import subprocess
import tempfile
import urllib.request
from pathlib import Path
from typing import Annotated

import httpx
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("aeneas-aligner")

app = FastAPI(title="Melodix Aeneas Aligner", version="1.0")

# Defensive cap. Aeneas runs on CPU, ~10x realtime; a 10-min track aligns in
# roughly a minute. We block above 20 min to avoid runaway containers.
MAX_AUDIO_DURATION_S = 20 * 60

# Where the API can fetch audio from. Defaults to the docker-compose API
# service hostname; override via env if the layout changes.
API_INTERNAL_URL = os.environ.get("API_INTERNAL_URL", "http://api:4000").rstrip("/")


class AlignRequest(BaseModel):
    """Request body for /align."""

    audio_url: Annotated[
        str,
        Field(
            description=(
                "URL the sidecar should fetch the audio from. May be absolute "
                "(https://...) or relative (/api/storage/...) — relative URLs "
                "are resolved against API_INTERNAL_URL so postgres-backend "
                "audio (ADR-0026/0029) works without exposing the API publicly."
            ),
            min_length=1,
            max_length=2048,
        ),
    ]
    lyrics_text: Annotated[
        str,
        Field(
            description="Plain-text lyrics; one line per LRC line.",
            min_length=1,
            max_length=64_000,
        ),
    ]
    language: Annotated[
        str,
        Field(
            default="eng",
            description=(
                "ISO 639-3 code for Aeneas's eSpeak voice. Defaults to 'eng'; "
                "use 'vie' for Vietnamese, 'cmn' for Mandarin, etc. See "
                "https://www.readbeyond.it/aeneas/docs/libraries.html#supported-languages"
            ),
        ),
    ] = "eng"


class AlignResponse(BaseModel):
    lrc: str = Field(description="Synced lyrics in standard LRC format.")
    line_count: int = Field(description="Number of aligned lines emitted.")
    duration_s: float = Field(description="Detected audio duration in seconds.")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/align", response_model=AlignResponse)
def align(req: AlignRequest) -> AlignResponse:
    lines = _split_lyrics(req.lyrics_text)
    if not lines:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="lyrics_text contains no non-empty lines",
        )

    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        audio_path = tmp_dir / "audio.bin"
        text_path = tmp_dir / "lyrics.txt"
        out_path = tmp_dir / "aligned.json"

        _download(req.audio_url, audio_path)
        duration = _probe_duration(audio_path)
        if duration > MAX_AUDIO_DURATION_S:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"audio is {duration:.0f}s; max allowed is {MAX_AUDIO_DURATION_S}s",
            )

        # Aeneas reads "plain" task-text format: one line of input = one
        # fragment to align. That maps 1:1 to LRC line granularity.
        text_path.write_text("\n".join(lines), encoding="utf-8")

        config = (
            f"task_language={req.language}|"
            "is_text_type=plain|"
            "os_task_file_format=json"
        )

        # Aeneas's Python entrypoint is `python -m aeneas.tools.execute_task`.
        # We invoke it as a subprocess so any segfault (its C extension is
        # not always reentrant) is contained.
        cmd = [
            "python",
            "-m",
            "aeneas.tools.execute_task",
            str(audio_path),
            str(text_path),
            config,
            str(out_path),
        ]
        log.info("aligning %s lines (lang=%s, %.1fs audio)", len(lines), req.language, duration)
        proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
        if proc.returncode != 0:
            log.error("aeneas failed: rc=%s stderr=%s", proc.returncode, proc.stderr[-2000:])
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"aeneas exited with rc={proc.returncode}",
            )

        with out_path.open("r", encoding="utf-8") as f:
            payload = json.load(f)

    fragments = payload.get("fragments", [])
    lrc = _to_lrc(fragments)
    return AlignResponse(lrc=lrc, line_count=len(fragments), duration_s=duration)


def _split_lyrics(text: str) -> list[str]:
    """Split lyrics into the units we want a timestamp per. Strip empties so
    the LRC doesn't have orphan blank rows; keep the order so verse/chorus
    structure survives."""
    return [line.strip() for line in text.replace("\r\n", "\n").split("\n") if line.strip()]


def _download(url: str, dest: Path) -> None:
    """Fetch the audio file. Relative URLs are resolved against the API's
    internal URL so postgres-backend tracks (which store relative paths,
    ADR-0029) work without exposing the API publicly."""
    if url.startswith("/"):
        url = f"{API_INTERNAL_URL}{url}"
    log.info("downloading %s", url)
    try:
        with httpx.stream("GET", url, timeout=60.0, follow_redirects=True) as r:
            r.raise_for_status()
            with dest.open("wb") as f:
                for chunk in r.iter_bytes(chunk_size=64 * 1024):
                    f.write(chunk)
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"failed to download audio: {e}",
        ) from e


def _probe_duration(path: Path) -> float:
    """ffprobe's `format=duration` is robust across MP3/WAV/M4A/OGG."""
    out = subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=nokey=1:noprint_wrappers=1",
            str(path),
        ],
        text=True,
    ).strip()
    try:
        return float(out)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"could not parse duration from ffprobe output: {out!r}",
        ) from e


def _to_lrc(fragments: list[dict]) -> str:
    """Convert Aeneas's JSON fragment list to an LRC document.

    Each fragment has `begin` (seconds, string), `end` (string), and `lines`
    (a one-element list because we used `is_text_type=plain`). LRC timestamps
    are `[mm:ss.xx]` — two-digit centiseconds, not milliseconds.
    """
    out: list[str] = []
    for frag in fragments:
        try:
            begin = float(frag["begin"])
        except (KeyError, ValueError):
            continue
        text_lines = frag.get("lines", [])
        text = text_lines[0] if text_lines else ""
        out.append(f"[{_fmt_lrc(begin)}]{text}")
    return "\n".join(out) + "\n"


def _fmt_lrc(seconds: float) -> str:
    minutes = int(seconds // 60)
    rest = seconds - 60 * minutes
    return f"{minutes:02d}:{rest:05.2f}"
