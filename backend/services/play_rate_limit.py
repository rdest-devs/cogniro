"""Per-IP sliding-window rate limit for POST /play/* (join + submit)."""

from __future__ import annotations

import threading
import time
from collections import OrderedDict, deque

from fastapi import HTTPException, Request

from core import settings

_lock = threading.Lock()
_by_ip: OrderedDict[str, deque[float]] = OrderedDict()
_last_compact_at = 0.0
# Cap distinct IPs tracked in memory; evicts LRU keys under spoofing bursts.
_MAX_TRACKED_IPS = 10_000
# Full-map sweep interval (stale keys are also dropped on per-IP access).
_COMPACT_INTERVAL_SEC = 60.0


def reset_play_rate_limit_for_tests() -> None:
    global _last_compact_at
    with _lock:
        _by_ip.clear()
        _last_compact_at = 0.0


def _compact_stale_ips(cut: float) -> None:
    """Remove IPs whose window has no remaining timestamps."""
    dead: list[str] = []
    for ip, dq in _by_ip.items():
        while dq and dq[0] < cut:
            dq.popleft()
        if not dq:
            dead.append(ip)
    for ip in dead:
        del _by_ip[ip]


def _deque_for_ip(ip: str) -> deque[float]:
    if ip in _by_ip:
        _by_ip.move_to_end(ip)
        return _by_ip[ip]
    while len(_by_ip) >= _MAX_TRACKED_IPS:
        _by_ip.popitem(last=False)
    dq: deque[float] = deque()
    _by_ip[ip] = dq
    return dq


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
        global _last_compact_at
        if now - _last_compact_at >= _COMPACT_INTERVAL_SEC:
            _compact_stale_ips(cut)
            _last_compact_at = now
        dq = _deque_for_ip(ip)
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
