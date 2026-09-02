import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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
    password: "",
    interests: [],
    city: "",
  });
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

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
    if (step === 1) return form.username.trim().length >= 3 && form.email.includes("@");
    if (step === 2) return form.password.length >= 8;
    return true;
  };

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      await register(form.username, form.email, form.password, form.interests, form.city);
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
            <div className="field">
              <label htmlFor="city">Ciudad</label>
              <input
                id="city"
                value={form.city}
                onChange={update("city")}
                placeholder="Ej. Barranquilla"
              />
              <div className="field-hint">Ayuda a mostrarte intercambios cerca tuyo.</div>
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
