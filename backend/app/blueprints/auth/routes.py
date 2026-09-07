import secrets
from datetime import datetime, timedelta

from flask import Blueprint, current_app, jsonify, request
from flask_login import current_user, login_required, login_user, logout_user
from flask_wtf.csrf import generate_csrf

from app.extensions import db
from app.models import ExchangeCategory, User

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.get("/csrf")
def csrf_token():
    """
    El front pide este token una vez al cargar y lo reenvía en el header
    X-CSRFToken en cada POST/PUT/DELETE. Con auth por cookie de sesión,
    esto es lo que reemplaza al 'hidden_tag()' que usaban los formularios
    server-rendered originales.
    """
    return jsonify(csrf_token=generate_csrf())


@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}

    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    city = (data.get("city") or "").strip() or None
    latitude = data.get("latitude")
    longitude = data.get("longitude")
    interests = data.get("interests") or []

    errors = {}
    if len(username) < 3 or len(username) > 50:
        errors["username"] = "El usuario debe tener entre 3 y 50 caracteres."
    if "@" not in email:
        errors["email"] = "Correo inválido."
    if len(password) < 8:
        errors["password"] = "La contraseña debe tener al menos 8 caracteres."

    valid_categories = {c.value for c in ExchangeCategory}
    if not isinstance(interests, list) or any(i not in valid_categories for i in interests):
        errors["interests"] = "Selección de intereses inválida."

    if errors:
        return jsonify(error="Datos inválidos.", fields=errors), 400

    if User.query.filter_by(email=email).first():
        return jsonify(error="El correo ya está registrado.", fields={"email": "Ya en uso."}), 409

    if User.query.filter_by(username=username).first():
        return jsonify(error="El usuario ya existe.", fields={"username": "Ya en uso."}), 409

    user = User(
        username=username, email=email, city=city, interests=interests,
        latitude=latitude if isinstance(latitude, (int, float)) else None,
        longitude=longitude if isinstance(longitude, (int, float)) else None,
    )
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    login_user(user)

    return jsonify(user=user.to_dict(include_email=True)), 201


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify(error="Correo o contraseña incorrectos."), 401

    if user.is_suspended:
        return jsonify(error="Tu cuenta está suspendida. Contactá a un administrador."), 403

    login_user(user, remember=bool(data.get("remember")))

    return jsonify(user=user.to_dict(include_email=True))


@auth_bp.post("/logout")
@login_required
def logout():
    logout_user()
    return jsonify(message="Sesión cerrada correctamente.")


@auth_bp.get("/me")
def me():
    if not current_user.is_authenticated:
        return jsonify(user=None), 200
    return jsonify(user=current_user.to_dict(include_email=True))


@auth_bp.post("/forgot-password")
def forgot_password():
    """
    RF03: recuperación de contraseña.

    IMPORTANTE — esto genera el token y lo deja listo, pero el "envío" de
    email está simulado (se imprime en el log del servidor en vez de
    mandarse de verdad). Para que esto funcione en producción hace falta
    conectar un proveedor SMTP real (Flask-Mail + Gmail/SendGrid/etc. con
    sus credenciales), que no está configurado en este proyecto todavía.
    """
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()

    user = User.query.filter_by(email=email).first()

    # Respondemos igual exista o no el correo, para no filtrar qué emails
    # están registrados (buena práctica de seguridad estándar).
    if user:
        raw_token = secrets.token_urlsafe(32)
        user.set_reset_token(raw_token, datetime.utcnow() + timedelta(hours=1))
        db.session.commit()

        reset_link = f"{request.host_url.rstrip('/')}/reset-password?token={raw_token}&email={email}"
        current_app.logger.warning(
            "== EMAIL SIMULADO (falta conectar SMTP real) ==\n"
            f"Para: {email}\nAsunto: Recuperá tu contraseña de TRUEQ\n"
            f"Link (válido 1 hora): {reset_link}\n"
            "================================================"
        )

    return jsonify(
        message="Si el correo existe en nuestro sistema, vas a recibir instrucciones para recuperar tu contraseña."
    )


@auth_bp.post("/reset-password")
def reset_password():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    token = data.get("token") or ""
    new_password = data.get("new_password") or ""

    if len(new_password) < 8:
        return jsonify(error="La contraseña debe tener al menos 8 caracteres."), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_reset_token(token):
        return jsonify(error="El enlace es inválido o ya expiró. Pedí uno nuevo."), 400

    user.set_password(new_password)
    user.clear_reset_token()
    db.session.commit()

    return jsonify(message="Contraseña actualizada. Ya podés iniciar sesión.")
