import os

from app import create_app
from app.extensions import socketio

app = create_app()

if __name__ == "__main__":
    # Escuchar en todas las interfaces permite abrir TrueQ desde otro
    # dispositivo de la misma red local.
    socketio.run(
        app,
        debug=app.config["DEBUG"],
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 5001)),
        allow_unsafe_werkzeug=True,
    )
