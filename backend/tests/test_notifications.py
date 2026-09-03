from tests.conftest import register_user


def _trigger_notification(client):
    """El dueño recibe una notificación cuando alguien solicita su exchange."""
    register_user(client, username="owner", email="owner@example.com")
    client.post(
        "/api/exchanges",
        data={"title": "Silla", "offers": "Silla", "seeks": "Mesa", "category": "Bienes"},
    )
    exchange_id = client.get("/api/exchanges").get_json()["items"][0]["id"]
    client.post("/api/auth/logout")

    register_user(client, username="requester", email="req@example.com")
    client.post(f"/api/exchanges/{exchange_id}/request")
    client.post("/api/auth/logout")

    client.post("/api/auth/login", json={"email": "owner@example.com", "password": "clave1234"})


def test_unread_count_increases_on_notification(client):
    _trigger_notification(client)
    response = client.get("/api/notifications/unread-count")
    assert response.get_json()["count"] == 1


def test_listing_notifications_does_not_mark_as_read(client):
    """
    Bug original: listar notificaciones las marcaba todas como leídas
    automáticamente, por eso nunca había nada que mostrar en un contador.
    """
    _trigger_notification(client)
    client.get("/api/notifications")  # solo listar, no debería tocar is_read
    response = client.get("/api/notifications/unread-count")
    assert response.get_json()["count"] == 1


def test_mark_all_read_clears_count(client):
    _trigger_notification(client)
    client.post("/api/notifications/read-all")
    response = client.get("/api/notifications/unread-count")
    assert response.get_json()["count"] == 0


def test_mark_single_notification_read(client):
    _trigger_notification(client)
    notif_id = client.get("/api/notifications").get_json()["items"][0]["id"]
    response = client.post(f"/api/notifications/{notif_id}/read")
    assert response.status_code == 200
    assert response.get_json()["notification"]["is_read"] is True
