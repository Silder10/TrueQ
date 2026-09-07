from app.models import Exchange, ModerationStatus, User
from tests.conftest import register_user


def _make_admin(db, email):
    user = User.query.filter_by(email=email).first()
    user.role = "admin"
    db.session.commit()


def test_report_user(client):
    register_user(client, username="reporter", email="reporter@example.com")
    other_id_resp = None
    client.post("/api/auth/logout")

    register_user(client, username="target", email="target@example.com")
    target_id = client.get("/api/auth/me").get_json()["user"]["id"]
    client.post("/api/auth/logout")

    client.post("/api/auth/login", json={"email": "reporter@example.com", "password": "clave1234"})
    response = client.post(
        "/api/reports",
        json={"target_type": "usuario", "target_id": target_id, "reason": "Spam"},
    )
    assert response.status_code == 201
    assert response.get_json()["report"]["status"] == "Pendiente"


def test_cannot_report_self(client):
    register_user(client)
    me = client.get("/api/auth/me").get_json()["user"]
    response = client.post(
        "/api/reports",
        json={"target_type": "usuario", "target_id": me["id"], "reason": "Spam"},
    )
    assert response.status_code == 400


def test_report_reason_otro_requires_description(client):
    register_user(client, username="reporter", email="reporter@example.com")
    client.post("/api/auth/logout")
    register_user(client, username="target", email="target@example.com")
    target_id = client.get("/api/auth/me").get_json()["user"]["id"]
    client.post("/api/auth/logout")

    client.post("/api/auth/login", json={"email": "reporter@example.com", "password": "clave1234"})
    response = client.post(
        "/api/reports",
        json={"target_type": "usuario", "target_id": target_id, "reason": "Otro"},
    )
    assert response.status_code == 400
    assert "description" in response.get_json()["fields"]


def test_admin_can_resolve_report_and_suspend_user(client, db):
    register_user(client, username="reporter", email="reporter@example.com")
    client.post("/api/auth/logout")

    register_user(client, username="target", email="target@example.com")
    target_id = client.get("/api/auth/me").get_json()["user"]["id"]
    client.post("/api/auth/logout")

    client.post("/api/auth/login", json={"email": "reporter@example.com", "password": "clave1234"})
    report = client.post(
        "/api/reports",
        json={"target_type": "usuario", "target_id": target_id, "reason": "Fraude"},
    ).get_json()["report"]
    client.post("/api/auth/logout")

    register_user(client, username="root", email="root@example.com")
    _make_admin(db, "root@example.com")
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"email": "root@example.com", "password": "clave1234"})

    response = client.post(f"/api/admin/reports/{report['id']}/resolve", json={"action": "suspender"})
    assert response.status_code == 200
    assert response.get_json()["report"]["status"] == "Revisado"

    target = User.query.get(target_id)
    assert target.is_suspended is True


def test_block_prevents_chat_message(client):
    register_user(client, username="blocker", email="blocker@example.com")
    blocker_id = client.get("/api/auth/me").get_json()["user"]["id"]
    client.post("/api/auth/logout")

    register_user(client, username="blocked", email="blocked@example.com")
    client.post("/api/auth/logout")

    client.post("/api/auth/login", json={"email": "blocker@example.com", "password": "clave1234"})
    blocked_id = User.query.filter_by(username="blocked").first().id
    client.post(f"/api/users/{blocked_id}/block")
    client.post("/api/auth/logout")

    client.post("/api/auth/login", json={"email": "blocked@example.com", "password": "clave1234"})
    response = client.post(f"/api/chat/{blocker_id}", json={"content": "hola"})
    assert response.status_code == 403


def test_unblock_allows_chat_again(client):
    register_user(client, username="blocker", email="blocker@example.com")
    blocker_id = client.get("/api/auth/me").get_json()["user"]["id"]
    client.post("/api/auth/logout")

    register_user(client, username="blocked", email="blocked@example.com")
    blocked_id = client.get("/api/auth/me").get_json()["user"]["id"]
    client.post("/api/auth/logout")

    client.post("/api/auth/login", json={"email": "blocker@example.com", "password": "clave1234"})
    client.post(f"/api/users/{blocked_id}/block")
    client.delete(f"/api/users/{blocked_id}/block")
    client.post("/api/auth/logout")

    client.post("/api/auth/login", json={"email": "blocked@example.com", "password": "clave1234"})
    response = client.post(f"/api/chat/{blocker_id}", json={"content": "hola de nuevo"})
    assert response.status_code == 201
