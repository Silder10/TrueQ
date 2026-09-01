"""
Antes esta lógica estaba copiada y pegada 3 veces dentro de routes.py
(al aceptar, rechazar o solicitar un intercambio). Centralizarla evita que
una futura ruta nueva la reimplemente distinto o se olvide de crearla.
"""

from app.extensions import db
from app.models import Notification


def notify(user_id: int, message: str) -> Notification:
    notification = Notification(user_id=user_id, message=message)
    db.session.add(notification)
    return notification
