from flask import Blueprint, jsonify
from flask_login import current_user, login_required

from app.extensions import db
from app.models import Notification

notifications_bp = Blueprint("notifications", __name__, url_prefix="/api/notifications")


@notifications_bp.get("")
@login_required
def list_notifications():
    notifications = (
        Notification.query.filter_by(user_id=current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )

    unread = [n for n in notifications if not n.is_read]
    for notification in unread:
        notification.is_read = True
    if unread:
        db.session.commit()

    return jsonify(items=[n.to_dict() for n in notifications])
