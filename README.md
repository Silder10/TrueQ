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

## Rediseño UI/UX + funciones nuevas (segunda ronda)

- **Backend**: modelo `Review` (calificación 1-5 + comentario, solo entre
  participantes de un intercambio con solicitud aceptada), campo `city` e
  `interests` en `User`, `Exchange.category` como enum real
  (Materiales/Bienes/Servicios), campos `offers`/`seeks` separados de
  `description`. Endpoint nuevo: `GET/POST /api/exchanges/<id>/reviews`,
  `GET /api/users/<id>/reviews`. Filtro `owner_id` en el listado de exchanges
  (usado por la pestaña "Intercambios" del perfil).
- **Frontend**: sistema de diseño nuevo (paleta azul/verde, Inter, esquinas
  redondeadas, sombras suaves), navegación por drawer + bottom nav en mobile,
  registro en 5 pasos (datos → contraseña → intereses → ciudad →
  confirmación), tarjetas de intercambio con estructura "Ofrece/Busca",
  perfil con tabs (Intercambios/Reseñas) y rating visible.
- **Nota de alcance**: "ubicación" es por ciudad (texto libre que el usuario
  edita), no geolocalización GPS con distancia en km — eso quedaría para una
  fase aparte si lo necesitás.
- **25/26 → 26/26 tests en verde** tras sumar los de reseñas y filtro por
  dueño.

## Actualizar una base de datos existente

Como el esquema cambió (tabla `reviews` nueva, columnas nuevas en `users`,
`category`/`offers`/`seeks` en `exchanges`), si ya tenías `trueq_db` creada de
una ronda anterior hay que recrearla:

```bash
mysql -u root -e "DROP DATABASE trueq_db; CREATE DATABASE trueq_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
flask db upgrade
```

## Pendiente / próximos pasos sugeridos

- Rate limiting en `/api/auth/login` (Flask-Limiter).
- Verificación de email en el registro.
- Paginación visible en el frontend (la API ya la soporta vía `?page=`).
- Tests de frontend (Vitest + Testing Library).
- CI en GitHub Actions: `pytest` en cada PR, `npm run build` en cada PR.
