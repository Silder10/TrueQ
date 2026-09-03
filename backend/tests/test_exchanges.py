from tests.conftest import register_user


def test_create_exchange_persists_form_data(client):
    """
    Este es el test que habría atrapado el bug original: create_exchange()
    hacía db.session.add(Exchange) (la clase, no una instancia) y nunca leía
    los campos del form. Con eso, este test fallaría.
    """
    register_user(client)

    response = client.post(
        "/api/exchanges",
        data={
            "title": "Bicicleta usada",
            "offers": "Bicicleta rodado 26",
            "seeks": "Herramientas o algo de jardín",
            "description": "Buen estado, poco uso",
            "category": "Bienes",
        },
    )

    assert response.status_code == 201
    body = response.get_json()["exchange"]
    assert body["title"] == "Bicicleta usada"
    assert body["offers"] == "Bicicleta rodado 26"
    assert body["seeks"] == "Herramientas o algo de jardín"
    assert body["category"] == "Bienes"
    assert body["status"] == "Disponible"

    listing = client.get("/api/exchanges").get_json()
    assert listing["total"] == 1
    assert listing["items"][0]["title"] == "Bicicleta usada"


def test_create_exchange_without_image_does_not_crash(client):
    register_user(client)

    response = client.post(
        "/api/exchanges",
        data={"title": "Libro", "offers": "Libro de cocina", "seeks": "Otro libro", "category": "Bienes"},
    )

    assert response.status_code == 201
    assert response.get_json()["exchange"]["image"] == "exchange.png"


def test_create_exchange_invalid_category_returns_400(client):
    register_user(client)
    response = client.post(
        "/api/exchanges",
        data={"title": "Algo", "offers": "x", "seeks": "y", "category": "NoExiste"},
    )
    assert response.status_code == 400
    assert "category" in response.get_json()["fields"]


def test_create_exchange_missing_fields_returns_400(client):
    register_user(client)
    response = client.post("/api/exchanges", data={"title": ""})
    assert response.status_code == 400
    assert "title" in response.get_json()["fields"]


def _create_exchange(client, **overrides):
    data = {"title": "Guitarra", "offers": "Guitarra acústica", "seeks": "Amplificador", "category": "Bienes"}
    data.update(overrides)
    return client.post("/api/exchanges", data=data)


def test_full_request_accept_flow(client):
    register_user(client, username="owner", email="owner@example.com")
    _create_exchange(client)
    exchange_id = client.get("/api/exchanges").get_json()["items"][0]["id"]
    client.post("/api/auth/logout")

    register_user(client, username="requester", email="req@example.com")
    req_response = client.post(f"/api/exchanges/{exchange_id}/request")
    assert req_response.status_code == 201
    request_id = req_response.get_json()["request"]["id"]
    client.post("/api/auth/logout")

    client.post("/api/auth/login", json={"email": "owner@example.com", "password": "clave1234"})
    accept_response = client.post(f"/api/exchanges/requests/{request_id}/accept")
    assert accept_response.status_code == 200
    assert accept_response.get_json()["request"]["status"] == "Aceptada"


def test_cannot_request_own_exchange(client):
    register_user(client)
    _create_exchange(client, title="Silla")
    exchange_id = client.get("/api/exchanges").get_json()["items"][0]["id"]

    response = client.post(f"/api/exchanges/{exchange_id}/request")
    assert response.status_code == 400


def test_toggle_favorite(client):
    register_user(client, username="owner", email="owner@example.com")
    _create_exchange(client, title="Mesa")
    exchange_id = client.get("/api/exchanges").get_json()["items"][0]["id"]
    client.post("/api/auth/logout")

    register_user(client, username="fan", email="fan@example.com")

    first = client.post(f"/api/favorites/{exchange_id}")
    assert first.get_json()["favorited"] is True

    second = client.post(f"/api/favorites/{exchange_id}")
    assert second.get_json()["favorited"] is False


def test_filter_by_category(client):
    register_user(client)
    _create_exchange(client, title="Curso de guitarra", category="Servicios")
    _create_exchange(client, title="Bicicleta", category="Bienes")

    response = client.get("/api/exchanges?category=Servicios")
    items = response.get_json()["items"]
    assert len(items) == 1
    assert items[0]["title"] == "Curso de guitarra"


def test_filter_by_owner_id(client):
    register_user(client, username="owner1", email="owner1@example.com")
    _create_exchange(client, title="De owner1")
    owner1_id = client.get("/api/auth/me").get_json()["user"]["id"]
    client.post("/api/auth/logout")

    register_user(client, username="owner2", email="owner2@example.com")
    _create_exchange(client, title="De owner2")

    response = client.get(f"/api/exchanges?owner_id={owner1_id}")
    items = response.get_json()["items"]
    assert len(items) == 1
    assert items[0]["title"] == "De owner1"


def test_distance_km_appears_when_both_have_coordinates(client):
    register_user(client, username="owner", email="owner@example.com")
    client.put(
        "/api/users/me",
        data={"latitude": "10.9639", "longitude": "-74.7964"},  # Barranquilla
    )
    _create_exchange(client, title="Con ubicación")
    client.post("/api/auth/logout")

    register_user(client, username="viewer", email="viewer@example.com")
    client.put(
        "/api/users/me",
        data={"latitude": "4.7110", "longitude": "-74.0721"},  # Bogotá
    )

    response = client.get("/api/exchanges")
    item = response.get_json()["items"][0]
    assert item["distance_km"] is not None
    assert 690 < item["distance_km"] < 720  # distancia real Barranquilla-Bogotá


def test_distance_km_is_null_without_coordinates(client):
    register_user(client)
    _create_exchange(client, title="Sin ubicación")

    response = client.get("/api/exchanges")
    assert response.get_json()["items"][0]["distance_km"] is None


def test_owner_can_complete_exchange(client):
    register_user(client)
    _create_exchange(client, title="Para completar")
    exchange_id = client.get("/api/exchanges").get_json()["items"][0]["id"]

    response = client.post(f"/api/exchanges/{exchange_id}/complete")
    assert response.status_code == 200
    assert response.get_json()["exchange"]["status"] == "Completado"


def test_non_owner_cannot_complete_exchange(client):
    register_user(client, username="owner", email="owner@example.com")
    _create_exchange(client, title="Ajeno")
    exchange_id = client.get("/api/exchanges").get_json()["items"][0]["id"]
    client.post("/api/auth/logout")

    register_user(client, username="stranger", email="stranger@example.com")
    response = client.post(f"/api/exchanges/{exchange_id}/complete")
    assert response.status_code == 403
