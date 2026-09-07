import enum
from datetime import datetime

from app.extensions import db


class ReportTargetType(str, enum.Enum):
    USUARIO = "usuario"
    PUBLICACION = "publicacion"


class ReportReason(str, enum.Enum):
    ACOSO = "Acoso"
    SPAM = "Spam"
    FRAUDE = "Fraude"
    PERFIL_FALSO = "Perfil falso"
    NO_CUMPLIO = "No cumplió con su parte"
    OTRO = "Otro"


class ReportStatus(str, enum.Enum):
    PENDIENTE = "Pendiente"
    REVISADO = "Revisado"


class Report(db.Model):
    __tablename__ = "reports"

    id = db.Column(db.Integer, primary_key=True)

    reporter_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    target_type = db.Column(
        db.Enum(ReportTargetType, values_callable=lambda e: [x.value for x in e]),
        nullable=False,
    )
    target_id = db.Column(db.Integer, nullable=False)

    reason = db.Column(
        db.Enum(ReportReason, values_callable=lambda e: [x.value for x in e]),
        nullable=False,
    )
    description = db.Column(db.Text)

    status = db.Column(
        db.Enum(ReportStatus, values_callable=lambda e: [x.value for x in e]),
        default=ReportStatus.PENDIENTE,
        nullable=False,
    )
    admin_action = db.Column(db.String(255))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    resolved_at = db.Column(db.DateTime)

    reporter = db.relationship("User", foreign_keys=[reporter_id])

    def to_dict(self):
        return {
            "id": self.id,
            "reporter": self.reporter.to_dict() if self.reporter else None,
            "target_type": self.target_type.value if self.target_type else None,
            "target_id": self.target_id,
            "reason": self.reason.value if self.reason else None,
            "description": self.description,
            "status": self.status.value if self.status else None,
            "admin_action": self.admin_action,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
