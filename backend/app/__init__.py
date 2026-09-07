import os

from flask import Flask, jsonify

from app.config import CONFIG_BY_NAME
from app.extensions import cors, csrf, db, login_manager, migrate, socketio


def create_app(config_name=None):
    config_name = config_name or os.getenv("FLASK_ENV", "development")

    app = Flask(__name__)
    app.config.from_object(CONFIG_BY_NAME[config_name])

    _register_extensions(app)
    _register_blueprints(app)
    _register_error_handlers(app)

    return app


def _register_extensions(app):
    db.init_app(app)
    login_manager.init_app(app)
    migrate.init_app(app, db)
    csrf.init_app(app)

    # Se importan aquí (y no arriba, a nivel de módulo) para evitar un
    # import circular: los modelos importan `db` desde app.extensions,
    # así que deben cargarse después de que db.init_app ya corrió.
    from app import models  # noqa: F401

    cors.init_app(
        app,
        supports_credentials=True,
        origins=app.config["CORS_ORIGINS"],
    )

    # async_mode="threading": no requiere eventlet/gevent, funciona con el
    # servidor de desarrollo de Werkzeug. Es "tiempo real" real (los mensajes
    # llegan sin recargar la página), aunque con eventlet/gevent en
    # producción el transporte por websocket puro sería más eficiente.
    socketio.init_app(
        app,
        cors_allowed_origins=app.config["CORS_ORIGINS"],
        async_mode="threading",
        manage_session=False,  # usamos la sesión de Flask-Login, no la propia de socketio
    )

    from app import sockets  # noqa: F401  (registra los handlers de eventos)

    # La API es JSON puro: si Flask-Login detecta que faltan credenciales
    # no debe intentar redirigir a una vista de login que no existe aquí.
    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify(error="No autenticado."), 401


def _register_blueprints(app):
    from app.blueprints.admin import admin_bp
    from app.blueprints.auth import auth_bp
    from app.blueprints.chat import chat_bp
    from app.blueprints.exchanges import exchanges_bp
    from app.blueprints.favorites import favorites_bp
    from app.blueprints.notifications import notifications_bp
    from app.blueprints.reports import reports_bp
    from app.blueprints.reviews import reviews_bp
    from app.blueprints.users import users_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(exchanges_bp)
    app.register_blueprint(favorites_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(reviews_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(admin_bp)


def _register_error_handlers(app):
    @app.errorhandler(404)
    def not_found(_error):
        return jsonify(error="Recurso no encontrado."), 404

    @app.errorhandler(403)
    def forbidden(_error):
        return jsonify(error="No tienes permisos para esta acción."), 403

    @app.errorhandler(400)
    def bad_request(_error):
        return jsonify(error="Solicitud inválida."), 400

    @app.errorhandler(413)
    def too_large(_error):
        return jsonify(error="El archivo supera el tamaño máximo permitido (5 MB)."), 413

    @app.errorhandler(500)
    def server_error(_error):
        return jsonify(error="Error interno del servidor."), 500
