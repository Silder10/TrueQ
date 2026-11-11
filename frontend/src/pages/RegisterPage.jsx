import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LocateFixed } from "lucide-react";
import "@fontsource-variable/montserrat";
import { useAuth } from "../context/useAuth";
import { detectLocation } from "../utils/geolocation";
import { AuthVisual } from "../components/AuthVisual";
import "./AuthPage.css";

const INTEREST_OPTIONS = [
  { value: "Materiales", icon: "🧱", desc: "Insumos, sobrantes de obra, telas…" },
  { value: "Bienes", icon: "📦", desc: "Objetos, ropa, tecnología, libros…" },
  { value: "Servicios", icon: "🛠", desc: "Clases, reparaciones, asesorías…" },
];

const TOTAL_STEPS = 5;

const ICONS = {
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20c.8-3.6 3.8-5.5 7.5-5.5s6.7 1.9 7.5 5.5" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3.5 7l8.5 6 8.5-6" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M11 18.5h2" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7S2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A9.8 9.8 0 0 1 12 5c5 0 8.5 4.2 9.5 7a12 12 0 0 1-2.6 3.9M6.6 6.7A12 12 0 0 0 2.5 12c1 2.8 4.5 7 9.5 7 1.5 0 2.8-.4 4-1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
};

function Icon({ name, className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

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
  const [showPassword, setShowPassword] = useState(false);

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

    if (step === 2) {
      const password = form.password;

      return (
        password.length >= 8 &&
        password.length <= 128 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /\d/.test(password) &&
        /[^A-Za-z0-9\s]/.test(password)
      );
    }

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
    <div className="auth-screen auth-screen--login auth-screen--register">
      <AuthVisual
        title={<>Únete a <span>TrueQ</span></>}
        text="Publica en minutos y empieza a intercambiar con tu comunidad."
      />

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
              <div className="input-wrap">
                <Icon name="user" className="input-icon" />
                <input
                  id="username"
                  value={form.username}
                  onChange={update("username")}
                  placeholder="Elige tu nombre de usuario"
                  autoComplete="username"
                />
              </div>
              {fieldErrors.username && <div className="field-error">{fieldErrors.username}</div>}
            </div>
            <div className="field">
              <label htmlFor="email">Correo</label>
              <div className="input-wrap">
                <Icon name="mail" className="input-icon" />
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={update("email")}
                  placeholder="Ingresa tu correo"
                  autoComplete="email"
                />
              </div>
              {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
            </div>
            <div className="field">
              <label htmlFor="phone">O tu número de teléfono</label>
              <div className="input-wrap">
                <Icon name="phone" className="input-icon" />
                <input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={update("phone")}
                  placeholder="Ej. 3001234567"
                  autoComplete="tel"
                />
              </div>
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

              <div className="input-wrap">
                <Icon name="lock" className="input-icon" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={update("password")}
                  placeholder="Crea tu contraseña"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="input-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  <Icon name={showPassword ? "eyeOff" : "eye"} />
                </button>
              </div>

              <div className="password-requirements">
                <p>Tu contraseña debe cumplir estos requisitos:</p>

                <ul>
                  <li className={form.password.length >= 8 ? "requirement-met" : ""}>
                    Al menos 8 caracteres
                  </li>

                  <li className={form.password.length <= 128 && form.password.length > 0 ? "requirement-met" : ""}>
                    Máximo 128 caracteres
                  </li>

                  <li className={/[A-Z]/.test(form.password) ? "requirement-met" : ""}>
                    Una letra mayúscula
                  </li>

                  <li className={/[a-z]/.test(form.password) ? "requirement-met" : ""}>
                    Una letra minúscula
                  </li>

                  <li className={/\d/.test(form.password) ? "requirement-met" : ""}>
                    Un número
                  </li>

                  <li className={/[^A-Za-z0-9\s]/.test(form.password) ? "requirement-met" : ""}>
                    Un carácter especial (!, @, #, etc.)
                  </li>
                </ul>
              </div>

              {fieldErrors.password ? (
                <div className="field-error">{fieldErrors.password}</div>
              ) : null}
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
              <div className="input-wrap">
                <Icon name="pin" className="input-icon" />
                <input
                  id="city"
                  value={form.city}
                  onChange={update("city")}
                  placeholder="Ej. Barranquilla"
                />
              </div>
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
              <Icon name="arrow" className="btn-arrow" />
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