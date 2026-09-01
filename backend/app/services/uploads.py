import os
import uuid

from flask import current_app
from PIL import Image
from werkzeug.utils import secure_filename


class InvalidImageError(Exception):
    pass


def allowed_extension(filename: str) -> bool:
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in current_app.config["ALLOWED_EXTENSIONS"]
    )


def save_image(file_storage, old_filename: str | None = None, default: str = "default.png") -> str:
    """
    Valida que el archivo sea realmente una imagen (no solo que tenga
    extensión de imagen), la guarda con nombre único y borra la anterior
    si corresponde. Lanza InvalidImageError si el archivo no es válido.
    """
    if not file_storage or file_storage.filename == "":
        raise InvalidImageError("No se proporcionó ningún archivo.")

    if not allowed_extension(file_storage.filename):
        raise InvalidImageError("Formato de imagen no permitido.")

    try:
        image = Image.open(file_storage.stream)
        image.verify()
        file_storage.stream.seek(0)
    except Exception as exc:  # noqa: BLE001 - cualquier fallo de Pillow = inválido
        raise InvalidImageError("El archivo no es una imagen válida.") from exc

    upload_folder = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(upload_folder, exist_ok=True)

    unique_name = f"{uuid.uuid4()}_{secure_filename(file_storage.filename)}"
    file_storage.save(os.path.join(upload_folder, unique_name))

    if old_filename and old_filename != default:
        old_path = os.path.join(upload_folder, old_filename)
        if os.path.exists(old_path):
            os.remove(old_path)

    return unique_name
