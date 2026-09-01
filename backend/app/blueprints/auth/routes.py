from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required, login_user, logout_user
from flask_wtf.csrf import generate_csrf

from app.extensions import db
from app.models import User

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

    errors = {}
    if len(username) < 3 or len(username) > 50:
        errors["username"] = "El usuario debe tener entre 3 y 50 caracteres."
    if "@" not in email:
        errors["email"] = "Correo inválido."
    if len(password) < 8:
        errors["password"] = "La contraseña debe tener al menos 8 caracteres."

    if errors:
        return jsonify(error="Datos inválidos.", fields=errors), 400

    if User.query.filter_by(email=email).first():
        return jsonify(error="El correo ya está registrado.", fields={"email": "Ya en uso."}), 409

    if User.query.filter_by(username=username).first():
        return jsonify(error="El usuario ya existe.", fields={"username": "Ya en uso."}), 409

    user = User(username=username, email=email)
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
