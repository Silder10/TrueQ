from app.extensions import db


class Favorite(db.Model):
    __tablename__ = "favorites"
    __table_args__ = (
        db.UniqueConstraint("user_id", "exchange_id", name="uq_user_exchange_favorite"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    exchange_id = db.Column(
        db.Integer,
        db.ForeignKey("exchanges.id", ondelete="CASCADE"),
        nullable=False,
    )

    user = db.relationship("User", backref=db.backref("favorites", cascade="all, delete-orphan"))

    def to_dict(self):
        return {
            "id": self.id,
            "exchange": self.exchange.to_dict() if self.exchange else None,
        }
