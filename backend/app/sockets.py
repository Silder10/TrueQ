from flask_login import current_user
from flask_socketio import join_room, leave_room

from app.extensions import socketio


def conversation_room(user_id_a, user_id_b):
    """Nombre de sala determinístico para una conversación entre dos usuarios,
    sin importar quién sea 'a' o 'b'."""
    low, high = sorted([int(user_id_a), int(user_id_b)])
    return f"conv:{low}:{high}"


@socketio.on("connect")
def handle_connect():
    if not current_user.is_authenticated:
        return False  # rechaza la conexión si no hay sesión válida
    return True


@socketio.on("join_conversation")
def handle_join(data):
    if not current_user.is_authenticated:
        return
    other_user_id = data.get("other_user_id")
    if other_user_id is None:
        return
    join_room(conversation_room(current_user.id, other_user_id))


@socketio.on("leave_conversation")
def handle_leave(data):
    if not current_user.is_authenticated:
        return
    other_user_id = data.get("other_user_id")
    if other_user_id is None:
        return
    leave_room(conversation_room(current_user.id, other_user_id))
