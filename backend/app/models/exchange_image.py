from datetime import datetime

from app.extensions import db


class ExchangeImage(db.Model):
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
    image_url = db.Column(db.String(255), nullable=False)
    position = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "exchange_id": self.exchange_id,
            "image_url": self.image_url,
            "position": self.position,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
