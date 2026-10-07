import enum
from datetime import datetime

from app.extensions import db


class TransactionStatus(str, enum.Enum):
    EN_PROCESO = "En proceso"
    COMPLETADO = "Completado"
    CANCELADO = "Cancelado"


class Transaction(db.Model):
    """Registro del intercambio real, separado de la publicación."""

    __tablename__ = "transactions"

    id = db.Column(db.Integer, primary_key=True)
    exchange_id = db.Column(
        db.Integer,
        db.ForeignKey("exchanges.id", ondelete="CASCADE"),
        nullable=False,
    )
    exchange_request_id = db.Column(
        db.Integer,
        db.ForeignKey("exchange_requests.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    owner_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    requester_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    status = db.Column(
        db.Enum(
            TransactionStatus,
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
        ),
        nullable=False,
        default=TransactionStatus.EN_PROCESO,
    )
    started_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    completed_at = db.Column(db.DateTime)
    cancelled_at = db.Column(db.DateTime)
    cancellation_reason = db.Column(db.String(255))

    exchange = db.relationship("Exchange", backref=db.backref("transactions", lazy=True))
    exchange_request = db.relationship("ExchangeRequest", backref=db.backref("transaction", uselist=False))
    owner = db.relationship("User", foreign_keys=[owner_id])
    requester = db.relationship("User", foreign_keys=[requester_id])

    def to_dict(self):
        return {
            "id": self.id,
            "exchange_id": self.exchange_id,
            "exchange_request_id": self.exchange_request_id,
            "owner_id": self.owner_id,
            "requester_id": self.requester_id,
            "status": self.status.value if self.status else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "cancelled_at": self.cancelled_at.isoformat() if self.cancelled_at else None,
            "cancellation_reason": self.cancellation_reason,
        }
