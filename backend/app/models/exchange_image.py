from datetime import datetime

from app.extensions import db


class ExchangeImage(db.Model):
    """
    RF04: una publicación puede tener varias fotos, no solo la de
    portada (Exchange.image). `position` define el orden en la galería.
    """

    __tablename__ = "exchange_images"

    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    position = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    exchange_id = db.Column(
        db.Integer,
        db.ForeignKey("exchanges.id", ondelete="CASCADE"),
        nullable=False,
    )

    def to_dict(self):
        return {
            "id": self.id,
            "filename": self.filename,
            "position": self.position,
        }
