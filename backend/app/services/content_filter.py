"""
RF15: filtros básicos previos a publicación.

Se ejecutan ANTES de guardar la publicación. Si algo falla, la API responde 400
con un mensaje claro y no se crea nada. Lo que sí pasa los filtros queda en
estado Pendiente para la revisión manual del administrador (segunda capa).

Ubicación sugerida: backend/app/services/content_filter.py
"""
import re
import unicodedata

from app.models import Exchange, ExchangeStatus, ModerationStatus

# Listas básicas y fáciles de ampliar. Se comparan por palabra completa,
# sin tildes y en minúsculas.
OFFENSIVE_WORDS = {
    "hijueputa", "hijueputas", "gonorrea", "malparido", "malparida",
    "marica", "perra", "puta", "puto", "imbecil", "idiota", "estupido",
    "estupida", "mierda", "pendejo", "pendeja", "cabron",
}

# Contenido ilegal o no permitido en la plataforma.
ILLEGAL_WORDS = {
    "cocaina", "marihuana", "bazuco", "heroina", "extasis", "perico",
    "arma", "armas", "pistola", "pistolas", "fusil", "municion", "municiones",
    "explosivo", "explosivos", "granada", "granadas",
}

ILLEGAL_PHRASES = [
    "documentos falsos", "cedula falsa", "tarjeta clonada",
    "tarjetas clonadas", "venta de organos",
]


def normalize(text):
    """minúsculas, sin tildes, solo letras/números y espacios simples."""
    text = unicodedata.normalize("NFD", (text or "").lower())
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def check_content(*fields):
    """
    Revisa los textos de la publicación. Devuelve un mensaje de error
    (str) si encuentra algo, o None si todo está bien.
    """
    joined = normalize(" ".join(f for f in fields if f))
    words = set(joined.split())

    if words & OFFENSIVE_WORDS:
        return "La publicación contiene lenguaje ofensivo. Por favor edítala."

    if words & ILLEGAL_WORDS or any(p in joined for p in ILLEGAL_PHRASES):
        return "La publicación menciona contenido no permitido en TrueQ."

    return None


def find_duplicate(owner_id, title, offers, seeks, exclude_id=None):
    """
    Busca una publicación activa del mismo usuario con el mismo título
    u ofrezco/busco idénticos (ignorando mayúsculas, tildes y signos).
    """
    new_title = normalize(title)
    new_pair = (normalize(offers), normalize(seeks))

    query = Exchange.query.filter(
        Exchange.owner_id == owner_id,
        Exchange.moderation_status != ModerationStatus.RECHAZADO,
        Exchange.status.in_([ExchangeStatus.DISPONIBLE, ExchangeStatus.EN_PROCESO]),
    )

    if exclude_id is not None:
        query = query.filter(Exchange.id != exclude_id)

    for other in query.all():
        if normalize(other.title) == new_title:
            return other
        if (normalize(other.offers), normalize(other.seeks)) == new_pair:
            return other

    return None