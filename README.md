# TRUEQ

Marketplace de intercambios (trueque) sin dinero de por medio. Reescritura ordenada del proyecto original: backend Flask reorganizado en blueprints + frontend React (Vite) consumiendo la API por cookies de sesión.

## Estructura

```
trueq/
  backend/     API Flask (blueprints, modelos, migraciones, tests)
  frontend/    SPA en React + Vite
```

## Requisitos

- Python 3.11+
- Node 18+
- MySQL 8 (o MariaDB 10.6+)

## Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt

cp .env.example .env               # completa SECRET_KEY y credenciales de DB
mysql -u root -e "CREATE DATABASE trueq_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

flask db upgrade                   # aplica las migraciones
python run.py                      # http://localhost:5000
```

Correr los tests (usan SQLite en memoria, no tocan tu base de datos real):

```bash
pytest
```

## Frontend

```bash
cd frontend
npm install
npm run dev                        # http://localhost:5173
```

Si el backend no corre en `http://localhost:5000`, crea `frontend/.env.local`:

```
VITE_API_URL=http://localhost:5000
```

## Autenticación

Sesión por cookie (Flask-Login), no JWT. El frontend pide un token CSRF una vez
(`GET /api/auth/csrf`) y lo reenvía en el header `X-CSRFToken` en cada
petición que modifica datos — ver `frontend/src/api/client.js`. Esto significa
que backend y frontend deben vivir bajo el mismo dominio raíz en producción
(por ejemplo `trueq.com` y `api.trueq.com`) para que la cookie viaje entre
ambos; si terminan en dominios completamente distintos, hay que revisar
`SESSION_COOKIE_SAMESITE` en `backend/app/config.py`.

## Decisiones de esta reescritura

Ver `auditoria_trueq.md` (si la conservas de la ronda anterior) para el detalle
de los bugs del proyecto original. En resumen, esta versión corrige:

- Los 3 bugs que impedían arrancar la app (import inválido, ruta en blueprint
  ya registrado, métodos de `User` fuera de la clase).
- `create_exchange` ahora sí persiste los datos del formulario.
- CSRF real en todos los endpoints que mutan datos.
- Claves foráneas con `ON DELETE CASCADE` verificado a nivel de motor de base
  de datos (no solo en el ORM) — borrar un usuario o publicación con
  actividad asociada ya no lanza `IntegrityError`.
- `debug` controlado por variable de entorno, nunca hardcodeado en `True`.
- Suite de tests (`pytest`) que cubre los flujos críticos.

## Pendiente / próximos pasos sugeridos

- Rate limiting en `/api/auth/login` (Flask-Limiter).
- Verificación de email en el registro.
- Paginación visible en el frontend (la API ya la soporta vía `?page=`).
- Tests de frontend (Vitest + Testing Library).
- CI en GitHub Actions: `pytest` en cada PR, `npm run build` en cada PR.
