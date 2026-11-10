"""
RNF04: invalidación automática de la caché.

Cada vez que se guarda (commit) un cambio en Exchange, ExchangeImage o User,
se vacía la caché. Así nadie ve datos viejos después de publicar, editar,
aprobar, rechazar o cambiar de ubicación.

Ubicación sugerida: backend/app/services/cache_invalidation.py
"""
from sqlalchemy import event
from sqlalchemy.orm import Session

from app.extensions import cache
from app.models import Exchange, ExchangeImage, User

_TRACKED = (Exchange, ExchangeImage, User)


def register_cache_invalidation():
    @event.listens_for(Session, "after_flush")
    def _mark_dirty(session, flush_context):
        for obj in list(session.new) + list(session.dirty) + list(session.deleted):
            if isinstance(obj, _TRACKED):
                session.info["invalidate_cache"] = True
                break

    @event.listens_for(Session, "after_commit")
    def _clear_cache(session):
        if session.info.pop("invalidate_cache", False):
            cache.clear()

    @event.listens_for(Session, "after_rollback")
    def _discard_mark(session):
        session.info.pop("invalidate_cache", None)