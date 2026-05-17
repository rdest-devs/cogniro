"""Title slug + result-filename composer."""

from __future__ import annotations

import datetime as dt
import re
import unicodedata

_MAX_SLUG_LEN = 60
_NON_ALNUM = re.compile(r"[^a-z0-9]+")
# NFKD does not decompose Polish ł; map explicitly so titles like "Tytuł" keep the "l".
_POLISH_L = str.maketrans({"ł": "l", "Ł": "l"})


def slugify_title(title: str) -> str:
    if not title:
        return "quiz"
    title = title.translate(_POLISH_L)
    normalized = unicodedata.normalize("NFKD", title)
    ascii_only = normalized.encode("ascii", "ignore").decode("ascii").lower()
    collapsed = _NON_ALNUM.sub("-", ascii_only).strip("-")
    return (collapsed or "quiz")[:_MAX_SLUG_LEN].strip("-") or "quiz"


def compose_result_filename(
    *,
    quiz_id: str,
    quiz_title: str,
    stopped_at: dt.datetime,
    existing: set[str],
) -> str:
    slug = slugify_title(quiz_title)
    time_str = stopped_at.strftime("%H-%M-%S")
    base = f"{quiz_id}_{slug}_{time_str}"
    candidate = f"{base}.json"
    if candidate not in existing:
        return candidate
    suffix = 2
    while True:
        candidate = f"{base}-{suffix}.json"
        if candidate not in existing:
            return candidate
        suffix += 1
