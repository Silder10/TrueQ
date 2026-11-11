
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { AuthVisual } from "../components/AuthVisual";
import "@fontsource-variable/montserrat";
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
    <div className="auth-screen auth-screen--login">
      <AuthVisual
        title={<>Intercambia. Conecta. <span>Renueva.</span></>}
        text="Dale una nueva oportunidad a lo que tienes y encuentra lo que necesitas."
      />

      <div className="auth-card">
        <h2>Recupera tu contraseña</h2>

        <p className="auth-description">
          No te preocupes. Ingresa tu correo electrónico y te enviaremos
          un enlace para recuperar el acceso a tu cuenta.
        </p>

        {error && (
          <div className="banner banner-error">
            {error}
          </div>
        )}

        {sent ? (
          <div className="banner banner-success">
            Si ese correo existe en nuestro sistema, ya deberías tener
            un enlace de recuperación. Revisa tu bandeja de entrada
            y la carpeta de spam.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="stack">
            
            <div className="field">
              <label htmlFor="email">Correo electrónico</label>

              <div className="input-wrap">
                <svg
                  className="input-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="5" width="18" height="14" rx="2.5" />
                  <path d="M3.5 7l8.5 6 8.5-6" />
                </svg>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ingresa tu correo electrónico"
                  required
                  autoComplete="email"
                />
              </div>
            </div>


            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={submitting}
            >
              {submitting ? (
                <span className="spinner" />
              ) : (
                "Enviar enlace de recuperación"
              )}
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
