from datetime import datetime

from app.extensions import db


class Review(db.Model):
    __tablename__ = "reviews"
    __table_args__ = (
        db.UniqueConstraint(
            "exchange_id", "reviewer_id", name="uq_review_once_per_exchange"
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    exchange_id = db.Column(
        db.Integer,
        db.ForeignKey("exchanges.id", ondelete="CASCADE"),
        nullable=False,
    )
    transaction_id = db.Column(
        db.Integer,
        db.ForeignKey("transactions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    reviewer_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    reviewee_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    transaction = db.relationship("Transaction")
    reviewer = db.relationship("User", foreign_keys=[reviewer_id])
    reviewee = db.relationship(
        "User",
        foreign_keys=[reviewee_id],
        backref=db.backref("reviews_received", cascade="all, delete-orphan"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "rating": self.rating,
            "comment": self.comment,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "reviewer": self.reviewer.to_dict() if self.reviewer else None,
            "exchange_id": self.exchange_id,
            "transaction_id": self.transaction_id,
        }
