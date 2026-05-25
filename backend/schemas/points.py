"""Shared rules for per-question scoring weight in KQF and admin payloads."""


def normalize_question_points(value: object) -> int:
    """Legacy quizzes may omit points or use 0; treat as 1 so totals stay well-defined."""
    if value is None:
        return 1
    if isinstance(value, bool):
        return 1
    try:
        n = int(value)  # type: ignore[arg-type]
    except TypeError, ValueError:
        return 1
    return n if n >= 1 else 1
