import resend
from urllib.parse import urlencode

import re

import secrets
from datetime import datetime, timedelta

from flask import Blueprint, current_app, jsonify, request
from flask_login import current_user, login_required, login_user, logout_user
from flask_wtf.csrf import generate_csrf

from app.extensions import db
from app.models import ExchangeCategory, User
from app.services.geolocation import valid_coordinates

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def validate_password(password):
    """Valida los requisitos de seguridad de una contraseña."""
    errors = []

    if len(password) < 8:
        errors.append("Debe tener al menos 8 caracteres.")

    if len(password) > 128:
        errors.append("No puede superar los 128 caracteres.")

    if not re.search(r"[A-Z]", password):
        errors.append("Debe incluir al menos una letra mayúscula.")

    if not re.search(r"[a-z]", password):
        errors.append("Debe incluir al menos una letra minúscula.")

    if not re.search(r"\d", password):
        errors.append("Debe incluir al menos un número.")

    if not re.search(r"[^A-Za-z0-9\s]", password):
        errors.append("Debe incluir al menos un carácter especial.")

    return errors


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
    email = (data.get("email") or "").strip().lower() or None
    phone = (data.get("phone") or "").strip() or None
    password = data.get("password") or ""
    city = (data.get("city") or "").strip() or None
    latitude = data.get("latitude")
    longitude = data.get("longitude")
    interests = data.get("interests") or []

    errors = {}
    if len(username) < 3 or len(username) > 50:
        errors["username"] = "El usuario debe tener entre 3 y 50 caracteres."

    # RF01: registro con correo O número de teléfono (al menos uno).
    if not email and not phone:
        errors["email"] = "Ingresá un correo o un número de teléfono."
    if email and "@" not in email:
        errors["email"] = "Correo inválido."
    if phone and (not phone.replace("+", "").replace(" ", "").isdigit() or len(phone) < 7):
        errors["phone"] = "Número de teléfono inválido."

    password_errors = validate_password(password)

    if password_errors:
        errors["password"] = password_errors

    valid_categories = {c.value for c in ExchangeCategory}
    if not isinstance(interests, list) or any(i not in valid_categories for i in interests):
        errors["interests"] = "Selección de intereses inválida."

    # RF07: si viene ubicación, tiene que ser una coordenada real (evita
    # guardar basura como lat=200 que rompería el cálculo de distancia).
    has_location = latitude is not None or longitude is not None
    if has_location and not valid_coordinates(latitude, longitude):
        errors["location"] = "Coordenadas inválidas."

    if errors:
        return jsonify(error="Datos inválidos.", fields=errors), 400

    if email and User.query.filter_by(email=email).first():
        return jsonify(error="El correo ya está registrado.", fields={"email": "Ya en uso."}), 409

    if phone and User.query.filter_by(phone=phone).first():
        return jsonify(error="El teléfono ya está registrado.", fields={"phone": "Ya en uso."}), 409

    if User.query.filter_by(username=username).first():
        return jsonify(error="El usuario ya existe.", fields={"username": "Ya en uso."}), 409

    user = User(
        username=username, email=email, phone=phone, city=city, interests=interests,
        latitude=float(latitude) if has_location else None,
        longitude=float(longitude) if has_location else None,
    )
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    login_user(user)

    return jsonify(user=user.to_dict(include_email=True)), 201


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    # "identifier" puede ser un correo o un número de teléfono (RF01).
    identifier = (data.get("identifier") or data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = User.query.filter(
        db.or_(User.email == identifier, User.phone == identifier)
    ).first()

    if not user or not user.check_password(password):
        return jsonify(error="Correo/teléfono o contraseña incorrectos."), 401

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
    """RF03: recuperación de contraseña mediante correo electrónico."""
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()

    user = User.query.filter_by(email=email).first()

    # No revelar si el correo está registrado.
    if user:
        raw_token = secrets.token_urlsafe(32)
        user.set_reset_token(
            raw_token,
            datetime.utcnow() + timedelta(hours=1)
        )
        db.session.commit()

        query = urlencode({
            "token": raw_token,
            "email": email
        })
        reset_link = (
            f"{current_app.config['FRONTEND_URL'].rstrip('/')}"
            f"/reset-password?{query}"
        )

        try:
            api_key = current_app.config.get("RESEND_API_KEY")
            sender = current_app.config.get("MAIL_FROM")

            if not api_key or not sender:
                raise RuntimeError(
                    "Falta configurar RESEND_API_KEY o MAIL_FROM."
                )

            resend.api_key = api_key

            resend.Emails.send({

                "from": sender,
                "to": [email],
                "subject": "Recuperación de contraseña de TRUEQ",
                "html": f"""
                    <!DOCTYPE html>
                    <html lang="es">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Recuperar contraseña - TrueQ</title>
                    </head>
                    <body style="margin:0; padding:0; background-color:#f3f5f9;
                                font-family:Arial,Helvetica,sans-serif; color:#202938;">

                        <table role="presentation" width="100%" cellspacing="0"
                            cellpadding="0" style="background-color:#f3f5f9; padding:32px 12px;">
                            <tr>
                                <td align="center">
                                    <table role="presentation" width="100%" cellspacing="0"
                                        cellpadding="0"
                                        style="max-width:560px; background:#ffffff;
                                                border:1px solid #e5e7eb; border-radius:12px;">

                                        <tr>
                                            <td style="padding:28px 32px; border-bottom:1px solid #edf0f4;">
                                                <span style="font-size:26px; font-weight:bold;
                                                            color:#253b80;">TrueQ</span>
                                                <span style="display:block; margin-top:6px;
                                                            color:#64748b; font-size:13px;">
                                                    Intercambia, conecta y reutiliza.
                                                </span>
                                            </td>
                                        </tr>

                                        <tr>
                                            <td style="padding:32px;">
                                                <div style="font-size:34px; margin-bottom:18px;">
                                                    🔐
                                                </div>

                                                <h1 style="font-size:24px; line-height:1.3;
                                                        margin:0 0 16px; color:#172554;">
                                                    Recupera tu contraseña
                                                </h1>

                                                <p style="font-size:15px; line-height:1.7;
                                                        color:#475569; margin:0 0 16px;">
                                                    Recibimos una solicitud para restablecer
                                                    la contraseña de tu cuenta de TrueQ.
                                                </p>

                                                <p style="font-size:15px; line-height:1.7;
                                                        color:#475569; margin:0 0 26px;">
                                                    Haz clic en el siguiente botón para crear
                                                    una contraseña nueva y volver a tu cuenta.
                                                </p>

                                                <table role="presentation" cellspacing="0"
                                                    cellpadding="0" style="margin:0 auto 26px;">
                                                    <tr>
                                                        <td align="center" bgcolor="#253b80"
                                                            style="border-radius:8px;">
                                                            <a href="{reset_link}"
                                                            style="display:inline-block;
                                                                    padding:15px 28px;
                                                                    color:#ffffff;
                                                                    text-decoration:none;
                                                                    font-size:15px;
                                                                    font-weight:bold;">
                                                                Restablecer contraseña
                                                            </a>
                                                        </td>
                                                    </tr>
                                                </table>

                                                <div style="padding:16px; background:#f8fafc;
                                                            border:1px solid #e2e8f0;
                                                            border-radius:8px;">
                                                    <p style="margin:0 0 8px; font-size:13px;
                                                            font-weight:bold; color:#334155;">
                                                        Importante para tu seguridad
                                                    </p>
                                                    <p style="margin:0; font-size:13px;
                                                            line-height:1.7; color:#64748b;">
                                                        Este enlace vence en una hora y solo debe
                                                        utilizarse para recuperar tu cuenta.
                                                        Si no solicitaste el cambio, ignora este
                                                        mensaje.
                                                    </p>
                                                </div>

                                                <p style="font-size:12px; line-height:1.6;
                                                        color:#64748b; margin:24px 0 0;">
                                                    Si el botón no funciona, copia y pega este
                                                    enlace en tu navegador:
                                                </p>

                                                <p style="font-size:12px; line-height:1.6;
                                                        overflow-wrap:anywhere; margin:8px 0 0;">
                                                    <a href="{reset_link}"
                                                    style="color:#253b80; word-break:break-all;">
                                                        {reset_link}
                                                    </a>
                                                </p>
                                            </td>
                                        </tr>

                                        <tr>
                                            <td style="padding:20px 32px; background:#f8fafc;
                                                    border-top:1px solid #edf0f4;
                                                    border-radius:0 0 12px 12px;">
                                                <p style="margin:0; text-align:center;
                                                        font-size:12px; line-height:1.7;
                                                        color:#94a3b8;">
                                                    Correo automático de TrueQ.<br>
                                                    Por favor, no respondas a este mensaje.
                                                </p>
                                            </td>
                                        </tr>

                                    </table>
                                </td>
                            </tr>
                        </table>
                    </body>
                    </html>
                    """,

                "text": (
                    "Recupera tu contraseña de TRUEQ.\n\n"
                    f"Abre este enlace: {reset_link}\n\n"
                    "El enlace vence en una hora. "
                    "Si no solicitaste este cambio, ignora este correo."
                ),
            })

        except Exception:
            current_app.logger.exception(
                "No se pudo enviar el correo de recuperación mediante Resend."
            )

    return jsonify(
        message=(
            "Si el correo existe en nuestro sistema, vas a recibir "
            "instrucciones para recuperar tu contraseña."
        )
    )



@auth_bp.post("/reset-password")
def reset_password():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    token = data.get("token") or ""
    new_password = data.get("new_password") or ""

    password_errors = validate_password(new_password)

    if password_errors:
        return jsonify(error=password_errors), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_reset_token(token):
        return jsonify(error="El enlace es inválido o ya expiró. Pedí uno nuevo."), 400

    user.set_password(new_password)
    user.clear_reset_token()
    db.session.commit()

    return jsonify(message="Contraseña actualizada. Ya podés iniciar sesión.")
