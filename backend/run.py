import os

from app import create_app
from app.extensions import socketio

app = create_app()

if __name__ == "__main__":
    # El flag de debug ahora se controla por entorno, nunca hardcodeado en True.
    # socketio.run (en vez de app.run) es necesario para que el chat en
    # tiempo real (WebSockets) funcione — reemplaza al servidor de
    # desarrollo normal por uno que también entiende esas conexiones.
    socketio.run(app, debug=app.config["DEBUG"], port=int(os.getenv("PORT", 5001)), allow_unsafe_werkzeug=True)
