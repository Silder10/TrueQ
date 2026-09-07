from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required
from sqlalchemy import and_, or_

from app.extensions import db, socketio
from app.models import Block, Message, MutedConversation, User
from app.services.notifications import notify
from app.services.uploads import InvalidImageError, save_image
from app.sockets import conversation_room

chat_bp = Blueprint("chat", __name__, url_prefix="/api")


def _is_blocked_either_way(user_a_id, user_b_id):
    return (
        Block.query.filter_by(blocker_id=user_a_id, blocked_id=user_b_id).first() is not None
        or Block.query.filter_by(blocker_id=user_b_id, blocked_id=user_a_id).first() is not None
    )


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

    is_blocked = _is_blocked_either_way(current_user.id, other_user.id)
    is_muted = (
        MutedConversation.query.filter_by(user_id=current_user.id, other_user_id=other_user.id).first()
        is not None
    )

    return jsonify(
        other_user=other_user.to_dict(),
        messages=[m.to_dict() for m in messages],
        is_blocked=is_blocked,
        is_muted=is_muted,
    )


@chat_bp.post("/chat/<int:user_id>")
@login_required
def send_message(user_id):
    other_user = User.query.get_or_404(user_id)

    if other_user.id == current_user.id:
        return jsonify(error="No puedes chatear contigo mismo."), 400

    if _is_blocked_either_way(current_user.id, other_user.id):
        return jsonify(error="No podés enviar mensajes a este usuario."), 403

    # Aceptamos tanto JSON (solo texto) como multipart (texto + imagen de
    # evidencia, RF09), según cómo venga la petición.
    if request.content_type and "multipart/form-data" in request.content_type:
        content = (request.form.get("content") or "").strip()
        image_file = request.files.get("image")
    else:
        data = request.get_json(silent=True) or {}
        content = (data.get("content") or "").strip()
        image_file = None

    image_filename = None
    if image_file and image_file.filename != "":
        try:
            image_filename = save_image(image_file, default=None)
        except InvalidImageError as exc:
            return jsonify(error=str(exc)), 400

    if not content and not image_filename:
        return jsonify(error="El mensaje no puede estar vacío."), 400

    message = Message(
        sender_id=current_user.id,
        receiver_id=other_user.id,
        content=content or None,
        image=image_filename,
    )
    db.session.add(message)

    muted = MutedConversation.query.filter_by(
        user_id=other_user.id, other_user_id=current_user.id
    ).first()
    if not muted:
        notify(other_user.id, f"{current_user.username} te envió un mensaje.")

    db.session.commit()

    payload = message.to_dict()
    socketio.emit("new_message", payload, room=conversation_room(current_user.id, other_user.id))

    return jsonify(message=payload), 201


@chat_bp.post("/chat/<int:user_id>/mute")
@login_required
def mute_conversation(user_id):
    User.query.get_or_404(user_id)
    existing = MutedConversation.query.filter_by(user_id=current_user.id, other_user_id=user_id).first()
    if not existing:
        db.session.add(MutedConversation(user_id=current_user.id, other_user_id=user_id))
        db.session.commit()
    return jsonify(message="Conversación silenciada.")


@chat_bp.delete("/chat/<int:user_id>/mute")
@login_required
def unmute_conversation(user_id):
    existing = MutedConversation.query.filter_by(user_id=current_user.id, other_user_id=user_id).first()
    if existing:
        db.session.delete(existing)
        db.session.commit()
    return jsonify(message="Conversación reactivada.")
