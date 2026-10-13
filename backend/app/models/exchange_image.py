from datetime import datetime

from app.extensions import db


class ExchangeImage(db.Model):
    """Imagen adicional de una publicación de intercambio."""

    __tablename__ = "exchange_images"
    __table_args__ = (
        db.UniqueConstraint("exchange_id", "position", name="uq_exchange_image_position"),
    )

    id = db.Column(db.Integer, primary_key=True)
    exchange_id = db.Column(
        db.Integer,
        db.ForeignKey("exchanges.id", ondelete="CASCADE"),
        nullable=False,
    )
    filename = db.Column(db.String(255), nullable=False)
    position = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "filename": self.filename,
            "position": self.position,
        }
