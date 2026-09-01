import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

const CATEGORIES = ["Hogar", "Deportes", "Música", "Libros", "Ropa", "Tecnología"];

export function CreateExchangePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", description: "", category: CATEGORIES[0] });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    setImage(file || null);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);

    const formData = new FormData();
    formData.append("title", form.title);
    formData.append("description", form.description);
    formData.append("category", form.category);
    if (image) formData.append("image", image);

    try {
      const data = await api.postForm("/api/exchanges", formData);
      navigate(`/exchanges/${data.exchange.id}`);
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.fields || {});
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="stack" style={{ maxWidth: 560 }}>
      <div>
        <h1>Publicar algo para intercambiar</h1>
        <p>Cuéntale a la comunidad qué tienes y qué buscas a cambio en la descripción.</p>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      <form onSubmit={handleSubmit} className="stack">
        <div className="field">
          <label htmlFor="title">Título</label>
          <input id="title" value={form.title} onChange={update("title")} required maxLength={120} />
          {fieldErrors.title && <div className="field-error">{fieldErrors.title}</div>}
        </div>

        <div className="field">
          <label htmlFor="category">Categoría</label>
          <select id="category" value={form.category} onChange={update("category")}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="description">Descripción</label>
          <textarea
            id="description"
            rows={5}
            value={form.description}
            onChange={update("description")}
            required
            placeholder="Estado del objeto, qué buscas a cambio, disponibilidad…"
          />
          {fieldErrors.description && <div className="field-error">{fieldErrors.description}</div>}
        </div>

        <div className="field">
          <label htmlFor="image">Foto (opcional)</label>
          <input id="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleImageChange} />
          {preview && (
            <img
              src={preview}
              alt="Vista previa"
              style={{ marginTop: "0.6rem", width: 140, height: 140, objectFit: "cover", border: "1px solid var(--line)" }}
            />
          )}
        </div>

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? <span className="spinner" /> : "Publicar"}
        </button>
      </form>
    </div>
  );
}
