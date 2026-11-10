"""
RNF02: prueba de carga de TrueQ con Locust.

Ubicación sugerida: backend/tests/locustfile.py  (o la raíz del proyecto)

Uso (PowerShell, con el backend corriendo):
    $env:LOCUST_EMAIL = "usuario@ejemplo.com"
    $env:LOCUST_PASSWORD = "su-contraseña"
    locust -f locustfile.py --host http://localhost:5000

Luego abrir http://localhost:8089 e iniciar la prueba.
Usa una cuenta NORMAL (no admin) para simular un usuario real.
"""
import os
import random

from locust import HttpUser, between, task

EMAIL = os.getenv("LOCUST_EMAIL", "")
PASSWORD = os.getenv("LOCUST_PASSWORD", "")

SEARCH_TERMS = ["bici", "libro", "guitarra", "clases", "ropa", "celular"]
CATEGORIES = ["Materiales", "Bienes", "Servicios"]


class TrueQUser(HttpUser):
    wait_time = between(1, 3)  # pausa entre acciones, como una persona real
    csrf = None

    def on_start(self):
        """Se ejecuta una vez por usuario virtual: inicia sesión."""
        resp = self.client.get("/api/auth/csrf", name="auth/csrf")
        self.csrf = resp.json().get("csrf_token")

        with self.client.post(
            "/api/auth/login",
            json={"identifier": EMAIL, "password": PASSWORD},
            headers={"X-CSRFToken": self.csrf},
            name="auth/login",
            catch_response=True,
        ) as r:
            if r.status_code != 200:
                r.failure(f"Login falló ({r.status_code}). Revisa LOCUST_EMAIL/PASSWORD.")

    @task(5)
    def list_exchanges(self):
        self.client.get("/api/exchanges", name="exchanges (listado)")

    @task(3)
    def list_page_2(self):
        self.client.get("/api/exchanges?page=2", name="exchanges (página 2)")

    @task(3)
    def search_text(self):
        term = random.choice(SEARCH_TERMS)
        self.client.get(f"/api/exchanges?search={term}", name="exchanges (búsqueda)")

    @task(1)
    def filter_category(self):
        cat = random.choice(CATEGORIES)
        with self.client.get(
            f"/api/exchanges?category={cat}",
            name="exchanges (categoría)",
            catch_response=True,
        ) as r:
            if r.status_code in (200, 400):
                r.success()

    @task(1)
    def search_nearby(self):
        # Requiere que el usuario de prueba tenga ubicación guardada;
        # si no, el backend responde 400 y se marca como aceptable.
        with self.client.get(
            "/api/exchanges?nearby=true&radius_km=20",
            name="exchanges (cerca de mí)",
            catch_response=True,
        ) as r:
            if r.status_code in (200, 400):
                r.success()