# TrueQ

TrueQ es una plataforma de intercambio de publicaciones y servicios mediante trueque, sin dinero de por medio. El proyecto está organizado en un backend Flask con API, autenticación por sesión y una aplicación frontend React + Vite.

## Contenido

- [Tecnologías y requisitos](#tecnologías-y-requisitos)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Preparar la base de datos](#preparar-la-base-de-datos)
- [Instalar y ejecutar en Windows](#instalar-y-ejecutar-en-windows)
- [Instalar y ejecutar en macOS o Linux](#instalar-y-ejecutar-en-macos-o-linux)
- [Pruebas](#pruebas)
- [Crear el primer administrador](#crear-el-primer-administrador)
- [Funciones y alcance](#funciones-y-alcance)
- [Configuración y seguridad](#configuración-y-seguridad)
- [Pendientes conocidos](#pendientes-conocidos)
- [Solución de problemas](#solución-de-problemas)

## Tecnologías y requisitos

| Componente | Requisito |
|---|---|
| Python | 3.10 o superior; se recomienda Python 3.11 o 3.12 para instalaciones nuevas |
| Node.js | 20.19 o superior; también se admite 22.12 o superior |
| npm | La versión incluida con Node.js |
| Base de datos | MySQL 8 o MariaDB 10.6 o superior |
| Git | Para clonar y actualizar el repositorio |

El frontend usa React 19 y Vite 8. Antes de instalar, comprueba las versiones:

```powershell
python --version
node --version
npm --version
git --version
```

En Windows con XAMPP, inicia el servicio **MySQL** desde el panel de control de XAMPP antes de arrancar el backend.

## Estructura del proyecto

```text
TrueQ/
├── backend/
│   ├── app/
│   │   ├── blueprints/       # Rutas agrupadas por funcionalidad
│   │   ├── models/           # Modelos de base de datos
│   │   ├── services/         # Lógica de servicios
│   │   └── ...
│   ├── migrations/            # Migraciones de esquema
│   ├── tests/                 # Pruebas del backend
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── .env.example
│   └── run.py
└── frontend/
    ├── src/
    ├── public/
    ├── package.json
    └── .env.local             # Configuración local; no compartir credenciales
```

## Preparar la base de datos

1. Inicia MySQL desde XAMPP o tu instalación local de MySQL/MariaDB.
2. Crea la base de datos **solo si todavía no existe**. En instalaciones con el cliente de MySQL disponible en el PATH:

   ```sql
   CREATE DATABASE trueq_db
     CHARACTER SET utf8mb4
     COLLATE utf8mb4_unicode_ci;
   ```

   Puedes ejecutar ese SQL desde phpMyAdmin o desde el cliente de MySQL. Si la base de datos ya existe, **no la elimines ni la recrees**.

3. Copia `backend/.env.example` a `backend/.env` y configura las credenciales que correspondan a tu servidor de base de datos.
4. Antes de aplicar migraciones a una base existente, crea una copia de seguridad. Luego revisa el estado del esquema y aplica las migraciones pendientes si corresponde.

> **Importante:** nunca ejecutes `DROP DATABASE trueq_db` como paso rutinario de instalación. Ese comando elimina la base de datos y sus datos. Las migraciones de este proyecto están en `backend/migrations/`.

## Instalar y ejecutar en Windows

Abre PowerShell en la carpeta donde quieras guardar el proyecto.

### 1. Descargar el repositorio

Si todavía no tienes una copia local:

```powershell
git clone https://github.com/Silder10/TrueQ.git
cd TrueQ
```

Si ya tienes el repositorio, entra en su carpeta y revisa tus cambios antes de actualizar:

```powershell
git status
git pull
```

No uses `git pull` si tienes cambios locales sin guardar; primero revísalos y haz commit o resguárdalos.

### 2. Configurar el backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
```

Abre `backend/.env` y configura al menos:

- `SECRET_KEY`: una clave secreta propia para esa instalación.
- `DB_USER`: usuario de MySQL (en una instalación local de XAMPP suele ser `root`).
- `DB_PASSWORD`: contraseña de ese usuario; déjala vacía únicamente si tu MySQL local no tiene contraseña.
- `DB_HOST`: normalmente `localhost`.
- `DB_NAME`: normalmente `trueq_db`.
- `CORS_ORIGINS`: para desarrollo local, `http://localhost:5173`.

Puedes generar una clave secreta desde el entorno virtual con:

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

Copia el resultado en `SECRET_KEY` dentro de `.env`. No publiques ese valor ni compartas el archivo `.env`.

### 3. Aplicar migraciones cuando corresponda

Con MySQL iniciado y las variables de `.env` revisadas:

```powershell
flask --app run.py db upgrade
```

Este comando aplica migraciones pendientes. Si la base de datos contiene información importante, confirma que tienes una copia de seguridad antes de ejecutarlo. No borra la base de datos intencionalmente, pero puede cambiar su esquema.

### 4. Iniciar el backend

Desde `backend/`, con el entorno virtual activo:

```powershell
python run.py
```

Por defecto, el backend queda disponible en **http://localhost:5001**. El puerto puede cambiarse mediante la variable de entorno `PORT`.

### 5. Instalar e iniciar el frontend

Abre una segunda terminal de PowerShell en la raíz del proyecto:

```powershell
cd frontend
npm ci
```

Comprueba que `frontend/.env.local` tenga la URL del backend local:

```dotenv
VITE_API_URL=http://localhost:5001
```

Inicia el frontend:

```powershell
npm run dev
```

Abre **http://localhost:5173** en el navegador. Mantén abiertas las dos terminales mientras trabajas: una para el backend y otra para Vite.

## Instalar y ejecutar en macOS o Linux

Los comandos son equivalentes; cambia la activación del entorno virtual y la copia del archivo de entorno:

```bash
git clone https://github.com/Silder10/TrueQ.git
cd TrueQ/backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt
cp .env.example .env
python -c "import secrets; print(secrets.token_hex(32))"
```

Completa `backend/.env` con la clave y las credenciales de tu base de datos. Con MySQL iniciado y la base preparada, aplica las migraciones pendientes:

```bash
flask --app run.py db upgrade
python run.py
```

En otra terminal:

```bash
cd TrueQ/frontend
npm ci
```

Crea o revisa `frontend/.env.local`:

```dotenv
VITE_API_URL=http://localhost:5001
```

Después ejecuta:

```bash
npm run dev
```

Frontend: **http://localhost:5173**. Backend: **http://localhost:5001**.

## Pruebas

Las pruebas del backend están en `backend/tests/` y están configuradas para utilizar SQLite en memoria mediante la configuración de testing. Ejecútalas desde `backend/` con el entorno virtual activo:

```powershell
pytest
```

Para revisar el frontend, desde `frontend/`:

```powershell
npm run lint
npm run build
```

`npm run build` genera los archivos de producción en `frontend/dist/`; esa carpeta es un artefacto de compilación, no el código fuente que se edita.

## Crear el primer administrador

Si todavía no existe una cuenta administradora, inicia el backend y ejecuta el comando desde `backend/`, con el entorno virtual activo y las variables de entorno configuradas:

```powershell
flask --app run.py create-admin tu-correo@ejemplo.com
```

Puedes utilizar el correo, nombre de usuario o teléfono asociado a la cuenta, según los datos registrados. Luego vuelve a iniciar sesión en el frontend. El panel de administración está disponible para usuarios con permisos de administrador.

## Funciones y alcance

- Registro e inicio de sesión con correo o teléfono.
- Gestión de perfil, intereses y ubicación.
- Publicación, edición y eliminación de intercambios.
- Categorías, búsqueda y filtros de publicaciones.
- Solicitudes, condiciones de intercambio e historial de intercambios completados.
- Chat en tiempo real mediante Socket.IO, con soporte para imágenes y funciones de silenciar o bloquear.
- Notificaciones dentro de la aplicación.
- Valoraciones y reseñas entre participantes elegibles.
- Reportes de usuarios y publicaciones, bloqueo y moderación administrativa.
- Interfaz adaptable a escritorio y móvil, con temas claro y oscuro.

### Ubicación

La aplicación puede solicitar la ubicación del navegador y convertir las coordenadas en una ciudad legible mediante Nominatim (OpenStreetMap). El backend calcula distancias entre coordenadas mediante la fórmula de Haversine. Si el usuario no concede permiso, puede ingresar su ciudad manualmente; en ese caso no se dispone de una distancia calculada a partir de coordenadas.

### Recuperación de contraseña

La lógica de recuperación genera un token con vencimiento, pero el envío real de correo no está conectado en la configuración documentada: el enlace se registra en los logs del backend. Para producción se debe configurar un proveedor de correo y sustituir ese comportamiento por el envío real. No se debe considerar el flujo listo para producción hasta completar esa integración.

### Cobertura de requisitos funcionales

La tabla siguiente resume la cobertura documentada del proyecto; no sustituye las pruebas de aceptación de cada función.

| Código | Requisito | Estado documentado |
|---|---|---|
| RF01 | Registro de usuarios (correo o teléfono) | Implementado |
| RF02 | Autenticación | Implementado |
| RF03 | Contraseñas seguras y recuperación | Hash y token; envío de correo pendiente |
| RF04 | Gestión de publicaciones | Implementado |
| RF05 | Gestión de reportes por administración | Implementado |
| RF06 | Condiciones de intercambio (ofrece/busca) | Implementado |
| RF07 | Geolocalización | Ciudad y cálculo de distancia; radio configurable pendiente |
| RF08 | Búsqueda y filtros | Implementado |
| RF09 | Chat en tiempo real | Socket.IO, imágenes, silenciar y bloquear; sin cifrado end-to-end |
| RF10 | Valoraciones y reputación | Implementado |
| RF11 | Notificaciones | Notificaciones dentro de la aplicación; push pendiente |
| RF12 | Historial de intercambios | Pantalla de historial de completados |
| RF13 | Reportes y bloqueo de usuarios | Implementado |
| RF14 | Gestión de perfil | Implementado |
| RF15 | Moderación manual de contenido | Las publicaciones requieren aprobación administrativa |

## Configuración y seguridad

- `backend/.env` y `frontend/.env.local` son archivos locales. No deben contener información que se publique en Git.
- Usa claves secretas y credenciales diferentes en cada entorno.
- No uses `DEBUG=True` ni las configuraciones de desarrollo en producción.
- En producción, revisa HTTPS, cookies seguras, CORS, dominios, configuración de Socket.IO y el modo de despliegue.
- La configuración de cookies entre frontend y backend depende de los dominios y del uso de HTTPS. La configuración local de desarrollo no debe copiarse sin revisión a producción.
- No compartas contraseñas, tokens de recuperación ni valores secretos al solicitar soporte.

## Pendientes conocidos

- Integrar el envío real de correos para recuperar contraseña y, si se requiere, verificar direcciones de correo.
- Añadir limitación de intentos a la autenticación.
- Añadir pruebas automatizadas del frontend.
- Configurar integración continua para ejecutar pruebas del backend y compilación del frontend en cada cambio.
- Evaluar paginación visible en la interfaz.

## Solución de problemas

### El frontend abre, pero no se conecta al backend

1. Confirma que `python run.py` sigue ejecutándose.
2. Comprueba que el backend está usando el puerto `5001`.
3. Revisa que `frontend/.env.local` contenga `VITE_API_URL=http://localhost:5001`.
4. Si modificas `.env.local`, detén y vuelve a iniciar Vite.

### Error de conexión con MySQL

1. Confirma que el servicio MySQL está iniciado en XAMPP.
2. Revisa `DB_USER`, `DB_PASSWORD`, `DB_HOST` y `DB_NAME` en `backend/.env`.
3. Comprueba que la base de datos existe y que el usuario tiene permisos.
4. No elimines ni recrees una base existente como intento genérico de solución.

### Las dependencias del frontend fallan al instalar

Comprueba las versiones de Node.js y npm. Vite 8 necesita una versión moderna de Node.js (20.19+ o 22.12+). Después, desde `frontend/`, vuelve a ejecutar `npm ci` usando el archivo `package-lock.json` del repositorio.

### Las migraciones muestran errores

Detén el proceso y conserva el mensaje de error completo. Verifica la copia de seguridad, la conexión a la base de datos y el estado de las migraciones antes de intentar corregir el esquema. No ejecutes comandos destructivos para forzar la instalación.
