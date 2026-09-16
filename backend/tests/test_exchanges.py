from app.models import Exchange, ModerationStatus
from tests.conftest import login_user, register_user


def _create_exchange(client, **overrides):
    data = {"title": "Guitarra", "offers": "Guitarra acústica", "seeks": "Amplificador", "category": "Bienes"}
    data.update(overrides)
    return client.post("/api/exchanges", data=data)


def _create_and_approve(client, db, **overrides):
    """La mayoría de los tests no están probando moderación en sí, así que
    aprobamos directo en la base para no tener que loguear un admin cada vez."""
    response = _create_exchange(client, **overrides)
    exchange_id = response.get_json()["exchange"]["id"]
    exchange = db.session.get(Exchange, exchange_id)
    exchange.moderation_status = ModerationStatus.APROBADO
    db.session.commit()
    return exchange_id


def test_create_exchange_persists_form_data(client, db):
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
    # RF15: nace pendiente de aprobación, no visible aún en el listado público
    assert body["moderation_status"] == "Pendiente"

    me = client.get("/api/auth/me").get_json()["user"]
    own_listing = client.get(f"/api/exchanges?owner_id={me['id']}").get_json()
    assert own_listing["total"] == 1
    assert own_listing["items"][0]["title"] == "Bicicleta usada"

    public_listing = client.get("/api/exchanges").get_json()
    assert public_listing["total"] == 0


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


def test_full_request_accept_flow(client, db):
    register_user(client, username="owner", email="owner@example.com")
    exchange_id = _create_and_approve(client, db)
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


def test_cannot_request_own_exchange(client, db):
    register_user(client)
    exchange_id = _create_and_approve(client, db, title="Silla")

    response = client.post(f"/api/exchanges/{exchange_id}/request")
    assert response.status_code == 400


def test_toggle_favorite(client, db):
    register_user(client, username="owner", email="owner@example.com")
    exchange_id = _create_and_approve(client, db, title="Mesa")
    client.post("/api/auth/logout")

    register_user(client, username="fan", email="fan@example.com")

    first = client.post(f"/api/favorites/{exchange_id}")
    assert first.get_json()["favorited"] is True

    second = client.post(f"/api/favorites/{exchange_id}")
    assert second.get_json()["favorited"] is False


def test_filter_by_category(client, db):
    register_user(client)
    _create_and_approve(client, db, title="Curso de guitarra", category="Servicios")
    _create_and_approve(client, db, title="Bicicleta", category="Bienes")

    response = client.get("/api/exchanges?category=Servicios")
    items = response.get_json()["items"]
    assert len(items) == 1
    assert items[0]["title"] == "Curso de guitarra"


def test_search_matches_title_and_description(client, db):
    register_user(client)
    _create_and_approve(client, db, title="Bicicleta rodado 26", description="Ideal para ciudad")
    _create_and_approve(client, db, title="Silla de oficina", description="Ergonómica, poco uso")

    by_title = client.get("/api/exchanges?search=bicicleta").get_json()["items"]
    assert len(by_title) == 1

    by_description = client.get("/api/exchanges?search=ergonómica").get_json()["items"]
    assert len(by_description) == 1
    assert by_description[0]["title"] == "Silla de oficina"


def test_filter_by_owner_id_only_shows_approved_to_others(client, db):
    register_user(client, username="owner1", email="owner1@example.com")
    approved_id = _create_and_approve(client, db, title="Aprobada de owner1")
    _create_exchange(client, title="Pendiente de owner1")  # sin aprobar
    owner1_id = client.get("/api/auth/me").get_json()["user"]["id"]
    client.post("/api/auth/logout")

    register_user(client, username="owner2", email="owner2@example.com")
    _create_and_approve(client, db, title="De owner2")

    response = client.get(f"/api/exchanges?owner_id={owner1_id}")
    items = response.get_json()["items"]
    # owner2 solo ve la aprobada de owner1, no la pendiente
    assert len(items) == 1
    assert items[0]["title"] == "Aprobada de owner1"


def test_distance_km_appears_when_both_have_coordinates(client, db):
    register_user(client, username="owner", email="owner@example.com")
    client.put(
        "/api/users/me",
        data={"latitude": "10.9639", "longitude": "-74.7964"},  # Barranquilla
    )
    _create_and_approve(client, db, title="Con ubicación")
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


def test_distance_km_is_null_without_coordinates(client, db):
    register_user(client)
    _create_and_approve(client, db, title="Sin ubicación")

    response = client.get("/api/exchanges")
    assert response.get_json()["items"][0]["distance_km"] is None


def test_nearby_filters_out_exchanges_beyond_radius(client, db):
    """
    RF08: 'nearby' debe FILTRAR por radio, no solo ordenar. Barranquilla-
    Bogotá son ~700km, así que con un radio de 50km la publicación lejana
    no debería aparecer en absoluto.
    """
    register_user(client, username="owner", email="owner@example.com")
    client.put("/api/users/me", data={"latitude": "10.9639", "longitude": "-74.7964"})  # Barranquilla
    _create_and_approve(client, db, title="Lejos")
    client.post("/api/auth/logout")

    register_user(client, username="viewer", email="viewer@example.com")
    client.put("/api/users/me", data={"latitude": "4.7110", "longitude": "-74.0721"})  # Bogotá

    response = client.get("/api/exchanges?nearby=true&radius_km=50")
    assert response.get_json()["items"] == []


def test_nearby_includes_exchanges_within_radius(client, db):
    register_user(client, username="owner", email="owner@example.com")
    client.put("/api/users/me", data={"latitude": "10.9639", "longitude": "-74.7964"})  # Barranquilla
    _create_and_approve(client, db, title="Cerca")
    client.post("/api/auth/logout")

    register_user(client, username="viewer", email="viewer@example.com")
    client.put("/api/users/me", data={"latitude": "10.9878", "longitude": "-74.7889"})  # Barranquilla, muy cerca

    response = client.get("/api/exchanges?nearby=true&radius_km=50")
    items = response.get_json()["items"]
    assert len(items) == 1
    assert items[0]["title"] == "Cerca"


def test_nearby_requires_own_location(client, db):
    register_user(client)
    _create_and_approve(client, db, title="Publicación")

    response = client.get("/api/exchanges?nearby=true")
    assert response.status_code == 400


def test_nearby_rejects_radius_out_of_range(client, db):
    register_user(client)
    client.put("/api/users/me", data={"latitude": "10.9639", "longitude": "-74.7964"})

    response = client.get("/api/exchanges?nearby=true&radius_km=500")
    assert response.status_code == 400


def test_register_rejects_invalid_coordinates(client):
    response = client.post(
        "/api/auth/register",
        json={
            "username": "conubicacionmala",
            "email": "malaubicacion@example.com",
            "password": "clave1234",
            "latitude": 200,
            "longitude": -74.79,
        },
    )
    assert response.status_code == 400
    assert "location" in response.get_json()["fields"]


def test_update_profile_rejects_invalid_coordinates(client):
    register_user(client)
    response = client.put("/api/users/me", data={"latitude": "999", "longitude": "-74.79"})
    assert response.status_code == 400


def test_owner_can_complete_exchange(client, db):
    """
    RF12: solo se puede completar un intercambio que ya está "En proceso"
    (con una solicitud aceptada), no directo desde "Disponible".
    """
    register_user(client, username="owner", email="owner@example.com")
    exchange_id = _create_and_approve(client, db, title="Para completar")
    client.post("/api/auth/logout")

    register_user(client, username="requester", email="requester@example.com")
    request_id = client.post(f"/api/exchanges/{exchange_id}/request").get_json()["request"]["id"]
    client.post("/api/auth/logout")

    login_user(client, email="owner@example.com")
    client.post(f"/api/exchanges/requests/{request_id}/accept")

    response = client.post(f"/api/exchanges/{exchange_id}/complete")
    assert response.status_code == 200
    assert response.get_json()["exchange"]["status"] == "Completado"


def test_cannot_complete_exchange_still_available(client, db):
    register_user(client)
    exchange_id = _create_and_approve(client, db, title="Sin aceptar nada todavía")

    response = client.post(f"/api/exchanges/{exchange_id}/complete")
    assert response.status_code == 409


def test_accepting_a_request_closes_other_pending_requests(client, db):
    register_user(client, username="owner", email="owner@example.com")
    exchange_id = _create_and_approve(client, db, title="Con varios interesados")
    client.post("/api/auth/logout")

    register_user(client, username="req1", email="req1@example.com")
    request1_id = client.post(f"/api/exchanges/{exchange_id}/request").get_json()["request"]["id"]
    client.post("/api/auth/logout")

    register_user(client, username="req2", email="req2@example.com")
    request2_id = client.post(f"/api/exchanges/{exchange_id}/request").get_json()["request"]["id"]
    client.post("/api/auth/logout")

    login_user(client, email="owner@example.com")
    client.post(f"/api/exchanges/requests/{request1_id}/accept")

    response = client.post(f"/api/exchanges/requests/{request2_id}/reject")
    assert response.status_code == 409  # ya fue rechazada automáticamente


def test_cannot_request_exchange_already_in_process(client, db):
    register_user(client, username="owner", email="owner@example.com")
    exchange_id = _create_and_approve(client, db, title="Ya con dueño de trueque")
    client.post("/api/auth/logout")

    register_user(client, username="req1", email="req1@example.com")
    request1_id = client.post(f"/api/exchanges/{exchange_id}/request").get_json()["request"]["id"]
    client.post("/api/auth/logout")

    login_user(client, email="owner@example.com")
    client.post(f"/api/exchanges/requests/{request1_id}/accept")
    client.post("/api/auth/logout")

    register_user(client, username="req2", email="req2@example.com")
    response = client.post(f"/api/exchanges/{exchange_id}/request")
    assert response.status_code == 409


def test_accepted_requester_can_cancel_in_process_exchange(client, db):
    register_user(client, username="owner", email="owner@example.com")
    exchange_id = _create_and_approve(client, db, title="Trueque cancelable")
    client.post("/api/auth/logout")

    register_user(client, username="requester", email="requester@example.com")
    request_id = client.post(f"/api/exchanges/{exchange_id}/request").get_json()["request"]["id"]
    client.post("/api/auth/logout")

    login_user(client, email="owner@example.com")
    client.post(f"/api/exchanges/requests/{request_id}/accept")
    client.post("/api/auth/logout")

    login_user(client, email="requester@example.com")
    response = client.post(f"/api/exchanges/{exchange_id}/cancel")
    assert response.status_code == 200
    assert response.get_json()["exchange"]["status"] == "Cancelado"


def test_cannot_cancel_exchange_still_available(client, db):
    register_user(client)
    exchange_id = _create_and_approve(client, db, title="Todavía disponible")

    response = client.post(f"/api/exchanges/{exchange_id}/cancel")
    assert response.status_code == 409


def test_stranger_cannot_cancel_exchange(client, db):
    register_user(client, username="owner", email="owner@example.com")
    exchange_id = _create_and_approve(client, db, title="Ajeno")
    client.post("/api/auth/logout")

    register_user(client, username="requester", email="requester@example.com")
    request_id = client.post(f"/api/exchanges/{exchange_id}/request").get_json()["request"]["id"]
    client.post("/api/auth/logout")

    login_user(client, email="owner@example.com")
    client.post(f"/api/exchanges/requests/{request_id}/accept")
    client.post("/api/auth/logout")

    register_user(client, username="stranger", email="stranger@example.com")
    response = client.post(f"/api/exchanges/{exchange_id}/cancel")
    assert response.status_code == 403


def test_non_owner_cannot_complete_exchange(client, db):
    register_user(client, username="owner", email="owner@example.com")
    exchange_id = _create_and_approve(client, db, title="Ajeno")
    client.post("/api/auth/logout")

    register_user(client, username="stranger", email="stranger@example.com")
    response = client.post(f"/api/exchanges/{exchange_id}/complete")
    assert response.status_code == 403


def test_owner_can_edit_own_exchange(client):
    register_user(client)
    create = _create_exchange(client, title="Original")
    exchange_id = create.get_json()["exchange"]["id"]

    response = client.put(f"/api/exchanges/{exchange_id}", data={"title": "Editado"})
    assert response.status_code == 200
    assert response.get_json()["exchange"]["title"] == "Editado"


def test_editing_sends_back_to_pending_moderation(client, db):
    register_user(client)
    exchange_id = _create_and_approve(client, db, title="Aprobada")

    client.put(f"/api/exchanges/{exchange_id}", data={"title": "Aprobada editada"})

    exchange = db.session.get(Exchange, exchange_id)
    assert exchange.moderation_status == ModerationStatus.PENDIENTE


def test_non_owner_cannot_edit_exchange(client, db):
    register_user(client, username="owner", email="owner@example.com")
    exchange_id = _create_and_approve(client, db, title="Ajena")
    client.post("/api/auth/logout")

    register_user(client, username="stranger", email="stranger@example.com")
    response = client.put(f"/api/exchanges/{exchange_id}", data={"title": "Hackeada"})
    assert response.status_code == 403


def test_owner_can_delete_own_exchange(client):
    register_user(client)
    create = _create_exchange(client, title="A borrar")
    exchange_id = create.get_json()["exchange"]["id"]

    response = client.delete(f"/api/exchanges/{exchange_id}")
    assert response.status_code == 200

    me = client.get("/api/auth/me").get_json()["user"]
    listing = client.get(f"/api/exchanges?owner_id={me['id']}").get_json()
    assert listing["total"] == 0


def test_non_owner_cannot_delete_exchange(client, db):
    register_user(client, username="owner", email="owner@example.com")
    exchange_id = _create_and_approve(client, db, title="Ajena")
    client.post("/api/auth/logout")

    register_user(client, username="stranger", email="stranger@example.com")
    response = client.delete(f"/api/exchanges/{exchange_id}")
    assert response.status_code == 403


def test_history_shows_only_completed_exchanges(client, db):
    register_user(client, username="owner", email="owner@example.com")
    completed_id = _create_and_approve(client, db, title="Completado")
    pending_id = _create_and_approve(client, db, title="Todavía pendiente")
    client.post("/api/auth/logout")

    register_user(client, username="requester", email="requester@example.com")
    request_id = client.post(f"/api/exchanges/{completed_id}/request").get_json()["request"]["id"]
    client.post("/api/auth/logout")

    login_user(client, email="owner@example.com")
    client.post(f"/api/exchanges/requests/{request_id}/accept")
    client.post(f"/api/exchanges/{completed_id}/complete")

    response = client.get("/api/exchanges/history")
    items = response.get_json()["items"]

    titles = [i["title"] for i in items]
    assert "Completado" in titles
    assert "Todavía pendiente" not in titles


def test_history_includes_other_participant(client, db):
    register_user(client, username="owner", email="owner@example.com")
    exchange_id = _create_and_approve(client, db, title="Trueque real")
    client.post("/api/auth/logout")

    register_user(client, username="requester", email="req@example.com")
    request_response = client.post(f"/api/exchanges/{exchange_id}/request")
    request_id = request_response.get_json()["request"]["id"]
    client.post("/api/auth/logout")

    client.post("/api/auth/login", json={"email": "owner@example.com", "password": "clave1234"})
    client.post(f"/api/exchanges/requests/{request_id}/accept")
    client.post(f"/api/exchanges/{exchange_id}/complete")

    owner_history = client.get("/api/exchanges/history").get_json()["items"]
    assert owner_history[0]["other_participant"]["username"] == "requester"

    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"email": "req@example.com", "password": "clave1234"})
    requester_history = client.get("/api/exchanges/history").get_json()["items"]
    assert requester_history[0]["other_participant"]["username"] == "owner"
