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
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default="user", nullable=False)
    avatar = db.Column(db.String(255), default="default.png")
    bio = db.Column(db.Text)
    is_private = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Ubicación por ciudad (no GPS/distancia real, ver nota de alcance).
    city = db.Column(db.String(120))

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
            "city": self.city,
            "interests": self.interests or [],
            "average_rating": self.average_rating,
            "reviews_count": self.reviews_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_email:
            data["email"] = self.email
        return data
