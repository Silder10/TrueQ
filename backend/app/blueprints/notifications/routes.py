from flask import Blueprint, jsonify
from flask_login import current_user, login_required

from app.extensions import db
from app.models import Notification

notifications_bp = Blueprint("notifications", __name__, url_prefix="/api/notifications")


@notifications_bp.get("")
@login_required
def list_notifications():
    """
    OJO: esto ya NO marca todo como leído automáticamente (antes lo hacía,
    por eso nunca había nada que mostrar en un contador). Marcar como leído
    ahora es una acción explícita, ver /read y /read-all.
    """
    notifications = (
        Notification.query.filter_by(user_id=current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )
    return jsonify(items=[n.to_dict() for n in notifications])


@notifications_bp.get("/unread-count")
@login_required
def unread_count():
    count = Notification.query.filter_by(user_id=current_user.id, is_read=False).count()
    return jsonify(count=count)


@notifications_bp.post("/<int:notification_id>/read")
@login_required
def mark_read(notification_id):
    notification = Notification.query.get_or_404(notification_id)
    if notification.user_id != current_user.id:
        return jsonify(error="Acceso no autorizado."), 403
    notification.is_read = True
    db.session.commit()
    return jsonify(notification=notification.to_dict())


@notifications_bp.post("/read-all")
@login_required
def mark_all_read():
    Notification.query.filter_by(user_id=current_user.id, is_read=False).update({"is_read": True})
    db.session.commit()
    return jsonify(message="Todas marcadas como leídas.")
