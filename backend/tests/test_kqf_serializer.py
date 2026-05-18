from __future__ import annotations

from pathlib import Path

from schemas.kqf import (
    KqfChoice,
    KqfFrontMatter,
    KqfMedia,
    KqfMultiChoice,
    KqfQuiz,
    KqfSingleChoice,
    KqfSlider,
    KqfTrueFalse,
)
from services.kqf import read_kqf_file, serialize_kqf, write_kqf_file_atomic


def test_serialize_singlechoice() -> None:
    quiz = KqfQuiz(
        front_matter=KqfFrontMatter(title="T"),
        questions=[
            KqfSingleChoice(
                id="Q1",
                type="singlechoice",
                text="?",
                time_s=30,
                points=1000,
                choices=[
                    KqfChoice(text="a", is_correct=True),
                    KqfChoice(text="b", is_correct=False),
                ],
            )
        ],
    )
    text = serialize_kqf(quiz)
    assert "## Q1 | singlechoice | 30s | 1000pts" in text
    assert "- [x] a" in text
    assert "- [ ] b" in text


def test_serialize_slider_emits_block() -> None:
    quiz = KqfQuiz(
        front_matter=KqfFrontMatter(title="T"),
        questions=[
            KqfSlider(
                id="Q1",
                type="slider",
                text="Year?",
                correct=1989,
                min=1950,
                max=2000,
                step=1,
                tolerance=2,
                unit="year",
            )
        ],
    )
    text = serialize_kqf(quiz)
    assert "## Q1 | slider | 1pts" in text
    assert "@slider:" in text
    assert "  correct: 1989" in text
    assert "  unit: year" in text


def test_serialize_truefalse_emits_two_choices() -> None:
    quiz = KqfQuiz(
        front_matter=KqfFrontMatter(title="T"),
        questions=[KqfTrueFalse(id="Q1", type="truefalse", text="?", correct=False)],
    )
    text = serialize_kqf(quiz)
    assert "## Q1 | truefalse | 1pts" in text
    assert "- [ ] True" in text
    assert "- [x] False" in text


def test_serialize_emits_media_directives() -> None:
    quiz = KqfQuiz(
        front_matter=KqfFrontMatter(title="T"),
        questions=[
            KqfMultiChoice(
                id="Q1",
                type="multichoice",
                text="?",
                choices=[
                    KqfChoice(text="a", is_correct=True),
                    KqfChoice(text="b", is_correct=False),
                ],
                media=KqfMedia(image="./media/foo.jpg", hint="h"),
            )
        ],
    )
    text = serialize_kqf(quiz)
    assert "@image: ./media/foo.jpg" in text
    assert "@hint: h" in text


def test_serialize_normalizes_asset_image_webp_to_directory_line() -> None:
    aid = "asset_" + "c" * 32
    quiz = KqfQuiz(
        front_matter=KqfFrontMatter(title="T"),
        questions=[
            KqfSingleChoice(
                id="Q1",
                type="singlechoice",
                text="?",
                choices=[
                    KqfChoice(text="a", is_correct=True),
                    KqfChoice(text="b", is_correct=False),
                ],
                media=KqfMedia(image=f"./media/{aid}/image.webp"),
            )
        ],
    )
    text = serialize_kqf(quiz)
    assert f"@image: ./media/{aid}" in text
    assert f"@image: ./media/{aid}/image.webp" not in text


def test_serialize_choice_image_directive() -> None:
    quiz = KqfQuiz(
        front_matter=KqfFrontMatter(title="T"),
        questions=[
            KqfSingleChoice(
                id="Q1",
                type="singlechoice",
                text="Question?",
                choices=[
                    KqfChoice(
                        text="",
                        is_correct=True,
                        image="./media/asset_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                    ),
                    KqfChoice(
                        text="Paris",
                        is_correct=False,
                        image="./media/asset_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                    ),
                ],
            )
        ],
    )

    out = serialize_kqf(quiz)
    assert "- [x]\n" in out
    assert "@image: ./media/asset_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" in out
    assert "- [ ] Paris" in out
    assert "@image: ./media/asset_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" in out


def test_roundtrip_image_only_choice() -> None:
    quiz = KqfQuiz(
        front_matter=KqfFrontMatter(title="T"),
        questions=[
            KqfSingleChoice(
                id="Q1",
                type="singlechoice",
                text="Question?",
                choices=[
                    KqfChoice(
                        text="",
                        is_correct=True,
                        image="./media/asset_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                    ),
                    KqfChoice(
                        text="Paris",
                        is_correct=False,
                    ),
                ],
            )
        ],
    )
    from services.kqf import parse_kqf

    out = serialize_kqf(quiz)
    reparsed = parse_kqf(out)
    assert reparsed.questions[0].choices[0].text == ""
    assert (
        reparsed.questions[0].choices[0].image
        == "./media/asset_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    )
    assert reparsed.questions[0].choices[1].text == "Paris"


def test_read_write_kqf_file_roundtrip(tmp_path: Path) -> None:
    path = tmp_path / "quiz.kqf"
    quiz = KqfQuiz(
        front_matter=KqfFrontMatter(title="File"),
        questions=[
            KqfSingleChoice(
                id="Q1",
                type="singlechoice",
                text="?",
                choices=[
                    KqfChoice(text="y", is_correct=True),
                    KqfChoice(text="n", is_correct=False),
                ],
            )
        ],
    )
    write_kqf_file_atomic(path, quiz)
    assert path.exists()
    assert not (tmp_path / "quiz.kqf.tmp").exists()
    loaded = read_kqf_file(path)
    assert loaded.model_dump() == quiz.model_dump()
