import { useState } from "react";
import { LocateFixed } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { detectLocation } from "../utils/geolocation";
import "./ExchangesPage.css";

const INTEREST_OPTIONS = ["Materiales", "Bienes", "Servicios"];

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({
    username: user.username,
    email: user.email,
    bio: user.bio || "",
    city: user.city || "",
    interests: user.interests || [],
    is_private: user.is_private,
    new_password: "",
  });
  const [coords, setCoords] = useState({ latitude: user.latitude, longitude: user.longitude });
  const [locating, setLocating] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleDetectLocation = async () => {
    setLocating(true);
    setError(null);
    try {
      const { latitude, longitude, city } = await detectLocation();
      setCoords({ latitude, longitude });
      setForm((f) => ({ ...f, city: city || f.city }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLocating(false);
    }
  };

  const update = (key) => (e) =>
    setForm((f) => ({
      ...f,
      [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

  const toggleInterest = (value) => {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(value)
        ? f.interests.filter((i) => i !== value)
        : [...f.interests, value],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);

    const formData = new FormData();
    formData.append("username", form.username);
    formData.append("email", form.email);
    formData.append("bio", form.bio);
    formData.append("city", form.city);
    if (coords.latitude != null) formData.append("latitude", coords.latitude);
    if (coords.longitude != null) formData.append("longitude", coords.longitude);
    formData.append("interests", form.interests.join(","));
    formData.append("is_private", form.is_private ? "true" : "false");
    if (form.new_password) formData.append("new_password", form.new_password);
    if (avatar) formData.append("avatar", avatar);

    try {
      await api.putForm("/api/users/me", formData);
      await refreshUser();
      setMessage("Cambios guardados.");
      setForm((f) => ({ ...f, new_password: "" }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="stack" style={{ maxWidth: 480 }}>
      <h1>Ajustes de cuenta</h1>

      {error && <div className="banner banner-error">{error}</div>}
      {message && <div className="banner banner-success">{message}</div>}

      <form onSubmit={handleSubmit} className="stack">
        <div className="field">
          <label htmlFor="username">Usuario</label>
          <input id="username" value={form.username} onChange={update("username")} />
        </div>

        <div className="field">
          <label htmlFor="email">Correo</label>
          <input id="email" type="email" value={form.email} onChange={update("email")} />
        </div>

        <div className="field">
          <label htmlFor="city">Ciudad</label>
          <input id="city" value={form.city} onChange={update("city")} placeholder="Ej. Barranquilla" />
          <button type="button" className="btn btn-outline" style={{ marginTop: "0.5rem" }} onClick={handleDetectLocation} disabled={locating}>
            {locating ? <span className="spinner" /> : <><LocateFixed size={16} /> Actualizar con mi ubicación actual</>}
          </button>
          {coords.latitude != null && <div className="field-hint">📍 Ubicación guardada.</div>}
        </div>

        <div className="field">
          <label>Intereses</label>
          <div className="category-row">
            {INTEREST_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`chip ${form.interests.includes(opt) ? "chip-active" : ""}`}
                onClick={() => toggleInterest(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="bio">Bio</label>
          <textarea id="bio" rows={3} value={form.bio} onChange={update("bio")} />
        </div>

        <div className="field">
          <label htmlFor="avatar">Foto de perfil</label>
          <input
            id="avatar"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(e) => setAvatar(e.target.files?.[0] || null)}
          />
        </div>

        <div className="field">
          <label htmlFor="new_password">Nueva contraseña</label>
          <input
            id="new_password"
            type="password"
            value={form.new_password}
            onChange={update("new_password")}
            autoComplete="new-password"
            placeholder="Déjalo en blanco para no cambiarla"
          />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600 }}>
          <input type="checkbox" checked={form.is_private} onChange={update("is_private")} />
          Perfil privado
        </label>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <span className="spinner" /> : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}
