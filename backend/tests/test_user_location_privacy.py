def test_precise_coordinates_are_only_returned_to_the_owner(client):
    owner_response = client.post(
        "/api/auth/register",
        json={
            "username": "ubicacion",
            "email": "ubicacion@example.com",
            "password": "clave1234",
            "latitude": 10.9878,
            "longitude": -74.7813,
        },
    )
    assert owner_response.status_code == 201
    owner = owner_response.get_json()["user"]
    owner_id = owner["id"]
    assert owner["latitude"] == 10.9878
    assert owner["longitude"] == -74.7813

    own_profile = client.get(f"/api/users/{owner_id}")
    assert own_profile.status_code == 200
    own_data = own_profile.get_json()["user"]
    assert own_data["latitude"] == 10.9878
    assert own_data["longitude"] == -74.7813

    client.post("/api/auth/logout")
    other_response = client.post(
        "/api/auth/register",
        json={
            "username": "visitante",
            "email": "visitante@example.com",
            "password": "clave1234",
        },
    )
    assert other_response.status_code == 201

    public_profile = client.get(f"/api/users/{owner_id}")
    assert public_profile.status_code == 200
    public_data = public_profile.get_json()["user"]
    assert "latitude" not in public_data
    assert "longitude" not in public_data
