from functools import wraps

from flask import jsonify, request
from flask_login import current_user


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify(error="No autenticado."), 401
        if not current_user.is_admin():
            return jsonify(error="No tienes permisos para acceder."), 403
        return f(*args, **kwargs)

    return decorated


def paginated_response(query, schema_fn, page_param="page", per_page_default=20, per_page_max=100):
    """Pagina un query de SQLAlchemy y arma la respuesta JSON estándar."""
    try:
        page = int(request.args.get(page_param, 1))
    except ValueError:
        page = 1
    try:
        per_page = int(request.args.get("per_page", per_page_default))
    except ValueError:
        per_page = per_page_default
    per_page = max(1, min(per_page, per_page_max))

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify(
        items=[schema_fn(item) for item in pagination.items],
        page=pagination.page,
        per_page=pagination.per_page,
        total=pagination.total,
        pages=pagination.pages,
        has_next=pagination.has_next,
        has_prev=pagination.has_prev,
    )
