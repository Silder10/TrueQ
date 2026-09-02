from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from app.extensions import db
from app.models import Exchange, ExchangeRequest, RequestStatus, Review, User

reviews_bp = Blueprint("reviews", __name__, url_prefix="/api")


def _other_participant(exchange, reviewer_id):
    """
    Solo puede dejar reseña quien participó realmente del intercambio:
    el dueño, o alguien con una solicitud aceptada sobre ese exchange.
    """
    if exchange.owner_id == reviewer_id:
        accepted = ExchangeRequest.query.filter_by(
            exchange_id=exchange.id, status=RequestStatus.ACEPTADA
        ).first()
        return accepted.requester_id if accepted else None

    accepted = ExchangeRequest.query.filter_by(
        exchange_id=exchange.id,
        requester_id=reviewer_id,
        status=RequestStatus.ACEPTADA,
    ).first()
    return exchange.owner_id if accepted else None


@reviews_bp.post("/exchanges/<int:exchange_id>/reviews")
@login_required
def create_review(exchange_id):
    exchange = Exchange.query.get_or_404(exchange_id)

    reviewee_id = _other_participant(exchange, current_user.id)
    if reviewee_id is None:
        return jsonify(error="Solo puedes calificar intercambios en los que participaste y fueron aceptados."), 403

    data = request.get_json(silent=True) or {}
    rating = data.get("rating")
    comment = (data.get("comment") or "").strip() or None

    if not isinstance(rating, int) or not (1 <= rating <= 5):
        return jsonify(error="La calificación debe ser un número entero entre 1 y 5."), 400

    existing = Review.query.filter_by(exchange_id=exchange.id, reviewer_id=current_user.id).first()
    if existing:
        return jsonify(error="Ya calificaste este intercambio."), 409

    review = Review(
        exchange_id=exchange.id,
        reviewer_id=current_user.id,
        reviewee_id=reviewee_id,
        rating=rating,
        comment=comment,
    )
    db.session.add(review)
    db.session.commit()

    return jsonify(review=review.to_dict()), 201


@reviews_bp.get("/users/<int:user_id>/reviews")
@login_required
def list_user_reviews(user_id):
    user = User.query.get_or_404(user_id)
    reviews = (
        Review.query.filter_by(reviewee_id=user.id)
        .order_by(Review.created_at.desc())
        .all()
    )
    return jsonify(
        items=[r.to_dict() for r in reviews],
        average_rating=user.average_rating,
        reviews_count=user.reviews_count,
    )
