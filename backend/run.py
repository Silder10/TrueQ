import os

from app import create_app

app = create_app()

if __name__ == "__main__":
    # El flag de debug ahora se controla por entorno, nunca hardcodeado en True.
    app.run(debug=app.config["DEBUG"], port=int(os.getenv("PORT", 5000)))
