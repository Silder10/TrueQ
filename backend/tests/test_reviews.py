from tests.conftest import register_user


def _accepted_exchange_between(client):
    """Crea un exchange, lo solicita y lo acepta. Devuelve exchange_id."""
    register_user(client, username="owner", email="owner@example.com")
    client.post(
        "/api/exchanges",
        data={"title": "Guitarra", "offers": "Guitarra", "seeks": "Bajo", "category": "Bienes"},
    )
    exchange_id = client.get("/api/exchanges").get_json()["items"][0]["id"]
    client.post("/api/auth/logout")

    register_user(client, username="requester", email="req@example.com")
    req = client.post(f"/api/exchanges/{exchange_id}/request")
    request_id = req.get_json()["request"]["id"]
    client.post("/api/auth/logout")

    client.post("/api/auth/login", json={"email": "owner@example.com", "password": "clave1234"})
    client.post(f"/api/exchanges/requests/{request_id}/accept")

    return exchange_id


def test_reviewer_must_have_participated(client):
    register_user(client, username="owner", email="owner@example.com")
    client.post(
        "/api/exchanges",
        data={"title": "Guitarra", "offers": "Guitarra", "seeks": "Bajo", "category": "Bienes"},
    )
    exchange_id = client.get("/api/exchanges").get_json()["items"][0]["id"]
    client.post("/api/auth/logout")

    register_user(client, username="stranger", email="stranger@example.com")
    response = client.post(f"/api/exchanges/{exchange_id}/reviews", json={"rating": 5})
    assert response.status_code == 403


def test_create_review_after_accepted_request(client):
    exchange_id = _accepted_exchange_between(client)
    # el dueño (sesión actual tras aceptar) reseña al solicitante
    response = client.post(
        f"/api/exchanges/{exchange_id}/reviews",
        json={"rating": 5, "comment": "Excelente, muy responsable."},
    )
    assert response.status_code == 201
    assert response.get_json()["review"]["rating"] == 5


def test_rating_out_of_range_rejected(client):
    exchange_id = _accepted_exchange_between(client)
    response = client.post(f"/api/exchanges/{exchange_id}/reviews", json={"rating": 9})
    assert response.status_code == 400


def test_cannot_review_same_exchange_twice(client):
    exchange_id = _accepted_exchange_between(client)
    client.post(f"/api/exchanges/{exchange_id}/reviews", json={"rating": 4})
    second = client.post(f"/api/exchanges/{exchange_id}/reviews", json={"rating": 5})
    assert second.status_code == 409


def test_user_average_rating_reflects_reviews(client):
    exchange_id = _accepted_exchange_between(client)
    client.post(f"/api/exchanges/{exchange_id}/reviews", json={"rating": 4})

    # el solicitante consulta su propio promedio
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"email": "req@example.com", "password": "clave1234"})
    me = client.get("/api/auth/me").get_json()["user"]

    response = client.get(f"/api/users/{me['id']}/reviews")
    body = response.get_json()
    assert body["average_rating"] == 4.0
    assert body["reviews_count"] == 1
