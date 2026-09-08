import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LocateFixed } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { detectLocation } from "../utils/geolocation";
import "./AuthPage.css";

const INTEREST_OPTIONS = [
  { value: "Materiales", icon: "🧱", desc: "Insumos, sobrantes de obra, telas…" },
  { value: "Bienes", icon: "📦", desc: "Objetos, ropa, tecnología, libros…" },
  { value: "Servicios", icon: "🛠", desc: "Clases, reparaciones, asesorías…" },
];

const TOTAL_STEPS = 5;

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
    interests: [],
    city: "",
    latitude: null,
    longitude: null,
  });
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const toggleInterest = (value) => {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(value)
        ? f.interests.filter((i) => i !== value)
        : [...f.interests, value],
    }));
  };

  const canAdvance = () => {
    if (step === 1) {
      const hasContact = form.email.includes("@") || form.phone.trim().length >= 7;
      return form.username.trim().length >= 3 && hasContact;
    }
    if (step === 2) return form.password.length >= 8;
    return true;
  };

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const handleDetectLocation = async () => {
    setLocating(true);
    setLocationError(null);
    try {
      const { latitude, longitude, city } = await detectLocation();
      setForm((f) => ({ ...f, latitude, longitude, city: city || f.city }));
    } catch (err) {
      setLocationError(err.message);
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      await register(form.username, form.email, form.password, form.interests, form.city, form.latitude, form.longitude, form.phone);
      navigate("/exchanges");
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.fields || {});
      if (err.fields?.username || err.fields?.email) setStep(1);
      else if (err.fields?.password) setStep(2);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-visual">
        <span className="auth-visual-icon">🔄</span>
        <h1>Únete a TrueQ</h1>
        <p>Publica en minutos y empieza a intercambiar con tu comunidad.</p>
      </div>

      <div className="auth-card">
        <div className="step-progress">
          <span>
            Paso {step} de {TOTAL_STEPS}
          </span>
          <div className="step-progress-bar">
            <div className="step-progress-fill" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
          </div>
        </div>

        {error && <div className="banner banner-error">{error}</div>}

        {step === 1 && (
          <div className="stack">
            <h2>Tus datos</h2>
            <div className="field">
              <label htmlFor="username">Usuario</label>
              <input id="username" value={form.username} onChange={update("username")} />
              {fieldErrors.username && <div className="field-error">{fieldErrors.username}</div>}
            </div>
            <div className="field">
              <label htmlFor="email">Correo</label>
              <input id="email" type="email" value={form.email} onChange={update("email")} autoComplete="email" />
              {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
            </div>
            <div className="field">
              <label htmlFor="phone">O tu número de teléfono</label>
              <input id="phone" type="tel" value={form.phone} onChange={update("phone")} placeholder="Ej. 3001234567" autoComplete="tel" />
              {fieldErrors.phone && <div className="field-error">{fieldErrors.phone}</div>}
              <div className="field-hint">Con uno de los dos alcanza (correo o teléfono).</div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="stack">
            <h2>Crea tu contraseña</h2>
            <div className="field">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={update("password")}
                autoComplete="new-password"
              />
              {fieldErrors.password ? (
                <div className="field-error">{fieldErrors.password}</div>
              ) : (
                <div className="field-hint">Mínimo 8 caracteres.</div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="stack">
            <h2>¿Qué te interesa intercambiar?</h2>
            <p className="field-hint">Podés elegir varias, o ninguna por ahora.</p>
            <div className="interest-grid">
              {INTEREST_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  className={`interest-card ${form.interests.includes(opt.value) ? "interest-card-active" : ""}`}
                  onClick={() => toggleInterest(opt.value)}
                >
                  <span className="interest-card-icon">{opt.icon}</span>
                  <strong>{opt.value}</strong>
                  <span className="interest-card-desc">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="stack">
            <h2>¿Dónde estás?</h2>
            <button type="button" className="btn btn-outline btn-full" onClick={handleDetectLocation} disabled={locating}>
              {locating ? <span className="spinner" /> : <><LocateFixed size={17} /> Usar mi ubicación actual</>}
            </button>
            {locationError && <div className="field-error">{locationError}</div>}
            {form.latitude && (
              <div className="field-hint">📍 Ubicación detectada correctamente.</div>
            )}
            <div className="field">
              <label htmlFor="city">Ciudad</label>
              <input
                id="city"
                value={form.city}
                onChange={update("city")}
                placeholder="Ej. Barranquilla"
              />
              <div className="field-hint">
                También podés escribirla a mano si preferís no compartir tu ubicación.
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="stack">
            <h2>Todo listo</h2>
            <div className="confirm-summary">
              <div>
                <strong>Usuario</strong>
                <span>{form.username}</span>
              </div>
              <div>
                <strong>Correo</strong>
                <span>{form.email}</span>
              </div>
              <div>
                <strong>Intereses</strong>
                <span>{form.interests.length ? form.interests.join(", ") : "Ninguno todavía"}</span>
              </div>
              <div>
                <strong>Ciudad</strong>
                <span>{form.city || "Sin definir"}</span>
              </div>
            </div>
          </div>
        )}

        <div className="step-actions">
          {step > 1 && (
            <button type="button" className="btn btn-outline" onClick={back} disabled={submitting}>
              Atrás
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button type="button" className="btn btn-primary" onClick={next} disabled={!canAdvance()}>
              Continuar
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <span className="spinner" /> : "Crear cuenta"}
            </button>
          )}
        </div>

        <p className="auth-switch">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
