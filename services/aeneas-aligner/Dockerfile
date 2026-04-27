# Aeneas forced-aligner sidecar.
#
# Aeneas (https://github.com/readbeyond/aeneas) needs:
#   - python3 + numpy (from system or pip)
#   - ffmpeg (for audio decoding)
#   - espeak (for TTS-based reference signal generation)
#
# We pin Python 3.11 because Aeneas does not yet declare 3.12 compatibility.
FROM python:3.11-slim-bookworm AS base

# System deps. `--no-install-recommends` keeps the image lean. `espeak` is
# the classic eSpeak (not espeak-ng) because Aeneas's `cew` C extension
# binds to its API; espeak-ng-only systems require extra glue.
RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        espeak \
        libespeak-dev \
        build-essential \
        pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Aeneas + a lightweight FastAPI wrapper. Versions pinned to known-good
# combinations (numpy <2 is required for aeneas's C extension).
RUN pip install --no-cache-dir \
        "numpy<2" \
        aeneas==1.7.3.0 \
        fastapi==0.115.0 \
        "uvicorn[standard]==0.30.6" \
        httpx==0.27.2

WORKDIR /app
COPY app.py ./app.py

# Healthcheck pings the FastAPI /health endpoint so docker-compose can
# wait for the sidecar before the main API starts calling it.
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health').status == 200 else 1)" || exit 1

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
