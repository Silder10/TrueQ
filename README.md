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

## Crear tu primer administrador

**Importante**: ningún usuario nace admin, y el panel de admin solo lo puede usar otro admin — así que hace falta este comando de terminal una sola vez, para destrabar al primero:

```bash
flask create-admin tu-correo@ejemplo.com
```

(también podés usar el username o el teléfono con el que te registraste). Una vez creado, cerrá sesión y volvé a entrar en el frontend — ahí vas a ver la opción **Admin** en el menú. Desde el panel admin ya podés promover a otros usuarios sin volver a usar este comando.

## Actualizar una base de datos existente

El esquema volvió a cambiar en esta ronda (tablas `reports`, `blocks`,
`muted_conversations`, y columnas nuevas en `users`/`exchanges`/`messages`).
Si ya tenías `trueq_db` de una ronda anterior, hay que recrearla:

```bash
mysql -u root -e "DROP DATABASE trueq_db; CREATE DATABASE trueq_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
flask db upgrade
```

## Geolocalización real

La ubicación se captura con `navigator.geolocation` del navegador (botón "Usar
mi ubicación actual" en el registro y en Ajustes) y se traduce a un nombre de
ciudad legible con [Nominatim](https://nominatim.org) (OpenStreetMap, gratis,
sin API key). La distancia entre usuarios se calcula en el backend con la
fórmula de Haversine (`backend/app/services/geolocation.py`) — sin depender de
ningún servicio externo para eso. El botón "Cerca de mí" en Explorar ordena
por esa distancia.

Si el usuario no da permiso de ubicación, puede escribir su ciudad a mano; en
ese caso no hay distancia en km, solo el nombre de la ciudad.

## Cobertura de requisitos (FASE_REQUISITOS_TrueQ.pdf)

| # | Requisito | Estado |
|---|---|---|
| RF01 | Registro de usuarios (correo o teléfono) | ✅ |
| RF02 | Autenticación | ✅ |
| RF03 | Contraseñas seguras + recuperación | ✅ hash + reseteo por token — **envío de email simulado, ver nota abajo** |
| RF04 | Gestión de publicaciones (crear/editar/eliminar) | ✅ |
| RF05 | Gestión de reportes (admin) | ✅ |
| RF06 | Condiciones de intercambio (ofrece/busca) | ✅ |
| RF07 | Geolocalización | ✅ (ciudad + distancia real; radio configurable pendiente) |
| RF08 | Búsqueda y filtros | ✅ (título + descripción + categoría + distancia) |
| RF09 | Chat en tiempo real | ✅ Socket.IO + imágenes + silenciar/bloquear (cifrado end-to-end no implementado) |
| RF10 | Valoraciones y reputación | ✅ |
| RF11 | Notificaciones | ✅ in-app (push fuera de alcance) |
| RF12 | Historial de intercambios | ✅ pantalla dedicada, solo muestra completados |
| RF13 | Reportes y bloqueo de usuarios | ✅ |
| RF14 | Gestión de perfil | ✅ |
| RF15 | Moderación de contenido (revisión manual) | ✅ toda publicación nace Pendiente y requiere aprobación de admin |

### ⚠️ Nota importante sobre RF03 (recuperar contraseña)

El backend genera el token de forma segura (hasheado, expira en 1 hora) y
tiene toda la lógica lista, pero el **envío real del correo no está
conectado** — en vez de mandar un email, el enlace de recuperación se
imprime en el log del servidor (`current_app.logger.warning(...)`). Para que
esto funcione de verdad en producción hace falta:
1. Contratar/configurar un proveedor SMTP (Gmail con contraseña de aplicación,
   SendGrid, Mailgun, etc.)
2. Instalar `Flask-Mail` y configurar sus credenciales en `.env`
3. Reemplazar el `current_app.logger.warning(...)` en
   `backend/app/blueprints/auth/routes.py` (función `forgot_password`) por el
   envío real.

No se pudo dejar esto funcionando end-to-end en este entorno de desarrollo
porque requiere credenciales de un servicio externo real.

## Sistema de diseño: "Mercado nocturno"

El frontend usa un tema oscuro nativo (no es un modo claro con un toggle):
fondo carbón (`#12141a`), tarjetas en `#1b1e27`, acento primario verde lima
(`#c6ff3d`) y secundario violeta (`#8b5cf6`), tipografía Space Grotesk para
títulos + Inter para el resto. Todo el sistema de colores vive en
`frontend/src/styles/tokens.css` como variables CSS — si querés ajustar la
paleta, ese es el único archivo que hay que tocar en la mayoría de los casos,
porque el resto de los componentes usan `var(--algo)` en vez de colores fijos.

## Estructura de navegación

Los links más usados (Explorar, Publicar, Chats) están siempre visibles en la
barra superior en desktop, y en la barra inferior en mobile. El botón ☰ solo
guarda lo secundario: Favoritos, Historial, Configuración, y Administración
(si sos admin).

## Pendiente / próximos pasos sugeridos

- Rate limiting en `/api/auth/login` (Flask-Limiter).
- Verificación de email en el registro.
- Paginación visible en el frontend (la API ya la soporta vía `?page=`).
- Tests de frontend (Vitest + Testing Library).
- CI en GitHub Actions: `pytest` en cada PR, `npm run build` en cada PR.
