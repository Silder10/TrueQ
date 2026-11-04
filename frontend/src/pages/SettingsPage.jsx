
import { useState } from "react";
import { LocateFixed, Moon, Sun } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/useAuth";
import { detectLocation } from "../utils/geolocation";
import "./SettingsPage.css";
import "./ExchangesPage.css";

const INTEREST_OPTIONS = ["Materiales", "Bienes", "Servicios"];
const THEME_KEY = "trueq-theme";

function getInitialTheme() {
  return document.documentElement.dataset.theme === "dark"
    ? "dark"
    : "light";
}

export function SettingsPage() {
  const { user, refreshUser } = useAuth();

  const [theme, setTheme] = useState(getInitialTheme);

  const [form, setForm] = useState({
    username: user.username,
    email: user.email,
    bio: user.bio || "",
    city: user.city || "",
    interests: user.interests || [],
    is_private: user.is_private,
    new_password: "",
  });

  const [coords, setCoords] = useState({
    latitude: user.latitude,
    longitude: user.longitude,
  });

  const [locating, setLocating] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";

    try {
      localStorage.setItem(THEME_KEY, nextTheme);
    } catch {
      setError(
        "No se pudo guardar la preferencia de apariencia en este navegador."
      );
      return;
    }

    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    setTheme(nextTheme);
  };

  const handleDetectLocation = async () => {
    setLocating(true);
    setError(null);
    setMessage(null);

    try {
      const { latitude, longitude, city } = await detectLocation();

      setCoords({ latitude, longitude });
      setForm((current) => ({
        ...current,
        city: city || current.city,
      }));
    } catch (err) {
      setError(err.message || "No se pudo detectar la ubicación.");
    } finally {
      setLocating(false);
    }
  };

  const update = (key) => (event) => {
    const value =
      event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value;

    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const toggleInterest = (value) => {
    setForm((current) => ({
      ...current,
      interests: current.interests.includes(value)
        ? current.interests.filter((interest) => interest !== value)
        : [...current.interests, value],
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);

    const formData = new FormData();

    formData.append("username", form.username);
    formData.append("email", form.email);
    formData.append("bio", form.bio);
    formData.append("city", form.city);

    if (coords.latitude != null) {
      formData.append("latitude", coords.latitude);
    }

    if (coords.longitude != null) {
      formData.append("longitude", coords.longitude);
    }

    formData.append("interests", form.interests.join(","));
    formData.append("is_private", form.is_private ? "true" : "false");

    if (form.new_password) {
      formData.append("new_password", form.new_password);
    }

    if (avatar) {
      formData.append("avatar", avatar);
    }

    try {
      await api.putForm("/api/users/me", formData);
      await refreshUser();

      setMessage("Cambios guardados correctamente.");
      setForm((current) => ({
        ...current,
        new_password: "",
      }));
      setAvatar(null);

      const avatarInput = document.getElementById("avatar");
      if (avatarInput) avatarInput.value = "";
    } catch (err) {
      setError(err.message || "No se pudieron guardar los cambios.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="stack settings-page">
      <header>
        <h1 className="settings-heading">Ajustes de cuenta</h1>
        <p className="settings-description">
          Administra tu perfil, privacidad y preferencias de TrueQ.
        </p>
      </header>

      {error && (
        <div className="banner banner-error" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="banner banner-success" role="status">
          {message}
        </div>
      )}

      <section className="settings-section">
        <h2 className="settings-section-title">Apariencia</h2>
        <p className="settings-section-description">
          Personaliza cómo se ve TrueQ en este dispositivo.
        </p>

        <div className="settings-theme-option">
          <div className="settings-theme-copy">
            <strong>Tema {theme === "dark" ? "oscuro" : "claro"}</strong>
            <span>
              {theme === "dark"
                ? "Interfaz con fondos oscuros."
                : "Interfaz con fondos claros."}
              {" "}Tu preferencia se guarda en este navegador.
            </span>
          </div>

          <button
            type="button"
            className="settings-theme-toggle"
            onClick={toggleTheme}
            aria-label={
              theme === "dark"
                ? "Activar tema claro"
                : "Activar tema oscuro"
            }
            aria-pressed={theme === "dark"}
          >
            {theme === "dark" ? (
              <>
                <Sun size={18} />
                Activar tema claro
              </>
            ) : (
              <>
                <Moon size={18} />
                Activar tema oscuro
              </>
            )}
          </button>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="stack">
        <section className="settings-section">
          <h2 className="settings-section-title">Información personal</h2>
          <p className="settings-section-description">
            Mantén tus datos de perfil actualizados.
          </p>

          <div className="field">
            <label htmlFor="username">Usuario</label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              value={form.username}
              onChange={update("username")}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={update("email")}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="bio">Biografía</label>
            <textarea
              id="bio"
              rows={3}
              value={form.bio}
              onChange={update("bio")}
              placeholder="Cuéntales algo sobre ti..."
            />
          </div>

          <div className="field">
            <label htmlFor="avatar">Foto de perfil</label>
            <input
              className="settings-avatar-input"
              id="avatar"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(event) =>
                setAvatar(event.target.files?.[0] || null)
              }
            />
            {avatar && (
              <p className="field-hint">
                Imagen seleccionada: {avatar.name}
              </p>
            )}
          </div>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">Ubicación e intereses</h2>
          <p className="settings-section-description">
            Ayuda a otros usuarios a encontrar intercambios relevantes.
          </p>

          <div className="field">
            <label htmlFor="city">Ciudad</label>
            <input
              id="city"
              value={form.city}
              onChange={update("city")}
              placeholder="Ej. Barranquilla"
            />

            <button
              type="button"
              className="btn btn-outline settings-location-button"
              onClick={handleDetectLocation}
              disabled={locating}
            >
              {locating ? (
                <>
                  <span className="spinner" />
                  Detectando ubicación...
                </>
              ) : (
                <>
                  <LocateFixed size={16} />
                  Usar mi ubicación actual
                </>
              )}
            </button>

            {coords.latitude != null && (
              <div className="field-hint">
                Ubicación detectada o guardada.
              </div>
            )}
          </div>

          <div className="field">
            <label>Intereses</label>
            <div className="settings-interests">
              {INTEREST_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`chip ${form.interests.includes(option) ? "chip-active" : ""
                    }`}
                  onClick={() => toggleInterest(option)}
                  aria-pressed={form.interests.includes(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">Seguridad y privacidad</h2>
          <p className="settings-section-description">
            Protege tu cuenta y controla la visibilidad de tu perfil.
          </p>

          <div className="field">
            <label htmlFor="new_password">Nueva contraseña</label>
            <input
              id="new_password"
              type="password"
              autoComplete="new-password"
              value={form.new_password}
              onChange={update("new_password")}
              placeholder="Déjalo en blanco para no cambiarla"
            />
            <p className="field-hint">
              Solo se actualizará si escribes una nueva contraseña.
            </p>
          </div>

          <label className="settings-private-option">
            <input
              type="checkbox"
              checked={Boolean(form.is_private)}
              onChange={update("is_private")}
            />
            Perfil privado
          </label>
        </section>

        <button
          type="submit"
          className="btn btn-primary settings-submit"
          disabled={saving}
        >
          {saving ? (
            <>
              <span className="spinner" />
              Guardando cambios...
            </>
          ) : (
            "Guardar cambios"
          )}
        </button>
      </form>
    </div>
  );
}