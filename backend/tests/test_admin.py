from app.models import User
from tests.conftest import register_user


def _make_admin(db, email):
    user = User.query.filter_by(email=email).first()
    user.role = "admin"
    db.session.commit()


def test_delete_user_with_related_data_does_not_raise(client, db):
    """
    En el proyecto original, borrar un usuario con mensajes, solicitudes,
    favoritos o notificaciones asociadas lanzaba IntegrityError porque
    ninguna FK tenía ondelete='CASCADE'. Este test reproduce ese escenario
    exacto: un usuario con actividad real, y verifica que el borrado
    funciona limpio.
    """
    register_user(client, username="owner", email="owner@example.com")
    client.post(
        "/api/exchanges",
        data={"title": "Sofá", "offers": "Sofá 3 cuerpos", "seeks": "Comedor", "category": "Bienes"},
    )
    exchange_id = client.get("/api/exchanges").get_json()["items"][0]["id"]
    client.post("/api/auth/logout")

    register_user(client, username="buyer", email="buyer@example.com")
    client.post(f"/api/exchanges/{exchange_id}/request")  # crea ExchangeRequest + Notification
    client.post(f"/api/favorites/{exchange_id}")  # crea Favorite
    client.post(f"/api/chat/{1}", json={"content": "Hola, me interesa"})  # crea Message
    client.post("/api/auth/logout")

    register_user(client, username="root", email="root@example.com")
    _make_admin(db, "root@example.com")

    owner = User.query.filter_by(email="owner@example.com").first()
    response = client.delete(f"/api/admin/users/{owner.id}")

    assert response.status_code == 200
    assert User.query.filter_by(email="owner@example.com").first() is None


def test_non_admin_cannot_access_admin_routes(client):
    register_user(client)
    response = client.get("/api/admin/users")
    assert response.status_code == 403


def test_admin_can_promote_user(client, db):
    register_user(client, username="root", email="root@example.com")
    _make_admin(db, "root@example.com")

    register_user(client, username="other", email="other@example.com")
    other = User.query.filter_by(email="other@example.com").first()

    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"email": "root@example.com", "password": "clave1234"})

    response = client.post(f"/api/admin/users/{other.id}/make-admin")
    assert response.status_code == 200
    assert response.get_json()["user"]["role"] == "admin"
