from math import inf, nan
from pathlib import Path
import sys

import pytest
from pydantic import ValidationError

sys.path.append(str(Path(__file__).resolve().parents[1]))

from schemas.user import SubmittedAnswer


@pytest.mark.parametrize("value", [nan, inf, -inf])
def test_submitted_answer_rejects_non_finite_values(value: float) -> None:
    with pytest.raises(ValidationError):
        SubmittedAnswer(questionId=1, value=value)
