"""
Distancia real entre dos coordenadas usando la fórmula de Haversine.
No dependemos de ningún servicio externo para esto: es geometría pura,
suficientemente precisa para mostrar "a X km de ti" en la interfaz.
"""

from math import atan2, cos, radians, sin, sqrt

EARTH_RADIUS_KM = 6371


def distance_km(lat1, lon1, lat2, lon2):
    if None in (lat1, lon1, lat2, lon2):
        return None

    phi1, phi2 = radians(lat1), radians(lat2)
    d_phi = radians(lat2 - lat1)
    d_lambda = radians(lon2 - lon1)

    a = sin(d_phi / 2) ** 2 + cos(phi1) * cos(phi2) * sin(d_lambda / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return round(EARTH_RADIUS_KM * c, 1)


def valid_coordinates(lat, lon):
    """
    RF07: valida que lat/lon sean números dentro del rango geográfico
    real. Se usa tanto en registro como en edición de perfil, para no
    guardar coordenadas basura (ej. lat=200) que romperían Haversine.
    """
    if lat is None or lon is None:
        return False
    try:
        lat, lon = float(lat), float(lon)
    except (TypeError, ValueError):
        return False
    return -90 <= lat <= 90 and -180 <= lon <= 180
