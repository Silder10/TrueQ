from flask_cors import CORS
from flask_login import LoginManager
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from flask_wtf import CSRFProtect

db = SQLAlchemy()
migrate = Migrate()
cors = CORS()
csrf = CSRFProtect()

login_manager = LoginManager()
# No hay páginas server-rendered de login: si Flask-Login redirige por falta de
# sesión, la API debe responder 401 en JSON, no intentar un redirect a una vista.
login_manager.login_view = None
