"""KQF parser/serializer — the only module that reads or writes .kqf text.

See docs/quiz-format-docs.md for the format spec.
"""

from __future__ import annotations

import io
import os
import random
import re
from pathlib import Path
from urllib.parse import urlparse

import frontmatter
from pydantic import ValidationError

from schemas.kqf import (
    KqfChoice,
    KqfFrontMatter,
    KqfMedia,
    KqfMultiChoice,
    KqfOrdering,
    KqfQuiz,
    KqfSingleChoice,
    KqfSlider,
    KqfTrueFalse,
)

_ASSET_ID_TAIL = re.compile(r"(asset_[0-9a-f]{32})$", re.IGNORECASE)


def _normalize_kqf_stored_image_path(value: str) -> str:
    """KQF stores ``@image`` as ``./media/{asset_id}`` (directory), never ``…/image.webp``."""
    s = value.strip()
    if not s:
        return s
    path = s
    if s.lower().startswith(("http://", "https://")):
        try:
            path = urlparse(s).path
        except ValueError:
            path = s
    stripped = re.sub(r"/image\.webp$", "", path, flags=re.IGNORECASE)
    stripped = re.sub(r"/thumb\.webp$", "", stripped, flags=re.IGNORECASE)
    stripped = stripped.rstrip("/")
    m = _ASSET_ID_TAIL.search(stripped)
    if m:
        return f"./media/{m.group(1)}"
    return s


_HEADER_RE = re.compile(
    r"^##\s+(?P<id>[A-Za-z0-9_-]+)\s*\|\s*(?P<type>singlechoice|multichoice|truefalse|slider|ordering)"
    r"(?:\s*\|\s*(?P<time>\d+)s)?(?:\s*\|\s*(?P<points>\d+)pts)?\s*$"
)
_CHOICE_RE = re.compile(r"^-\s*\[(?P<mark>[ xX])\](?:\s+(?P<text>.+?))?\s*$")
_PLAIN_ITEM_RE = re.compile(r"^-\s+(?!\[)(?P<text>.+?)\s*$")
_DIRECTIVE_RE = re.compile(r"^@(?P<key>image|video|audio|hint):\s*(?P<value>.+?)\s*$")
_ORDER_DIRECTIVE_RE = re.compile(r"^@order:\s*(?P<value>.+?)\s*$")
_SLIDER_FIELD_RE = re.compile(
    r"^\s{2,}(?P<key>correct|min|max|step|tolerance|unit|score|label_min|label_max):\s*(?P<value>.+?)\s*$"
)
_ORDER_ITEMS_FIELD_RE = re.compile(r"^\s{2,}(?P<key>\d+):\s*(?P<value>.+?)\s*$")


class KqfParseError(Exception):
    """Raised when KQF text cannot be parsed or fails validation."""

    def __init__(self, detail: str, *, line: int = 1) -> None:
        self.detail = detail
        self.line = line
        super().__init__(f"line {line}: {detail}")


def _normalize_newlines(text: str) -> str:
    return text.replace("\r\n", "\n").replace("\r", "\n")


def _line_at_index(text: str, index: int) -> int:
    return text.count("\n", 0, max(index, 0)) + 1


def _fsync_directory(directory: Path) -> None:
    try:
        fd = os.open(directory, os.O_RDONLY)
    except OSError:
        return
    try:
        os.fsync(fd)
    except OSError:
        pass
    finally:
        os.close(fd)


def parse_kqf(text: str) -> KqfQuiz:
    """Parse a KQF document string into a validated KqfQuiz."""
    ntext = _normalize_newlines(text)
    try:
        post = frontmatter.loads(ntext)
    except Exception as exc:
        raise KqfParseError(f"could not parse front matter: {exc}", line=1) from exc

    if not post.metadata:
        raise KqfParseError("missing front matter block", line=1)

    try:
        front_matter = KqfFrontMatter.model_validate(post.metadata)
    except ValidationError as exc:
        raise KqfParseError(f"invalid front matter: {exc}", line=1) from exc

    body = post.content.lstrip("\n")
    if not body.strip():
        closing = ntext.rfind("\n---")
        approx = closing if closing != -1 else 0
        raise KqfParseError(
            "quiz must contain at least one question",
            line=_line_at_index(ntext, approx),
        )

    body_start = ntext.find(body)
    if body_start == -1:
        body_start = ntext.find(body.strip())
    if body_start == -1:
        body_start = 0

    questions = _parse_question_blocks(ntext, body, body_start)
    if not questions:
        raise KqfParseError(
            "quiz must contain at least one question",
            line=_line_at_index(ntext, body_start),
        )

    try:
        return KqfQuiz(front_matter=front_matter, questions=questions)
    except ValidationError as exc:
        raise KqfParseError(f"invalid quiz: {exc}", line=1) from exc


def _parse_question_blocks(full_text: str, body: str, body_offset: int) -> list:
    raw_blocks = re.split(r"\n---\n", "\n" + body)
    blocks = [b.strip("\n") for b in raw_blocks if b.strip()]
    questions: list = []
    search_from = body_offset
    for block in blocks:
        rel = full_text.find(block, search_from)
        line = _line_at_index(full_text, rel if rel != -1 else body_offset)
        search_from = max(search_from, rel + len(block)) if rel != -1 else search_from
        questions.append(_parse_question_block(block, line))
    return questions


def _parse_question_block(block: str, header_line: int):
    lines = block.splitlines()
    if not lines:
        raise KqfParseError("empty question block", line=header_line)

    header = _HEADER_RE.match(lines[0])
    if not header:
        raise KqfParseError(f"invalid question header: {lines[0]!r}", line=header_line)

    common: dict = {
        "id": header.group("id"),
        "time_s": int(header.group("time")) if header.group("time") else None,
    }
    if header.group("points"):
        common["points"] = int(header.group("points"))

    qtype = header.group("type")

    text_lines: list[str] = []
    raw_choices: list[dict] = []
    last_raw_choice: dict | None = None
    media_kwargs: dict[str, str] = {}
    slider_fields: dict[str, str] = {}
    plain_items: list[str] = []
    order_directive: str | None = None
    in_order_items = False
    order_items_dict: dict[int, str] = {}

    index = 1
    in_slider = False
    while index < len(lines):
        line = lines[index]
        stripped = line.strip()

        if stripped == "@slider:":
            in_slider = True
            index += 1
            continue
        if in_slider:
            if not stripped:
                index += 1
                continue
            slider_match = _SLIDER_FIELD_RE.match(line)
            if slider_match:
                slider_fields[slider_match.group("key")] = slider_match.group("value")
                index += 1
                continue
            in_slider = False

        if stripped == "@order_items:":
            in_order_items = True
            index += 1
            continue
        if in_order_items:
            if not stripped:
                index += 1
                continue
            oi_match = _ORDER_ITEMS_FIELD_RE.match(line)
            if oi_match:
                order_items_dict[int(oi_match.group("key"))] = oi_match.group("value")
                index += 1
                continue
            in_order_items = False

        order_dir_match = _ORDER_DIRECTIVE_RE.match(line)
        if order_dir_match:
            order_directive = order_dir_match.group("value")
            index += 1
            continue

        choice_match = _CHOICE_RE.match(line)
        if choice_match:
            mark = choice_match.group("mark").lower()
            choice_text = choice_match.group("text") or ""
            last_raw_choice = {"text": choice_text, "is_correct": mark == "x"}
            raw_choices.append(last_raw_choice)
            index += 1
            continue

        if qtype == "ordering":
            plain_match = _PLAIN_ITEM_RE.match(line)
            if plain_match:
                plain_items.append(plain_match.group("text"))
                index += 1
                continue

        directive_match = _DIRECTIVE_RE.match(line)
        if directive_match:
            key = directive_match.group("key")
            raw_val = directive_match.group("value").strip()
            if key == "image":
                raw_val = raw_val.rstrip("/")
                if re.search(r"/image\.webp$|/thumb\.webp$", raw_val, re.IGNORECASE):
                    raise KqfParseError(
                        "@image must be ./media/{asset_id}, not a .../image.webp file path",
                        line=header_line + index,
                    )
                raw_val = _normalize_kqf_stored_image_path(raw_val)
                if last_raw_choice is not None and not slider_fields:
                    last_raw_choice["image"] = raw_val
                    index += 1
                    continue
            media_kwargs[key] = raw_val
            index += 1
            continue
        if stripped == "":
            last_raw_choice = None
            index += 1
            continue
        if (
            not raw_choices
            and not slider_fields
            and not plain_items
            and not order_items_dict
        ):
            text_lines.append(stripped)
            index += 1
            continue
        index += 1

    choices: list[KqfChoice] = [KqfChoice(**c) for c in raw_choices]

    question_text = " ".join(text_lines).strip()
    media = KqfMedia(**media_kwargs) if media_kwargs else KqfMedia()

    try:
        if qtype == "singlechoice":
            return KqfSingleChoice(
                type="singlechoice",
                text=question_text,
                choices=choices,
                media=media,
                **common,
            )
        if qtype == "multichoice":
            return KqfMultiChoice(
                type="multichoice",
                text=question_text,
                choices=choices,
                media=media,
                **common,
            )
        if qtype == "truefalse":
            return _build_truefalse(common, question_text, choices, media, header_line)
        if qtype == "slider":
            return _build_slider(
                common, question_text, slider_fields, media, header_line
            )
        if qtype == "ordering":
            return _build_ordering(
                common,
                question_text,
                plain_items,
                order_directive,
                order_items_dict,
                media,
                header_line,
            )
    except ValidationError as exc:
        raise KqfParseError(f"invalid question: {exc}", line=header_line) from exc
    raise KqfParseError(f"unknown question type: {qtype}", line=header_line)


def _build_truefalse(
    common: dict,
    question_text: str,
    choices: list[KqfChoice],
    media: KqfMedia,
    header_line: int,
) -> KqfTrueFalse:
    if len(choices) != 2:
        raise KqfParseError(
            "truefalse must have exactly 2 choices (True/False)",
            line=header_line,
        )
    by_label = {choice.text.strip().lower(): choice.is_correct for choice in choices}
    if set(by_label.keys()) != {"true", "false"}:
        raise KqfParseError(
            "truefalse choices must be 'True' and 'False'", line=header_line
        )
    correct = by_label["true"]
    if correct == by_label["false"]:
        raise KqfParseError("truefalse requires exactly one [x]", line=header_line)
    return KqfTrueFalse(
        type="truefalse",
        text=question_text,
        correct=correct,
        media=media,
        **common,
    )


def _build_slider(
    common: dict,
    question_text: str,
    fields: dict[str, str],
    media: KqfMedia,
    header_line: int,
) -> KqfSlider:
    if not fields:
        raise KqfParseError("slider question requires @slider: block", line=header_line)
    try:
        score_mode = fields.get("score", "range")
        kwargs: dict[str, object] = {
            "unit": fields.get("unit"),
            "score": score_mode,
            "label_min": fields.get("label_min"),
            "label_max": fields.get("label_max"),
        }
        for key in ("min", "max"):
            if key not in fields:
                raise KqfParseError(
                    f"slider missing required field: {key}", line=header_line
                )
            kwargs[key] = float(fields[key])
        if score_mode == "range":
            if "correct" not in fields:
                raise KqfParseError(
                    "slider with score=range requires correct field", line=header_line
                )
            kwargs["correct"] = float(fields["correct"])
        elif "correct" in fields:
            kwargs["correct"] = float(fields["correct"])
        for key in ("step", "tolerance"):
            if key in fields:
                kwargs[key] = float(fields[key])
    except ValueError as exc:
        raise KqfParseError(
            f"slider field must be numeric: {exc}", line=header_line
        ) from exc
    return KqfSlider(
        type="slider",
        text=question_text,
        media=media,
        **common,
        **kwargs,
    )


def _build_ordering(
    common: dict,
    question_text: str,
    plain_items: list[str],
    order_directive: str | None,
    order_items_dict: dict[int, str],
    media: KqfMedia,
    header_line: int,
) -> KqfOrdering:
    if order_items_dict and order_directive:
        raise KqfParseError(
            "@order_items: and @order: cannot both be present", line=header_line
        )
    if order_items_dict:
        keys = sorted(order_items_dict.keys())
        expected = list(range(1, len(keys) + 1))
        if keys != expected:
            raise KqfParseError(
                f"@order_items: keys must be consecutive integers starting at 1, got {keys}",
                line=header_line,
            )
        correct_items = [order_items_dict[k] for k in keys]
        n = len(correct_items)
        if n < 2 or n > 8:
            raise KqfParseError(
                f"ordering requires 2-8 items, got {n}", line=header_line
            )
        indices = list(range(n))
        random.shuffle(indices)
        items = [correct_items[i] for i in indices]
        inv = [0] * n
        for shuffled_idx, orig_idx in enumerate(indices):
            inv[orig_idx] = shuffled_idx
        correct_order = inv
    elif plain_items and order_directive is not None:
        items = plain_items
        n = len(items)
        if n < 2 or n > 8:
            raise KqfParseError(
                f"ordering requires 2-8 items, got {n}", line=header_line
            )
        try:
            raw = [int(x.strip()) for x in order_directive.split(",")]
        except ValueError as exc:
            raise KqfParseError(
                f"@order: values must be integers: {exc}", line=header_line
            ) from exc
        if len(raw) != n:
            raise KqfParseError(
                f"@order: must have {n} values (one per item), got {len(raw)}",
                line=header_line,
            )
        correct_order = [v - 1 for v in raw]
        if sorted(correct_order) != list(range(n)):
            raise KqfParseError(
                f"@order: indices must each appear exactly once (1..{n})",
                line=header_line,
            )
    elif plain_items and order_directive is None:
        raise KqfParseError(
            "ordering question with plain items requires @order: directive",
            line=header_line,
        )
    else:
        raise KqfParseError(
            "ordering question requires items (- text) or @order_items: block",
            line=header_line,
        )
    return KqfOrdering(
        type="ordering",
        text=question_text,
        items=items,
        correct_order=correct_order,
        media=media,
        **common,
    )


def _fmt_num(value: float) -> str:
    if value == int(value):
        return str(int(value))
    return f"{value:g}"


def _write_question(buf: io.StringIO, question: object) -> None:
    header_parts = [f"## {question.id} | {question.type}"]
    if question.time_s is not None:
        header_parts.append(f"{question.time_s}s")
    header_parts.append(f"{question.points}pts")
    buf.write(" | ".join(header_parts))
    buf.write("\n")
    buf.write(question.text)
    buf.write("\n\n")

    if isinstance(question, (KqfSingleChoice, KqfMultiChoice)):
        for choice in question.choices:
            mark = "x" if choice.is_correct else " "
            text_part = f" {choice.text}" if choice.text else ""
            buf.write(f"- [{mark}]{text_part}\n")
            if choice.image:
                buf.write(f"@image: {_normalize_kqf_stored_image_path(choice.image)}\n")
    elif isinstance(question, KqfTrueFalse):
        buf.write(f"- [{'x' if question.correct else ' '}] True\n")
        buf.write(f"- [{'x' if not question.correct else ' '}] False\n")
    elif isinstance(question, KqfSlider):
        buf.write("@slider:\n")
        if question.correct is not None:
            buf.write(f"  correct: {_fmt_num(question.correct)}\n")
        buf.write(f"  min: {_fmt_num(question.min)}\n")
        buf.write(f"  max: {_fmt_num(question.max)}\n")
        if question.step != 1:
            buf.write(f"  step: {_fmt_num(question.step)}\n")
        if question.tolerance != 0:
            buf.write(f"  tolerance: {_fmt_num(question.tolerance)}\n")
        if question.unit:
            buf.write(f"  unit: {question.unit}\n")
        if question.score != "range":
            buf.write(f"  score: {question.score}\n")
        if question.label_min:
            buf.write(f"  label_min: {question.label_min}\n")
        if question.label_max:
            buf.write(f"  label_max: {question.label_max}\n")
    elif isinstance(question, KqfOrdering):
        for item in question.items:
            buf.write(f"- {item}\n")
        order_1based = ", ".join(str(i + 1) for i in question.correct_order)
        buf.write(f"@order: {order_1based}\n")

    media_kwargs = question.media.model_dump(exclude_none=True)
    if media_kwargs:
        buf.write("\n")
        for key in ("image", "video", "audio", "hint"):
            value = media_kwargs.get(key)
            if value:
                if key == "image":
                    value = _normalize_kqf_stored_image_path(value)
                buf.write(f"@{key}: {value}\n")


def serialize_kqf(quiz: KqfQuiz) -> str:
    """Serialize a KqfQuiz back into KQF text. Round-trip-stable with parse_kqf."""
    fm = quiz.front_matter.model_dump(exclude_none=True, exclude_defaults=True)
    if not fm.get("tags"):
        fm.pop("tags", None)
    post = frontmatter.Post("", **fm)
    buf = io.StringIO()
    buf.write(frontmatter.dumps(post))
    buf.write("\n\n")

    for index, question in enumerate(quiz.questions):
        if index > 0:
            buf.write("\n---\n\n")
        _write_question(buf, question)
    return buf.getvalue()


def read_kqf_file(path: Path) -> KqfQuiz:
    return parse_kqf(path.read_text(encoding="utf-8"))


def write_kqf_file_atomic(path: Path, quiz: KqfQuiz) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_name(f"{path.name}.tmp")
    with tmp_path.open("w", encoding="utf-8") as handle:
        handle.write(serialize_kqf(quiz))
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(tmp_path, path)
    _fsync_directory(path.parent)
