import { useState } from "react";
import { ImagePlus, Package, Wrench, Boxes } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import "./CreateExchangePage.css";

const CATEGORIES = [
  { value: "Materiales", icon: Boxes, desc: "Insumos, sobrantes, telas…" },
  { value: "Bienes", icon: Package, desc: "Objetos, ropa, tecnología…" },
  { value: "Servicios", icon: Wrench, desc: "Clases, reparaciones…" },
];

export function CreateExchangePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ category: "", title: "", offers: "", seeks: "", description: "" });
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
    formData.append("offers", form.offers);
    formData.append("seeks", form.seeks);
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
    <div className="stack create-exchange" style={{ maxWidth: 640 }}>
      <div>
        <h1>Publicar algo para intercambiar</h1>
        <p>Contale a la comunidad qué tienes y qué buscas a cambio.</p>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      <form onSubmit={handleSubmit} className="stack">
        <section className="form-section">
          <h2 className="form-section-title">¿Qué tipo de intercambio es?</h2>
          <div className="type-grid">
            {CATEGORIES.map(({ value, icon: Icon, desc }) => (
              <button
                type="button"
                key={value}
                className={`type-card ${form.category === value ? "type-card-active" : ""}`}
                onClick={() => setForm((f) => ({ ...f, category: value }))}
              >
                <Icon size={22} />
                <strong>{value}</strong>
                <span>{desc}</span>
              </button>
            ))}
          </div>
          {fieldErrors.category && <div className="field-error">{fieldErrors.category}</div>}
        </section>

        <section className="form-section">
          <h2 className="form-section-title">Información</h2>
          <div className="field">
            <label htmlFor="title">Título</label>
            <input id="title" value={form.title} onChange={update("title")} required maxLength={120} />
            {fieldErrors.title && <div className="field-error">{fieldErrors.title}</div>}
          </div>
          <div className="field">
            <label htmlFor="offers">¿Qué ofreces?</label>
            <input id="offers" value={form.offers} onChange={update("offers")} placeholder="Ej. Bicicleta rodado 26" />
            {fieldErrors.offers && <div className="field-error">{fieldErrors.offers}</div>}
          </div>
          <div className="field">
            <label htmlFor="seeks">¿Qué buscas a cambio?</label>
            <input id="seeks" value={form.seeks} onChange={update("seeks")} placeholder="Ej. Herramientas o algo de jardín" />
            {fieldErrors.seeks && <div className="field-error">{fieldErrors.seeks}</div>}
          </div>
          <div className="field">
            <label htmlFor="description">Descripción (opcional)</label>
            <textarea
              id="description"
              rows={4}
              value={form.description}
              onChange={update("description")}
              placeholder="Estado del objeto, disponibilidad, detalles extra…"
            />
          </div>
        </section>

        <section className="form-section">
          <h2 className="form-section-title">Imagen</h2>
          <label className="image-drop">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleImageChange}
              hidden
            />
            {preview ? (
              <img src={preview} alt="Vista previa" className="image-drop-preview" />
            ) : (
              <>
                <ImagePlus size={28} />
                <span>Agregar imagen</span>
              </>
            )}
          </label>
        </section>

        <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
          {submitting ? <span className="spinner" /> : "Publicar intercambio"}
        </button>
      </form>
    </div>
  );
}
