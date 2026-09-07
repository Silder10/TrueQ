from datetime import datetime

from app.extensions import db


class Block(db.Model):
    """Un usuario bloquea a otro para sí mismo: no puede mandarle mensajes,
    solicitar intercambios ni ver este perfil bloqueado como antes."""

    __tablename__ = "blocks"
    __table_args__ = (
        db.UniqueConstraint("blocker_id", "blocked_id", name="uq_block_pair"),
    )

    id = db.Column(db.Integer, primary_key=True)
    blocker_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    blocked_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class MutedConversation(db.Model):
    """Silenciar una conversación: seguís pudiendo chatear, pero no te
    generamos notificación por mensajes nuevos de esa persona."""

    __tablename__ = "muted_conversations"
    __table_args__ = (
        db.UniqueConstraint("user_id", "other_user_id", name="uq_mute_pair"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    other_user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
