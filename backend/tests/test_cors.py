from fastapi.testclient import TestClient


def test_cors_preflight_allows_authorization_header_with_credentials(
    client: TestClient,
) -> None:
    response = client.options(
        "/admin/quiz/all",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert "authorization" in response.headers["access-control-allow-headers"].lower()
    assert response.headers["access-control-allow-credentials"] == "true"
