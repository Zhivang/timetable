import pytest
from fastapi.testclient import TestClient
from app.config import settings
from app.main import app
from app.schemas.request import SolveRequest

client = TestClient(app)


def test_health_endpoint():
    """Verifies that /health returns 200 OK and expected service metadata."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "Google OR-Tools" in data["solverEngine"]
    assert "version" in data


def test_solve_endpoint_auth_enforcement(feasible_request: SolveRequest, monkeypatch):
    """
    Tests server-side API-key verification and fail-closed behavior.
    """
    monkeypatch.setattr(settings, "SOLVER_API_KEY", "super-secret-solver-token-123")
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")

    payload = feasible_request.model_dump()

    # 1. No key -> 401
    res_no_key = client.post("/solve", json=payload)
    assert res_no_key.status_code == 401

    # 2. Invalid key -> 401
    res_bad_key = client.post(
        "/solve", json=payload, headers={"X-API-Key": "wrong-token"}
    )
    assert res_bad_key.status_code == 401

    # 3. Valid key -> 200 OK
    res_valid_key = client.post(
        "/solve",
        json=payload,
        headers={"X-API-Key": "super-secret-solver-token-123"},
    )
    assert res_valid_key.status_code == 200
    data = res_valid_key.json()
    assert data["status"] in ("OPTIMAL", "FEASIBLE")
    assert len(data["slots"]) > 0


def test_solve_endpoint_validation_error_handling(feasible_request: SolveRequest, monkeypatch):
    """
    Verifies that malformed or broken relational input returns 422 with useful errors.
    """
    monkeypatch.setattr(settings, "SOLVER_API_KEY", None)
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")

    payload = feasible_request.model_dump()
    # Intentionally corrupt a reference: change subject targetId to nonexistent
    payload["subjectOfferings"][0]["targetId"] = "nonexistent_cohort_999"

    res = client.post("/solve", json=payload)
    assert res.status_code == 422
    data = res.json()
    assert data["status"] == "INVALID_INPUT"
    assert len(data["validationErrors"]) > 0
    assert any("nonexistent" in err.lower() for err in data["validationErrors"])
