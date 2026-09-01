from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from app.extensions import db
from app.models import User
from app.services.uploads import InvalidImageError, save_image

users_bp = Blueprint("users", __name__, url_prefix="/api/users")


@users_bp.get("/<int:user_id>")
@login_required
def get_profile(user_id):
    user = User.query.get_or_404(user_id)

    if user.is_private and user.id != current_user.id:
        return jsonify(user=user.to_dict()), 200  # perfil visible pero sin datos sensibles

    return jsonify(user=user.to_dict(include_email=(user.id == current_user.id)))


@users_bp.put("/me")
@login_required
def update_settings():
    username = request.form.get("username")
    email = request.form.get("email")
    bio = request.form.get("bio")
    new_password = request.form.get("new_password")
    is_private = request.form.get("is_private")

    if username:
        existing = User.query.filter(User.username == username, User.id != current_user.id).first()
        if existing:
            return jsonify(error="Ese nombre de usuario ya está en uso."), 409
        current_user.username = username

    if email:
        existing = User.query.filter(User.email == email, User.id != current_user.id).first()
        if existing:
            return jsonify(error="Ese correo ya está en uso."), 409
        current_user.email = email

    if bio is not None:
        current_user.bio = bio

    if is_private is not None:
        current_user.is_private = is_private == "true"

    avatar = request.files.get("avatar")
    if avatar and avatar.filename != "":
        try:
            current_user.avatar = save_image(avatar, old_filename=current_user.avatar)
        except InvalidImageError as exc:
            return jsonify(error=str(exc)), 400

    if new_password:
        if len(new_password) < 8:
            return jsonify(error="La nueva contraseña debe tener al menos 8 caracteres."), 400
        current_user.set_password(new_password)

    db.session.commit()

    return jsonify(user=current_user.to_dict(include_email=True))
