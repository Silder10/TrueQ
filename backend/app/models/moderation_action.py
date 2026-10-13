from datetime import datetime

from app.extensions import db


class ModerationAction(db.Model):
    __tablename__ = "moderation_actions"

    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(
        db.Integer,
        db.ForeignKey("reports.id", ondelete="CASCADE"),
        nullable=False,
    )
    admin_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    action = db.Column(db.String(50), nullable=False)
    reason = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    report = db.relationship("Report", backref=db.backref("moderation_actions", lazy=True))
    admin = db.relationship("User", foreign_keys=[admin_id])

    def to_dict(self):
        return {
            "id": self.id,
            "report_id": self.report_id,
            "admin_id": self.admin_id,
            "action": self.action,
            "reason": self.reason,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
