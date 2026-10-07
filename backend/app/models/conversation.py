from datetime import datetime

from app.extensions import db


class Conversation(db.Model):
    __tablename__ = "conversations"
    __table_args__ = (
        db.UniqueConstraint("user1_id", "user2_id", name="uq_conversation_users"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user1_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    user2_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user1 = db.relationship("User", foreign_keys=[user1_id])
    user2 = db.relationship("User", foreign_keys=[user2_id])
    messages = db.relationship(
        "Message",
        backref="conversation",
        lazy=True,
        cascade="all, delete-orphan",
        order_by="Message.timestamp",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user1_id": self.user1_id,
            "user2_id": self.user2_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
