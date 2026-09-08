from datetime import datetime

from flask_login import UserMixin
from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db, login_manager


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True)
    phone = db.Column(db.String(20), unique=True, nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default="user", nullable=False)
    avatar = db.Column(db.String(255), default="default.png")
    bio = db.Column(db.Text)
    is_private = db.Column(db.Boolean, default=False, nullable=False)
    is_suspended = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # RF03: recuperación de contraseña. Guardamos el HASH del token, nunca
    # el token en claro (igual criterio que la contraseña), con expiración.
    reset_token_hash = db.Column(db.String(255))
    reset_token_expires = db.Column(db.DateTime)

    # Ubicación por ciudad + coordenadas reales (capturadas con
    # navigator.geolocation en el navegador). city queda como nombre legible;
    # lat/lng habilitan el cálculo de distancia real entre usuarios.
    city = db.Column(db.String(120))
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)

    # Intereses elegidos en el registro por pasos: lista de categorías
    # (Materiales/Bienes/Servicios), guardada como JSON.
    interests = db.Column(db.JSON, default=list)

    exchanges = db.relationship(
        "Exchange",
        backref="owner",
        lazy=True,
        cascade="all, delete-orphan",
    )

    # --- Estos tres métodos vivían FUERA de la clase en el proyecto original,
    # --- lo que hacía que set_password/check_password/is_admin no existieran
    # --- como métodos de instancia. Ese era el bug #1 que impedía registrar
    # --- o loguear usuarios.
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def is_admin(self):
        return self.role == "admin"

    def set_reset_token(self, raw_token, expires_at):
        self.reset_token_hash = generate_password_hash(raw_token)
        self.reset_token_expires = expires_at

    def check_reset_token(self, raw_token):
        if not self.reset_token_hash or not self.reset_token_expires:
            return False
        if datetime.utcnow() > self.reset_token_expires:
            return False
        return check_password_hash(self.reset_token_hash, raw_token)

    def clear_reset_token(self):
        self.reset_token_hash = None
        self.reset_token_expires = None

    @property
    def average_rating(self):
        reviews = self.reviews_received
        if not reviews:
            return None
        return round(sum(r.rating for r in reviews) / len(reviews), 1)

    @property
    def reviews_count(self):
        return len(self.reviews_received)

    def to_dict(self, include_email=False):
        data = {
            "id": self.id,
            "username": self.username,
            "avatar": self.avatar,
            "bio": self.bio,
            "role": self.role,
            "is_private": self.is_private,
            "is_suspended": self.is_suspended,
            "city": self.city,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "interests": self.interests or [],
            "average_rating": self.average_rating,
            "reviews_count": self.reviews_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_email:
            data["email"] = self.email
            data["phone"] = self.phone
        return data
