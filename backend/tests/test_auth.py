"""Tests for authentication service and JSON login data storage."""

from fastapi.testclient import TestClient


def test_auth_login_demo_user(client: TestClient):
    # Default demo user: demo@fintrack.io / password123
    res = client.post(
        "/api/auth/login",
        json={"email": "demo@fintrack.io", "password": "password123"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["user"]["email"] == "demo@fintrack.io"
    assert "token" in data


def test_auth_login_invalid_credentials_returns_401(client: TestClient):
    res = client.post(
        "/api/auth/login",
        json={"email": "demo@fintrack.io", "password": "wrongpassword"},
    )
    assert res.status_code == 401
    data = res.json()
    assert data["success"] is False
    assert "Invalid email or password" in data["message"]


def test_auth_register_and_json_persistence(client: TestClient):
    new_email = "sarah.connor@fintrack.io"
    register_res = client.post(
        "/api/auth/register",
        json={
            "name": "Sarah Connor",
            "email": new_email,
            "password": "resistance2026",
        },
    )
    assert register_res.status_code == 201
    reg_data = register_res.json()
    assert reg_data["user"]["name"] == "Sarah Connor"
    assert reg_data["user"]["email"] == new_email

    # Verify duplicate email rejected
    dup_res = client.post(
        "/api/auth/register",
        json={
            "name": "Sarah Duplicate",
            "email": new_email,
            "password": "resistance2026",
        },
    )
    assert dup_res.status_code == 400

    # Verify inspecting JSON login data shows the registered user and history
    inspect_res = client.get("/api/auth/login-data")
    assert inspect_res.status_code == 200
    json_data = inspect_res.json()
    assert json_data["total_registered_users"] >= 2
    emails = [u["email"] for u in json_data["users"]]
    assert new_email in emails
