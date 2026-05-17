from __future__ import annotations

import pytest

from services.kqf import KqfParseError, parse_kqf


def test_parses_minimal_singlechoice() -> None:
    text = """---
title: Test
---

## Q1 | singlechoice | 30s | 1000pts
What is 2+2?

- [x] 4
- [ ] 5
"""
    quiz = parse_kqf(text)
    assert quiz.front_matter.title == "Test"
    assert len(quiz.questions) == 1
    q = quiz.questions[0]
    assert q.id == "Q1"
    assert q.type == "singlechoice"
    assert q.time_s == 30
    assert q.points == 1000
    assert q.text == "What is 2+2?"
    assert [c.text for c in q.choices] == ["4", "5"]
    assert [c.is_correct for c in q.choices] == [True, False]


def test_rejects_missing_front_matter() -> None:
    with pytest.raises(KqfParseError, match="front matter"):
        parse_kqf("## Q1 | singlechoice\nx?\n- [x] a\n- [ ] b\n")


def test_rejects_invalid_question_header() -> None:
    text = """---
title: T
---

## not-a-header
x?

- [x] a
- [ ] b
"""
    with pytest.raises(KqfParseError, match="invalid question header"):
        parse_kqf(text)


def test_parses_multichoice() -> None:
    text = """---
title: T
---

## Q2 | multichoice | 45s | 500pts
Which are scandinavian?

- [x] Norway
- [x] Sweden
- [ ] Germany
"""
    quiz = parse_kqf(text)
    assert quiz.questions[0].type == "multichoice"
    assert sum(1 for c in quiz.questions[0].choices if c.is_correct) == 2


def test_parses_truefalse() -> None:
    text = """---
title: T
---

## Q3 | truefalse | 10s | 500pts
Australia is a continent.

- [x] True
- [ ] False
"""
    quiz = parse_kqf(text)
    q = quiz.questions[0]
    assert q.type == "truefalse"
    assert q.correct is True


def test_parses_slider() -> None:
    text = """---
title: T
---

## Q4 | slider | 60s | 1000pts
In what year did the Berlin Wall fall?

@slider:
  correct: 1989
  min: 1950
  max: 2000
  step: 1
  tolerance: 2
  unit: year
"""
    quiz = parse_kqf(text)
    q = quiz.questions[0]
    assert q.type == "slider"
    assert q.correct == 1989
    assert q.tolerance == 2
    assert q.unit == "year"


def test_parses_question_with_image_directive() -> None:
    text = """---
title: T
---

## Q1 | singlechoice
What animal?

- [x] Dog
- [ ] Cat

@image: ./media/dog.jpg
@hint: It barks.
"""
    quiz = parse_kqf(text)
    assert quiz.questions[0].points == 1
    assert quiz.questions[0].media.image == "./media/dog.jpg"
    assert quiz.questions[0].media.hint == "It barks."


def test_parses_multiple_questions() -> None:
    text = """---
title: T
---

## Q1 | singlechoice | 20s | 1000pts
A?

- [x] yes
- [ ] no

---

## Q2 | truefalse | 10s | 500pts
B?

- [ ] True
- [x] False
"""
    quiz = parse_kqf(text)
    assert len(quiz.questions) == 2
    assert [q.id for q in quiz.questions] == ["Q1", "Q2"]


def test_rejects_empty_quiz() -> None:
    with pytest.raises(KqfParseError, match="at least one question"):
        parse_kqf("---\ntitle: T\n---\n")


def test_rejects_singlechoice_with_two_correct() -> None:
    text = """---
title: T
---

## Q1 | singlechoice
?

- [x] a
- [x] b
"""
    with pytest.raises(KqfParseError):
        parse_kqf(text)


def test_rejects_slider_without_block() -> None:
    text = """---
title: T
---

## Q1 | slider
?
"""
    with pytest.raises(KqfParseError, match="@slider"):
        parse_kqf(text)
