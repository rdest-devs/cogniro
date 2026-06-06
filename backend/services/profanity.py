"""Automatic nickname moderation.

Wraps `glin-profanity <https://pypi.org/project/glin-profanity/>`_ to reject
vulgar nicknames in Polish and English before a participant joins a session.

The previous placeholder implementation always accepted every nickname; this
module replaces it with a real profanity check. The detection uses the library
default of word-boundary matching (no aggressive obfuscation matching) so that
legitimate nicknames containing an embedded short word (e.g. "assassin",
"classic") are not flagged as false positives. Admins can still manually block
anything the automatic filter lets through.
"""

from __future__ import annotations

from functools import lru_cache

from glin_profanity import Filter

# Languages the automatic filter screens against. Polish is the primary
# audience; English is included because vulgar English nicknames are common.
_LANGUAGES = ["polish", "english"]


@lru_cache(maxsize=1)
def _filter() -> Filter:
    """Build the profanity filter once and reuse it across requests."""
    return Filter({"languages": _LANGUAGES})


def is_nickname_allowed(nickname: str) -> bool:
    """Return ``True`` when the nickname is clean (contains no profanity).

    An empty/whitespace-only nickname is treated as allowed here; length and
    emptiness are enforced separately by the request schema.
    """
    text = nickname.strip()
    if not text:
        return True
    return not _filter().is_profane(text)
