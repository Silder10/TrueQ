import os

from flask import Blueprint, current_app, jsonify, request
from flask_login import current_user, login_required

from app.extensions import db
from app.models import Exchange, ExchangeCategory, ExchangeRequest, ExchangeStatus, ModerationStatus, RequestStatus
from app.services.geolocation import distance_km
from app.services.notifications import notify
from app.services.uploads import InvalidImageError, save_image
from app.utils import paginated_response

exchanges_bp = Blueprint("exchanges", __name__, url_prefix="/api/exchanges")

# RF07: radio de búsqueda configurable, con límites razonables para no
# dejar pasar un radio absurdo (ej. 0 km o 5000 km) por query string.
DEFAULT_SEARCH_RADIUS_KM = 10
MIN_SEARCH_RADIUS_KM = 1
MAX_SEARCH_RADIUS_KM = 200


def _exchange_with_distance(exchange):
    data = exchange.to_dict()
    if current_user.is_authenticated and exchange.owner:
        data["distance_km"] = distance_km(
            current_user.latitude, current_user.longitude,
            exchange.owner.latitude, exchange.owner.longitude,
        )
    return data


@exchanges_bp.get("")
@login_required
def list_exchanges():
    search = request.args.get("search", "").strip()
    category = request.args.get("category", "").strip()
    owner_id = request.args.get("owner_id", "").strip()
    nearby = request.args.get("nearby", "").strip() == "true"

    radius_km = DEFAULT_SEARCH_RADIUS_KM
    if nearby:
        radius_raw = request.args.get("radius_km", "").strip()
        if radius_raw:
            try:
                radius_km = float(radius_raw)
            except ValueError:
                return jsonify(error="radius_km inválido."), 400
        if not (MIN_SEARCH_RADIUS_KM <= radius_km <= MAX_SEARCH_RADIUS_KM):
            return jsonify(
                error=f"El radio debe estar entre {MIN_SEARCH_RADIUS_KM} y {MAX_SEARCH_RADIUS_KM} km."
            ), 400
        if current_user.latitude is None or current_user.longitude is None:
            return jsonify(error="Necesitás activar tu ubicación para buscar cerca de ti."), 400

    query = Exchange.query

    # RF15: solo se listan publicaciones aprobadas por un admin, salvo que
    # el usuario esté mirando su propio perfil (ahí ve también lo pendiente/
    # rechazado, para que sepa el estado de lo suyo) o sea admin.
    if owner_id and owner_id.isdigit() and int(owner_id) == current_user.id:
        pass  # el dueño ve todas sus publicaciones, en cualquier estado
    elif current_user.is_admin():
        pass  # el admin también puede filtrar/ver todo desde este listado
    else:
        query = query.filter_by(moderation_status=ModerationStatus.APROBADO)

    # RF08: búsqueda combinada — título/descripción, categoría y (más abajo)
    # distancia se aplican todos juntos sobre el mismo query, no por separado.
    if search:
        query = query.filter(
            db.or_(Exchange.title.ilike(f"%{search}%"), Exchange.description.ilike(f"%{search}%"))
        )
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

    if nearby:
        # "Cerca de mí" no se puede filtrar/ordenar en SQL sin extensiones
        # geoespaciales, así que se resuelve en memoria tras aplicar los
        # demás filtros. Aceptable para el volumen de datos de este
        # proyecto; si crece mucho, se movería a una columna geoespacial
        # indexada (PostGIS/MySQL ST_Distance).
        all_items = query.all()
        with_distance = [(_exchange_with_distance(e), e) for e in all_items]

        # RF08: el radio ahora filtra de verdad (antes solo ordenaba y
        # devolvía todos los resultados sin importar qué tan lejos estaban).
        within_radius = [
            pair for pair in with_distance
            if pair[0]["distance_km"] is not None and pair[0]["distance_km"] <= radius_km
        ]
        within_radius.sort(key=lambda pair: pair[0]["distance_km"])

        items = [d for d, _ in within_radius]
        return jsonify(
            items=items, total=len(items), page=1, pages=1, has_next=False, has_prev=False,
            radius_km=radius_km,
        )

    return paginated_response(query, _exchange_with_distance)


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

    is_owner = exchange.owner_id == current_user.id
    if exchange.moderation_status != ModerationStatus.APROBADO and not is_owner and not current_user.is_admin():
        return jsonify(error="Esta publicación todavía no está disponible."), 404

    return jsonify(exchange=_exchange_with_distance(exchange))


@exchanges_bp.put("/<int:exchange_id>")
@login_required
def update_exchange(exchange_id):
    exchange = Exchange.query.get_or_404(exchange_id)

    if exchange.owner_id != current_user.id:
        return jsonify(error="Solo el dueño puede editar esta publicación."), 403

    title = request.form.get("title")
    offers = request.form.get("offers")
    seeks = request.form.get("seeks")
    description = request.form.get("description")
    category_raw = request.form.get("category")

    if title is not None:
        title = title.strip()
        if not title:
            return jsonify(error="Datos inválidos.", fields={"title": "El título no puede quedar vacío."}), 400
        exchange.title = title

    if offers is not None:
        offers = offers.strip()
        if not offers:
            return jsonify(error="Datos inválidos.", fields={"offers": "Contá qué ofreces."}), 400
        exchange.offers = offers

    if seeks is not None:
        seeks = seeks.strip()
        if not seeks:
            return jsonify(error="Datos inválidos.", fields={"seeks": "Contá qué buscas."}), 400
        exchange.seeks = seeks

    if description is not None:
        exchange.description = description.strip() or None

    if category_raw:
        try:
            exchange.category = ExchangeCategory(category_raw.strip())
        except ValueError:
            return jsonify(error="Datos inválidos.", fields={"category": "Tipo de intercambio inválido."}), 400

    image = request.files.get("image")
    if image and image.filename != "":
        try:
            exchange.image = save_image(image, old_filename=exchange.image, default="exchange.png")
        except InvalidImageError as exc:
            return jsonify(error=str(exc)), 400

    # Editar una publicación la vuelve a mandar a revisión: RF15 pide que un
    # admin apruebe el contenido antes de que sea visible para otros.
    exchange.moderation_status = ModerationStatus.PENDIENTE
    db.session.commit()

    return jsonify(exchange=exchange.to_dict())


@exchanges_bp.delete("/<int:exchange_id>")
@login_required
def delete_exchange(exchange_id):
    exchange = Exchange.query.get_or_404(exchange_id)

    if exchange.owner_id != current_user.id:
        return jsonify(error="Solo el dueño puede eliminar esta publicación."), 403

    if exchange.image != "exchange.png":
        image_path = os.path.join(current_app.config["UPLOAD_FOLDER"], exchange.image)
        if os.path.exists(image_path):
            os.remove(image_path)

    db.session.delete(exchange)
    db.session.commit()

    return jsonify(message="Publicación eliminada.")


@exchanges_bp.post("/<int:exchange_id>/request")
@login_required
def request_exchange(exchange_id):
    exchange = Exchange.query.get_or_404(exchange_id)

    if exchange.owner_id == current_user.id:
        return jsonify(error="No puedes solicitar tu propio intercambio."), 400

    if exchange.status != ExchangeStatus.DISPONIBLE:
        return jsonify(error="Este intercambio ya no está disponible."), 409

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

    if exchange_request.status != RequestStatus.PENDIENTE:
        return jsonify(error="Esta solicitud ya fue resuelta."), 409

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
    """
    RF12: aceptar una solicitud mueve el intercambio a "En proceso" y
    cierra automáticamente las demás solicitudes pendientes sobre esa
    misma publicación (no tiene sentido dejarlas abiertas si el trueque
    ya tiene contraparte).
    """
    exchange_request = ExchangeRequest.query.get_or_404(request_id)
    exchange = exchange_request.exchange

    if exchange.owner_id != current_user.id:
        return jsonify(error="Acceso no autorizado."), 403

    if exchange_request.status != RequestStatus.PENDIENTE:
        return jsonify(error="Esta solicitud ya fue resuelta."), 409

    if exchange.status != ExchangeStatus.DISPONIBLE:
        return jsonify(error="Este intercambio ya no está disponible para aceptar solicitudes."), 409

    exchange_request.status = RequestStatus.ACEPTADA
    exchange.status = ExchangeStatus.EN_PROCESO

    other_pending = ExchangeRequest.query.filter(
        ExchangeRequest.exchange_id == exchange.id,
        ExchangeRequest.id != exchange_request.id,
        ExchangeRequest.status == RequestStatus.PENDIENTE,
    ).all()
    for other in other_pending:
        other.status = RequestStatus.RECHAZADA
        notify(other.requester_id, f'Tu solicitud para "{exchange.title}" fue rechazada.')

    notify(exchange_request.requester_id, f'Tu solicitud para "{exchange.title}" fue aceptada.')

    db.session.commit()

    return jsonify(request=exchange_request.to_dict())


@exchanges_bp.post("/requests/<int:request_id>/reject")
@login_required
def reject_request(request_id):
    return _resolve_request(request_id, RequestStatus.RECHAZADA, "rechazada")


@exchanges_bp.post("/<int:exchange_id>/complete")
@login_required
def complete_exchange(exchange_id):
    exchange = Exchange.query.get_or_404(exchange_id)

    if exchange.owner_id != current_user.id:
        return jsonify(error="Solo el dueño puede marcar el intercambio como completado."), 403

    if exchange.status != ExchangeStatus.EN_PROCESO:
        return jsonify(error="Solo se puede completar un intercambio que está en proceso."), 409

    exchange.status = ExchangeStatus.COMPLETADO
    db.session.commit()

    return jsonify(exchange=exchange.to_dict())


@exchanges_bp.post("/<int:exchange_id>/cancel")
@login_required
def cancel_exchange(exchange_id):
    """
    RF12: el dueño o la persona con la solicitud aceptada pueden cancelar
    el intercambio, solo mientras está "En proceso" (antes de aceptar una
    solicitud no hay contraparte comprometida que cancelar; después de
    "Completado" ya no aplica).
    """
    exchange = Exchange.query.get_or_404(exchange_id)

    accepted_request = ExchangeRequest.query.filter_by(
        exchange_id=exchange.id, status=RequestStatus.ACEPTADA
    ).first()

    is_owner = exchange.owner_id == current_user.id
    is_accepted_requester = bool(accepted_request) and accepted_request.requester_id == current_user.id

    if not (is_owner or is_accepted_requester):
        return jsonify(error="Acceso no autorizado."), 403

    if exchange.status != ExchangeStatus.EN_PROCESO:
        return jsonify(error="Solo se puede cancelar un intercambio que está en proceso."), 409

    exchange.status = ExchangeStatus.CANCELADO

    other_party_id = accepted_request.requester_id if is_owner else exchange.owner_id
    notify(other_party_id, f'El intercambio "{exchange.title}" fue cancelado.')

    db.session.commit()

    return jsonify(exchange=exchange.to_dict())


@exchanges_bp.get("/history")
@login_required
def history():
    """
    RF12: historial de intercambios. Solo muestra trueques COMPLETADOS
    (no aparecen los pendientes, en proceso, ni cancelados) donde el
    usuario actual participó, ya sea como dueño de la publicación o como
    solicitante con una solicitud aceptada.
    """
    owned_completed = Exchange.query.filter_by(
        owner_id=current_user.id, status=ExchangeStatus.COMPLETADO
    ).all()

    participated_ids = (
        db.session.query(ExchangeRequest.exchange_id)
        .filter_by(requester_id=current_user.id, status=RequestStatus.ACEPTADA)
        .subquery()
    )
    participated_completed = Exchange.query.filter(
        Exchange.id.in_(participated_ids), Exchange.status == ExchangeStatus.COMPLETADO
    ).all()

    all_exchanges = {e.id: e for e in owned_completed + participated_completed}.values()

    items = []
    for exchange in all_exchanges:
        accepted_request = ExchangeRequest.query.filter_by(
            exchange_id=exchange.id, status=RequestStatus.ACEPTADA
        ).first()
        other_participant = None
        if exchange.owner_id == current_user.id and accepted_request:
            other_participant = accepted_request.requester
        elif accepted_request:
            other_participant = exchange.owner

        items.append({
            "exchange_id": exchange.id,
            "title": exchange.title,
            "offers": exchange.offers,
            "seeks": exchange.seeks,
            "image": exchange.image,
            "status": exchange.status.value,
            "created_at": exchange.created_at.isoformat() if exchange.created_at else None,
            "other_participant": other_participant.to_dict() if other_participant else None,
        })

    items.sort(key=lambda i: i["created_at"] or "", reverse=True)

    return jsonify(items=items)
