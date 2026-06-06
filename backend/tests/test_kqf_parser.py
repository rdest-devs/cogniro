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


def test_image_directive_asset_dir_stored_as_base_path() -> None:
    text = """---
title: T
---

## Q1 | singlechoice
Q?

- [x] a
- [ ] b

@image: ./media/asset_cc0b501288944523b06ae7d26cf078ab
"""
    quiz = parse_kqf(text)
    assert (
        quiz.questions[0].media.image
        == "./media/asset_cc0b501288944523b06ae7d26cf078ab"
    )


def test_image_directive_trailing_slash_asset_dir() -> None:
    text = """---
title: T
---

## Q1 | singlechoice
Q?

- [x] a
- [ ] b

@image: media/asset_x/
"""
    quiz = parse_kqf(text)
    assert quiz.questions[0].media.image == "media/asset_x"


def test_image_directive_explicit_image_webp_normalized_to_dir() -> None:
    aid = "asset_" + "a" * 32
    text = f"""---
title: T
---

## Q1 | singlechoice
Q?

- [x] a
- [ ] b

@image: ./media/{aid}/image.webp
"""
    quiz = parse_kqf(text)
    assert quiz.questions[0].media.image == f"./media/{aid}"


def test_image_directive_absolute_url_unchanged() -> None:
    text = """---
title: T
---

## Q1 | singlechoice
Q?

- [x] a
- [ ] b

@image: https://cdn.example.com/x
"""
    quiz = parse_kqf(text)
    assert quiz.questions[0].media.image == "https://cdn.example.com/x"


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


def test_parses_ordering_syntax_a() -> None:
    text = """---
title: T
---

## Q1 | ordering | 45s | 1000pts
Arrange stages of compilation.

- Analiza leksykalna
- Generowanie kodu
- Analiza składniowa
- Optymalizacja

@order: 1, 3, 4, 2
"""
    quiz = parse_kqf(text)
    q = quiz.questions[0]
    assert q.type == "ordering"
    assert q.id == "Q1"
    assert q.time_s == 45
    assert q.points == 1000
    assert q.items == [
        "Analiza leksykalna",
        "Generowanie kodu",
        "Analiza składniowa",
        "Optymalizacja",
    ]
    assert q.correct_order == [0, 2, 3, 1]
    # Verify items[correct_order[k]] gives the k-th correct item
    correct_sequence = [q.items[i] for i in q.correct_order]
    assert correct_sequence == [
        "Analiza leksykalna",
        "Analiza składniowa",
        "Optymalizacja",
        "Generowanie kodu",
    ]


def test_parses_ordering_syntax_b() -> None:
    text = """---
title: T
---

## Q1 | ordering | 30s | 500pts
Arrange in correct order.

@order_items:
  1: First
  2: Second
  3: Third
  4: Fourth
"""
    quiz = parse_kqf(text)
    q = quiz.questions[0]
    assert q.type == "ordering"
    assert len(q.items) == 4
    # items must be a permutation of the authored items
    assert sorted(q.items) == ["First", "Fourth", "Second", "Third"]
    # correct_order must be a permutation of 0..3
    assert sorted(q.correct_order) == [0, 1, 2, 3]
    # invariant: items[correct_order[k]] == k-th authored item
    authored = ["First", "Second", "Third", "Fourth"]
    for k, authored_item in enumerate(authored):
        assert q.items[q.correct_order[k]] == authored_item


def test_rejects_ordering_duplicate_order_index() -> None:
    text = """---
title: T
---

## Q1 | ordering
Order these.

- A
- B
- C

@order: 1, 1, 3
"""
    with pytest.raises(KqfParseError, match="exactly once"):
        parse_kqf(text)


def test_rejects_ordering_missing_order_index() -> None:
    text = """---
title: T
---

## Q1 | ordering
Order these.

- A
- B
- C

@order: 1, 2
"""
    with pytest.raises(KqfParseError):
        parse_kqf(text)


def test_parses_slider_scale_without_correct() -> None:
    text = """---
title: T
---

## Q1 | slider | 1pts
Rate your confidence.

@slider:
  min: 1
  max: 10
  step: 1
  score: scale
  label_min: Niska pewność
  label_max: Wysoka pewność
"""
    quiz = parse_kqf(text)
    q = quiz.questions[0]
    assert q.type == "slider"
    assert q.score == "scale"
    assert q.correct is None
    assert q.label_min == "Niska pewność"
    assert q.label_max == "Wysoka pewność"


def test_rejects_slider_range_without_correct() -> None:
    text = """---
title: T
---

## Q1 | slider
Year?

@slider:
  min: 1900
  max: 2000
"""
    with pytest.raises(KqfParseError, match="correct"):
        parse_kqf(text)


def test_parses_choice_image_directive() -> None:
    text = """
---
title: T
---

## Q1 | singlechoice | 10s | 1pts
Question?

- [x]
@image: ./media/asset_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
- [ ] Paris
@image: ./media/asset_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
"""

    quiz = parse_kqf(text)
    assert quiz.questions[0].choices[0].text == ""
    assert (
        quiz.questions[0].choices[0].image
        == "./media/asset_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    )
    assert quiz.questions[0].choices[1].text == "Paris"
    assert (
        quiz.questions[0].choices[1].image
        == "./media/asset_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    )
