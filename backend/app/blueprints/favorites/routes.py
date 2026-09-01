from flask import Blueprint, jsonify
from flask_login import current_user, login_required

from app.extensions import db
from app.models import Exchange, Favorite

favorites_bp = Blueprint("favorites", __name__, url_prefix="/api/favorites")


@favorites_bp.get("")
@login_required
def list_favorites():
    favorites = Favorite.query.filter_by(user_id=current_user.id).all()
    return jsonify(items=[f.to_dict() for f in favorites])


@favorites_bp.post("/<int:exchange_id>")
@login_required
def toggle_favorite(exchange_id):
    Exchange.query.get_or_404(exchange_id)

    favorite = Favorite.query.filter_by(
        user_id=current_user.id, exchange_id=exchange_id
    ).first()

    if favorite:
        db.session.delete(favorite)
        db.session.commit()
        return jsonify(favorited=False)

    new_favorite = Favorite(user_id=current_user.id, exchange_id=exchange_id)
    db.session.add(new_favorite)
    db.session.commit()
    return jsonify(favorited=True)
