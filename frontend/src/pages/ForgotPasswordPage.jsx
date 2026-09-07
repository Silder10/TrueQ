import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import "./AuthPage.css";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/api/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-visual">
        <span className="auth-visual-icon">🔑</span>
        <h1>Recuperá tu acceso</h1>
        <p>Te mandamos un enlace para que puedas elegir una contraseña nueva.</p>
      </div>

      <div className="auth-card">
        <h2>¿Olvidaste tu contraseña?</h2>

        {error && <div className="banner banner-error">{error}</div>}

        {sent ? (
          <div className="banner banner-success">
            Si ese correo existe en nuestro sistema, ya deberías tener un enlace de recuperación.
            Revisá tu bandeja de entrada (y spam).
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="stack">
            <div className="field">
              <label htmlFor="email">Correo</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
              {submitting ? <span className="spinner" /> : "Enviar enlace"}
            </button>
          </form>
        )}

        <p className="auth-switch">
          <Link to="/login">Volver a iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}
