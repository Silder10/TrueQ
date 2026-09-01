from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from sqlalchemy import and_, or_

from app.extensions import db
from app.models import Message, User
from app.services.notifications import notify

chat_bp = Blueprint("chat", __name__, url_prefix="/api")


@chat_bp.get("/conversations")
@login_required
def conversations():
    sent_to = db.session.query(Message.receiver_id).filter_by(sender_id=current_user.id)
    received_from = db.session.query(Message.sender_id).filter_by(receiver_id=current_user.id)

    user_ids = [uid for (uid,) in sent_to.union(received_from).all()]
    users = User.query.filter(User.id.in_(user_ids)).all()

    return jsonify(items=[u.to_dict() for u in users])


@chat_bp.get("/chat/<int:user_id>")
@login_required
def get_messages(user_id):
    other_user = User.query.get_or_404(user_id)

    messages = (
        Message.query.filter(
            or_(
                and_(Message.sender_id == current_user.id, Message.receiver_id == other_user.id),
                and_(Message.sender_id == other_user.id, Message.receiver_id == current_user.id),
            )
        )
        .order_by(Message.timestamp.asc())
        .all()
    )

    return jsonify(
        other_user=other_user.to_dict(),
        messages=[m.to_dict() for m in messages],
    )


@chat_bp.post("/chat/<int:user_id>")
@login_required
def send_message(user_id):
    other_user = User.query.get_or_404(user_id)

    if other_user.id == current_user.id:
        return jsonify(error="No puedes chatear contigo mismo."), 400

    data = request.get_json(silent=True) or {}
    content = (data.get("content") or "").strip()

    if not content:
        return jsonify(error="El mensaje no puede estar vacío."), 400

    message = Message(sender_id=current_user.id, receiver_id=other_user.id, content=content)
    db.session.add(message)

    notify(other_user.id, f"{current_user.username} te envió un mensaje.")

    db.session.commit()

    return jsonify(message=message.to_dict()), 201
