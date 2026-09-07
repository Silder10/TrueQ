from datetime import datetime, timedelta

from app.models import User
from tests.conftest import register_user


def test_forgot_password_always_returns_200(client):
    """No debe filtrar si el correo existe o no."""
    register_user(client)
    client.post("/api/auth/logout")

    exists = client.post("/api/auth/forgot-password", json={"email": "ana@example.com"})
    doesnt_exist = client.post("/api/auth/forgot-password", json={"email": "nadie@example.com"})

    assert exists.status_code == 200
    assert doesnt_exist.status_code == 200
    assert exists.get_json()["message"] == doesnt_exist.get_json()["message"]


def test_forgot_password_sets_reset_token(client, db):
    register_user(client)
    client.post("/api/auth/logout")

    client.post("/api/auth/forgot-password", json={"email": "ana@example.com"})

    user = User.query.filter_by(email="ana@example.com").first()
    assert user.reset_token_hash is not None
    assert user.reset_token_expires is not None


def test_reset_password_with_invalid_token_fails(client):
    register_user(client)
    client.post("/api/auth/logout")

    response = client.post(
        "/api/auth/reset-password",
        json={"email": "ana@example.com", "token": "no-es-el-token-correcto", "new_password": "nuevaclave123"},
    )
    assert response.status_code == 400


def test_reset_password_with_expired_token_fails(client, db):
    register_user(client)
    client.post("/api/auth/logout")

    user = User.query.filter_by(email="ana@example.com").first()
    user.set_reset_token("token-de-prueba", datetime.utcnow() - timedelta(minutes=1))  # ya vencido
    db.session.commit()

    response = client.post(
        "/api/auth/reset-password",
        json={"email": "ana@example.com", "token": "token-de-prueba", "new_password": "nuevaclave123"},
    )
    assert response.status_code == 400


def test_reset_password_full_flow(client, db):
    register_user(client)
    client.post("/api/auth/logout")

    user = User.query.filter_by(email="ana@example.com").first()
    user.set_reset_token("token-valido", datetime.utcnow() + timedelta(hours=1))
    db.session.commit()

    response = client.post(
        "/api/auth/reset-password",
        json={"email": "ana@example.com", "token": "token-valido", "new_password": "nuevaclave123"},
    )
    assert response.status_code == 200

    login = client.post("/api/auth/login", json={"email": "ana@example.com", "password": "nuevaclave123"})
    assert login.status_code == 200

    # el token no debe poder reusarse
    user = User.query.filter_by(email="ana@example.com").first()
    assert user.reset_token_hash is None
