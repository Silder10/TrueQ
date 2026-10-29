import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import "./AuthPage.css";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(identifier, password);
      navigate("/exchanges");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-visual">
        
    <svg
      className="auth-background-art"
      viewBox="0 0 700 800"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lensStroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#69e3d6" stopOpacity=".5" />
          <stop offset="45%" stopColor="#238d9d" stopOpacity=".13" />
          <stop offset="100%" stopColor="#57cfc8" stopOpacity=".38" />
        </linearGradient>
        <linearGradient id="handleFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#47c8c2" stopOpacity=".24" />
          <stop offset="100%" stopColor="#123e54" stopOpacity=".04" />
        </linearGradient>
        <radialGradient id="lensFill" cx="35%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#174859" stopOpacity=".15" />
          <stop offset="75%" stopColor="#061f35" stopOpacity=".12" />
          <stop offset="100%" stopColor="#36b7b4" stopOpacity=".12" />
        </radialGradient>
      </defs>

      <circle cx="295" cy="340" r="228" fill="url(#lensFill)" />
      <circle cx="295" cy="340" r="228"
        fill="none" stroke="url(#lensStroke)" strokeWidth="2" />
      <circle cx="295" cy="340" r="246"
        fill="none" stroke="#58c9c6" strokeOpacity=".08" strokeWidth="24" />
      <circle cx="295" cy="340" r="270"
        fill="none" stroke="#58c9c6" strokeOpacity=".045" strokeWidth="1.5" />

      <path
        d="M454 500 L610 656 Q631 678 610 700 Q589 720 568 698 L412 542 Z"
        fill="url(#handleFill)"
        stroke="url(#lensStroke)"
        strokeWidth="2"
      />

      <path
        d="M470 520 L591 644"
        fill="none"
        stroke="#76e5d9"
        strokeOpacity=".12"
        strokeWidth="3"
        strokeLinecap="round"
      />

      <path
        d="M-80 550 C100 420 190 620 370 520 S620 390 790 490"
        fill="none"
        stroke="#3fc4bd"
        strokeOpacity=".09"
        strokeWidth="65"
      />
      <path
        d="M-90 610 C100 480 210 680 390 580 S640 450 800 550"
        fill="none"
        stroke="#52d2c7"
        strokeOpacity=".055"
        strokeWidth="32"
      />
    </svg>

        <div className="auth-brand">
          <span className="auth-logo-mark" aria-hidden="true"></span>
          <h1>
            True<span className="auth-logo-q">Q</span>
          </h1>
        </div>

        <div className="auth-visual-copy">
          <span className="auth-accent-line"></span>

          <h2>
            Intercambia. Conecta. <span>Renueva.</span>
          </h2>

          <p>
            Dale una nueva oportunidad a lo que tienes
            y encuentra lo que necesitas.
          </p>
        </div>
      </div>

      <div className="auth-card">
        <div className="auth-heading">
          <h2>Inicia sesión</h2>
          <p>¡Bienvenido de nuevo!</p>
          <span>  
            Accede a tu cuenta y sigue conectando con tu comunidad.
          </span>
        </div>

        {error && <div className="banner banner-error">{error}</div>}

        <form onSubmit={handleSubmit} className="stack">
          <div className="field">
            <label htmlFor="identifier">Correo o teléfono</label>
            <input
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
            {submitting ? <span className="spinner" /> : "Entrar"}
          </button>
        </form>

        <p className="auth-switch">
          ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
          {" · "}
          <Link to="/forgot-password">¿Olvidaste tu contraseña?</Link>
        </p>
      </div>
    </div>
  );
}
