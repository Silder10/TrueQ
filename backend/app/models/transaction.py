import enum
from datetime import datetime

from app.extensions import db


class TransactionStatus(str, enum.Enum):
    EN_PROCESO = "En proceso"
    COMPLETADO = "Completado"
    CANCELADO = "Cancelado"


class Transaction(db.Model):
    """
    RF12: el intercambio REALIZADO entre dos usuarios, separado de la
    publicación (`Exchange`, que sigue siendo la oferta/anuncio). Se crea
    en el momento en que se acepta una solicitud (una sola vez por
    publicación, porque una vez aceptada no se admiten más solicitudes),
    y es la fuente de verdad para el historial: `Exchange.status` sigue
    existiendo y sigue gobernando qué se puede hacer sobre la publicación
    (aceptar, completar, cancelar), pero el historial ya no se reconstruye
    escaneando Exchange + ExchangeRequest cada vez.
    """

    __tablename__ = "transactions"

    id = db.Column(db.Integer, primary_key=True)
    status = db.Column(
        db.Enum(TransactionStatus, values_callable=lambda enum_cls: [e.value for e in enum_cls]),
        default=TransactionStatus.EN_PROCESO,
        nullable=False,
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    cancelled_at = db.Column(db.DateTime)

    exchange_id = db.Column(
        db.Integer, db.ForeignKey("exchanges.id", ondelete="CASCADE"), nullable=False
    )
    exchange_request_id = db.Column(
        db.Integer,
        db.ForeignKey("exchange_requests.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    owner_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    requester_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    exchange = db.relationship("Exchange")
    owner = db.relationship("User", foreign_keys=[owner_id])
    requester = db.relationship("User", foreign_keys=[requester_id])

    def to_dict(self, viewer_id=None):
        other_participant = None
        if viewer_id is not None:
            other_participant = self.requester if viewer_id == self.owner_id else self.owner

        return {
            "id": self.id,
            "status": self.status.value if self.status else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "cancelled_at": self.cancelled_at.isoformat() if self.cancelled_at else None,
            "exchange_id": self.exchange_id,
            "title": self.exchange.title if self.exchange else None,
            "offers": self.exchange.offers if self.exchange else None,
            "seeks": self.exchange.seeks if self.exchange else None,
            "image": self.exchange.image if self.exchange else None,
            "other_participant": other_participant.to_dict() if other_participant else None,
        }
