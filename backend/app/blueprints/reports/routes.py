from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from app.extensions import db
from app.models import (
    Block,
    Exchange,
    ModerationStatus,
    Report,
    ReportReason,
    ReportStatus,
    ReportTargetType,
    User,
)
from app.utils import admin_required, paginated_response

reports_bp = Blueprint("reports", __name__, url_prefix="/api")


@reports_bp.post("/reports")
@login_required
def create_report():
    data = request.get_json(silent=True) or {}

    target_type_raw = (data.get("target_type") or "").strip()
    target_id = data.get("target_id")
    reason_raw = (data.get("reason") or "").strip()
    description = (data.get("description") or "").strip() or None

    errors = {}
    try:
        target_type = ReportTargetType(target_type_raw)
    except ValueError:
        errors["target_type"] = "Debe ser 'usuario' o 'publicacion'."
        target_type = None

    try:
        reason = ReportReason(reason_raw)
    except ValueError:
        errors["reason"] = "Motivo de reporte inválido."
        reason = None

    if reason == ReportReason.OTRO and not description:
        errors["description"] = "Contanos el motivo si elegís 'Otro'."

    if not isinstance(target_id, int):
        errors["target_id"] = "target_id inválido."

    if errors:
        return jsonify(error="Datos inválidos.", fields=errors), 400

    # Confirmar que el objetivo existe.
    if target_type == ReportTargetType.USUARIO:
        if not User.query.get(target_id):
            return jsonify(error="El usuario reportado no existe."), 404
        if target_id == current_user.id:
            return jsonify(error="No podés reportarte a ti mismo."), 400
    else:
        if not Exchange.query.get(target_id):
            return jsonify(error="La publicación reportada no existe."), 404

    report = Report(
        reporter_id=current_user.id,
        target_type=target_type,
        target_id=target_id,
        reason=reason,
        description=description,
    )
    db.session.add(report)
    db.session.commit()

    return jsonify(report=report.to_dict()), 201


@reports_bp.post("/users/<int:user_id>/block")
@login_required
def block_user(user_id):
    if user_id == current_user.id:
        return jsonify(error="No podés bloquearte a ti mismo."), 400

    target = User.query.get_or_404(user_id)

    existing = Block.query.filter_by(blocker_id=current_user.id, blocked_id=target.id).first()
    if existing:
        return jsonify(message="Ya tenías bloqueado a este usuario."), 200

    db.session.add(Block(blocker_id=current_user.id, blocked_id=target.id))
    db.session.commit()
    return jsonify(message="Usuario bloqueado."), 201


@reports_bp.delete("/users/<int:user_id>/block")
@login_required
def unblock_user(user_id):
    block = Block.query.filter_by(blocker_id=current_user.id, blocked_id=user_id).first()
    if block:
        db.session.delete(block)
        db.session.commit()
    return jsonify(message="Usuario desbloqueado.")


@reports_bp.get("/users/blocked")
@login_required
def list_blocked():
    blocks = Block.query.filter_by(blocker_id=current_user.id).all()
    users = [User.query.get(b.blocked_id) for b in blocks]
    return jsonify(items=[u.to_dict() for u in users if u])


# --- Administración (RF05) ---

@reports_bp.get("/admin/reports")
@login_required
@admin_required
def list_reports():
    status_filter = request.args.get("status", "").strip()
    query = Report.query
    if status_filter:
        try:
            query = query.filter_by(status=ReportStatus(status_filter))
        except ValueError:
            return jsonify(error="Estado inválido."), 400
    query = query.order_by(Report.created_at.desc())
    return paginated_response(query, lambda r: r.to_dict())


@reports_bp.post("/admin/reports/<int:report_id>/resolve")
@login_required
@admin_required
def resolve_report(report_id):
    """
    Acciones posibles: 'advertencia', 'suspender', 'desestimar'.

    Sobre un USUARIO: 'suspender' bloquea su login (is_suspended=True) hasta
    que otro admin lo reactive.

    Sobre una PUBLICACIÓN: 'suspender' la retira del listado público
    (moderation_status -> Rechazado), igual que un rechazo de moderación
    normal. Antes esto no hacía nada — el reporte se marcaba resuelto pero
    la publicación seguía visible, que era justo el bug reportado.
    """
    report = Report.query.get_or_404(report_id)
    data = request.get_json(silent=True) or {}
    action = (data.get("action") or "").strip()

    if action not in {"advertencia", "suspender", "desestimar"}:
        return jsonify(error="Acción inválida."), 400

    if action == "suspender":
        if report.target_type.value == "usuario":
            target_user = User.query.get(report.target_id)
            if target_user:
                target_user.is_suspended = True
        else:  # publicacion
            target_exchange = Exchange.query.get(report.target_id)
            if target_exchange:
                target_exchange.moderation_status = ModerationStatus.RECHAZADO
                target_exchange.moderation_note = "Retirada tras un reporte de la comunidad."

    report.status = ReportStatus.REVISADO
    report.admin_action = action
    report.resolved_at = datetime.utcnow()
    db.session.commit()

    return jsonify(report=report.to_dict())


@reports_bp.post("/admin/users/<int:user_id>/unsuspend")
@login_required
@admin_required
def unsuspend_user(user_id):
    user = User.query.get_or_404(user_id)
    user.is_suspended = False
    db.session.commit()
    return jsonify(user=user.to_dict(include_email=True))
