from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from app.extensions import db
from app.models import Exchange, ExchangeCategory, ExchangeRequest, RequestStatus
from app.services.notifications import notify
from app.services.uploads import InvalidImageError, save_image
from app.utils import paginated_response

exchanges_bp = Blueprint("exchanges", __name__, url_prefix="/api/exchanges")


@exchanges_bp.get("")
@login_required
def list_exchanges():
    search = request.args.get("search", "").strip()
    category = request.args.get("category", "").strip()
    owner_id = request.args.get("owner_id", "").strip()

    query = Exchange.query

    if search:
        query = query.filter(Exchange.title.ilike(f"%{search}%"))
    if category:
        try:
            category_enum = ExchangeCategory(category)
            query = query.filter_by(category=category_enum)
        except ValueError:
            return jsonify(error="Categoría inválida."), 400
    if owner_id:
        if not owner_id.isdigit():
            return jsonify(error="owner_id inválido."), 400
        query = query.filter_by(owner_id=int(owner_id))

    query = query.order_by(Exchange.created_at.desc())

    return paginated_response(query, lambda e: e.to_dict())


@exchanges_bp.post("")
@login_required
def create_exchange():
    title = (request.form.get("title") or "").strip()
    offers = (request.form.get("offers") or "").strip()
    seeks = (request.form.get("seeks") or "").strip()
    description = (request.form.get("description") or "").strip()
    category_raw = (request.form.get("category") or "").strip()

    errors = {}
    if not title:
        errors["title"] = "El título es obligatorio."
    if not offers:
        errors["offers"] = "Contá qué ofreces."
    if not seeks:
        errors["seeks"] = "Contá qué buscas a cambio."

    category_enum = None
    if not category_raw:
        errors["category"] = "Elegí un tipo de intercambio."
    else:
        try:
            category_enum = ExchangeCategory(category_raw)
        except ValueError:
            errors["category"] = "Tipo de intercambio inválido."

    if errors:
        return jsonify(error="Datos inválidos.", fields=errors), 400

    filename = "exchange.png"
    image = request.files.get("image")
    if image and image.filename != "":
        try:
            filename = save_image(image, default="exchange.png")
        except InvalidImageError as exc:
            return jsonify(error=str(exc)), 400

    exchange = Exchange(
        title=title,
        offers=offers,
        seeks=seeks,
        description=description or None,
        category=category_enum,
        image=filename,
        owner_id=current_user.id,
    )
    db.session.add(exchange)
    db.session.commit()

    return jsonify(exchange=exchange.to_dict()), 201


@exchanges_bp.get("/<int:exchange_id>")
@login_required
def get_exchange(exchange_id):
    exchange = Exchange.query.get_or_404(exchange_id)
    return jsonify(exchange=exchange.to_dict())


@exchanges_bp.post("/<int:exchange_id>/request")
@login_required
def request_exchange(exchange_id):
    exchange = Exchange.query.get_or_404(exchange_id)

    if exchange.owner_id == current_user.id:
        return jsonify(error="No puedes solicitar tu propio intercambio."), 400

    existing = ExchangeRequest.query.filter_by(
        exchange_id=exchange.id, requester_id=current_user.id
    ).first()
    if existing:
        return jsonify(error="Ya solicitaste este intercambio."), 409

    exchange_request = ExchangeRequest(exchange_id=exchange.id, requester_id=current_user.id)
    db.session.add(exchange_request)

    notify(exchange.owner_id, f'{current_user.username} solicitó tu intercambio "{exchange.title}".')

    db.session.commit()

    return jsonify(request=exchange_request.to_dict()), 201


@exchanges_bp.get("/requests")
@login_required
def my_requests():
    """Solicitudes recibidas sobre los exchanges del usuario logueado."""
    query = (
        ExchangeRequest.query.join(Exchange)
        .filter(Exchange.owner_id == current_user.id)
        .order_by(ExchangeRequest.created_at.desc())
    )
    return paginated_response(query, lambda r: r.to_dict())


def _resolve_request(request_id, new_status, success_message):
    exchange_request = ExchangeRequest.query.get_or_404(request_id)

    if exchange_request.exchange.owner_id != current_user.id:
        return jsonify(error="Acceso no autorizado."), 403

    exchange_request.status = new_status
    notify(
        exchange_request.requester_id,
        f'Tu solicitud para "{exchange_request.exchange.title}" fue {success_message}.',
    )
    db.session.commit()

    return jsonify(request=exchange_request.to_dict())


@exchanges_bp.post("/requests/<int:request_id>/accept")
@login_required
def accept_request(request_id):
    return _resolve_request(request_id, RequestStatus.ACEPTADA, "aceptada")


@exchanges_bp.post("/requests/<int:request_id>/reject")
@login_required
def reject_request(request_id):
    return _resolve_request(request_id, RequestStatus.RECHAZADA, "rechazada")
