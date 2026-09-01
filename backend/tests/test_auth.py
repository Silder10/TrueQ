from tests.conftest import login_user, register_user


def test_register_creates_user_and_logs_in(client):
    response = register_user(client)
    assert response.status_code == 201
    assert response.get_json()["user"]["username"] == "ana"

    me = client.get("/api/auth/me")
    assert me.get_json()["user"]["email"] == "ana@example.com"


def test_register_rejects_short_password(client):
    response = client.post(
        "/api/auth/register",
        json={"username": "ana", "email": "ana@example.com", "password": "123"},
    )
    assert response.status_code == 400
    assert "password" in response.get_json()["fields"]


def test_register_rejects_duplicate_email(client):
    register_user(client)
    response = register_user(client, username="otra")
    assert response.status_code == 409


def test_login_wrong_password_returns_401(client):
    register_user(client)
    response = login_user(client, password="incorrecta")
    assert response.status_code == 401


def test_login_correct_credentials(client):
    register_user(client)
    client.post("/api/auth/logout")
    response = login_user(client)
    assert response.status_code == 200


def test_logout_requires_auth(client):
    response = client.post("/api/auth/logout")
    assert response.status_code == 401


def test_me_without_session_returns_null_user(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 200
    assert response.get_json()["user"] is None
