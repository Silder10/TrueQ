import os

from flask import Blueprint, current_app, jsonify
from flask_login import current_user, login_required

from app.extensions import db
from app.models import Exchange, Message, Notification, User
from app.utils import admin_required, paginated_response

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@admin_bp.get("/dashboard")
@login_required
@admin_required
def dashboard():
    return jsonify(
        users_count=User.query.count(),
        exchanges_count=Exchange.query.count(),
        messages_count=Message.query.count(),
        notifications_count=Notification.query.count(),
    )


@admin_bp.get("/users")
@login_required
@admin_required
def list_users():
    query = User.query.order_by(User.created_at.desc())
    return paginated_response(query, lambda u: u.to_dict(include_email=True))


@admin_bp.get("/exchanges")
@login_required
@admin_required
def list_exchanges():
    query = Exchange.query.order_by(Exchange.created_at.desc())
    return paginated_response(query, lambda e: e.to_dict())


@admin_bp.post("/users/<int:user_id>/make-admin")
@login_required
@admin_required
def make_admin(user_id):
    user = User.query.get_or_404(user_id)
    user.role = "admin"
    db.session.commit()
    return jsonify(user=user.to_dict(include_email=True))


@admin_bp.delete("/users/<int:user_id>")
@login_required
@admin_required
def delete_user(user_id):
    user = User.query.get_or_404(user_id)

    if user.id == current_user.id:
        return jsonify(error="No puedes eliminar tu propia cuenta."), 400

    # Gracias a ondelete='CASCADE' en las FKs y a cascade='all, delete-orphan'
    # en las relaciones, esto ya no revienta con IntegrityError como en el
    # proyecto original al haber mensajes/solicitudes/favoritos asociados.
    db.session.delete(user)
    db.session.commit()

    return jsonify(message="Usuario eliminado.")


@admin_bp.delete("/exchanges/<int:exchange_id>")
@login_required
@admin_required
def delete_exchange(exchange_id):
    exchange = Exchange.query.get_or_404(exchange_id)

    if exchange.image != "exchange.png":
        image_path = os.path.join(current_app.config["UPLOAD_FOLDER"], exchange.image)
        if os.path.exists(image_path):
            os.remove(image_path)

    db.session.delete(exchange)
    db.session.commit()

    return jsonify(message="Publicación eliminada.")
