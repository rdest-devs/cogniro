from pathlib import Path
import sys

from fastapi.testclient import TestClient

sys.path.append(str(Path(__file__).resolve().parents[1]))


def test_validate_nick_returns_valid_true(client: TestClient) -> None:
    response = client.post("/validate-nick", json={"nick": "alice"})

    assert response.status_code == 200
    assert response.json() == {"valid": True}


def test_validate_nick_rejects_empty_body_field(client: TestClient) -> None:
    response = client.post("/validate-nick", json={"nick": ""})

    assert response.status_code == 422
