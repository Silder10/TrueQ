import enum
from datetime import datetime

from app.extensions import db


class ExchangeStatus(str, enum.Enum):
    DISPONIBLE = "Disponible"
    EN_PROCESO = "En proceso"
    COMPLETADO = "Completado"
    CANCELADO = "Cancelado"


class Exchange(db.Model):
    __tablename__ = "exchanges"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(80), nullable=False)
    image = db.Column(db.String(255), default="exchange.png")
    status = db.Column(
        db.Enum(ExchangeStatus),
        default=ExchangeStatus.DISPONIBLE,
        nullable=False,
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    owner_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    requests = db.relationship(
        "ExchangeRequest",
        backref="exchange",
        lazy=True,
        cascade="all, delete-orphan",
    )
    favorited_by = db.relationship(
        "Favorite",
        backref="exchange",
        lazy=True,
        cascade="all, delete-orphan",
    )

    def to_dict(self, include_owner=True):
        data = {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "category": self.category,
            "image": self.image,
            "status": self.status.value if self.status else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "owner_id": self.owner_id,
        }
        if include_owner and self.owner:
            data["owner"] = self.owner.to_dict()
        return data
