import enum
from datetime import datetime

from app.extensions import db


class RequestStatus(str, enum.Enum):
    PENDIENTE = "Pendiente"
    ACEPTADA = "Aceptada"
    RECHAZADA = "Rechazada"


class ExchangeRequest(db.Model):
    __tablename__ = "exchange_requests"

    id = db.Column(db.Integer, primary_key=True)
    status = db.Column(
        db.Enum(RequestStatus),
        default=RequestStatus.PENDIENTE,
        nullable=False,
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    exchange_id = db.Column(
        db.Integer,
        db.ForeignKey("exchanges.id", ondelete="CASCADE"),
        nullable=False,
    )
    requester_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    requester = db.relationship("User", backref="exchange_requests")

    def to_dict(self):
        return {
            "id": self.id,
            "status": self.status.value if self.status else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "exchange": self.exchange.to_dict(include_owner=False) if self.exchange else None,
            "requester": self.requester.to_dict() if self.requester else None,
        }
