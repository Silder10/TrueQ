from tests.conftest import register_user


def test_create_exchange_persists_form_data(client):
    """
    Este es el test que habría atrapado el bug original: create_exchange()
    hacía db.session.add(Exchange) (la clase, no una instancia) y nunca leía
    title/description/category del form. Con eso, este test fallaría.
    """
    register_user(client)

    response = client.post(
        "/api/exchanges",
        data={
            "title": "Bicicleta usada",
            "description": "Rodado 26, buen estado",
            "category": "Deportes",
        },
    )

    assert response.status_code == 201
    body = response.get_json()["exchange"]
    assert body["title"] == "Bicicleta usada"
    assert body["description"] == "Rodado 26, buen estado"
    assert body["category"] == "Deportes"
    assert body["status"] == "Disponible"

    listing = client.get("/api/exchanges").get_json()
    assert listing["total"] == 1
    assert listing["items"][0]["title"] == "Bicicleta usada"


def test_create_exchange_without_image_does_not_crash(client):
    """
    El bug original explotaba con AttributeError si no subías imagen,
    porque llamaba secure_filename(image.filename) con image=None.
    """
    register_user(client)

    response = client.post(
        "/api/exchanges",
        data={"title": "Libro", "description": "Usado", "category": "Libros"},
    )

    assert response.status_code == 201
    assert response.get_json()["exchange"]["image"] == "exchange.png"


def test_create_exchange_missing_fields_returns_400(client):
    register_user(client)
    response = client.post("/api/exchanges", data={"title": ""})
    assert response.status_code == 400
    assert "title" in response.get_json()["fields"]


def test_full_request_accept_flow(client):
    # Dueño del intercambio
    register_user(client, username="owner", email="owner@example.com")
    client.post(
        "/api/exchanges",
        data={"title": "Guitarra", "description": "Acústica", "category": "Música"},
    )
    exchange_id = client.get("/api/exchanges").get_json()["items"][0]["id"]
    client.post("/api/auth/logout")

    # Solicitante
    register_user(client, username="requester", email="req@example.com")
    req_response = client.post(f"/api/exchanges/{exchange_id}/request")
    assert req_response.status_code == 201
    request_id = req_response.get_json()["request"]["id"]
    client.post("/api/auth/logout")

    # El dueño acepta
    client.post("/api/auth/login", json={"email": "owner@example.com", "password": "clave1234"})
    accept_response = client.post(f"/api/exchanges/requests/{request_id}/accept")
    assert accept_response.status_code == 200
    assert accept_response.get_json()["request"]["status"] == "Aceptada"


def test_cannot_request_own_exchange(client):
    register_user(client)
    client.post(
        "/api/exchanges",
        data={"title": "Silla", "description": "De madera", "category": "Hogar"},
    )
    exchange_id = client.get("/api/exchanges").get_json()["items"][0]["id"]

    response = client.post(f"/api/exchanges/{exchange_id}/request")
    assert response.status_code == 400


def test_toggle_favorite(client):
    register_user(client, username="owner", email="owner@example.com")
    client.post(
        "/api/exchanges",
        data={"title": "Mesa", "description": "Ratona", "category": "Hogar"},
    )
    exchange_id = client.get("/api/exchanges").get_json()["items"][0]["id"]
    client.post("/api/auth/logout")

    register_user(client, username="fan", email="fan@example.com")

    first = client.post(f"/api/favorites/{exchange_id}")
    assert first.get_json()["favorited"] is True

    second = client.post(f"/api/favorites/{exchange_id}")
    assert second.get_json()["favorited"] is False
