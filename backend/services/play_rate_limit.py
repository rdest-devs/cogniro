"""Per-IP sliding-window rate limit for POST /play/* (join + submit)."""

from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

from core import settings

_lock = threading.Lock()
_by_ip: dict[str, deque[float]] = defaultdict(deque)


def reset_play_rate_limit_for_tests() -> None:
    with _lock:
        _by_ip.clear()


def client_ip_for_play(request: Request) -> str:
    """Client IP for rate limiting.

    When ``PLAY_RATE_LIMIT_TRUST_X_FORWARDED_FOR`` is true, uses the first
    hop in ``X-Forwarded-For`` (set this only behind a trusted reverse proxy).
    """
    if settings.PLAY_RATE_LIMIT_TRUST_X_FORWARDED_FOR:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            first = forwarded.split(",")[0].strip()
            if first:
                return first
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def enforce_play_rate_limit(request: Request) -> None:
    """Raise HTTP 429 if this IP exceeded the configured join+submit budget."""
    if not settings.PLAY_RATE_LIMIT_ENABLED:
        return
    window = float(settings.PLAY_RATE_LIMIT_WINDOW_SEC)
    cap = settings.PLAY_RATE_LIMIT_MAX_REQUESTS
    ip = client_ip_for_play(request)
    now = time.monotonic()
    cut = now - window

    with _lock:
        dq = _by_ip[ip]
        while dq and dq[0] < cut:
            dq.popleft()
        if len(dq) >= cap:
            oldest = dq[0]
            retry_after = max(1, int(oldest + window - now + 0.999))
            raise HTTPException(
                status_code=429,
                detail="rate_limited",
                headers={"Retry-After": str(retry_after)},
            )
        dq.append(now)
