import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import "@fontsource-variable/montserrat";
import { api } from "../api/client";
import { AuthVisual } from "../components/AuthVisual";
import { PasswordRequirements } from "../components/PasswordRequirements";
import { isPasswordValid } from "../utils/passwordRules";
import "./AuthPage.css";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isPasswordValid(newPassword)) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/api/auth/reset-password", { email, token, new_password: newPassword });
      setDone(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const visual = (
    <AuthVisual
      title={<>Elige tu nueva <span>contraseña</span></>}
      text="Crea una contraseña segura y vuelve a conectar con tu comunidad."
    />
  );

  if (!email || !token) {
    return (
      <div className="auth-screen auth-screen--login auth-screen--reset">
        {visual}
        <div className="auth-card">
          <div className="auth-heading">
            <h2>Enlace no válido</h2>
          </div>
          <div className="banner banner-error">
            Este enlace no es válido. Pedí uno nuevo desde "¿Olvidaste tu contraseña?".
          </div>
          <Link to="/forgot-password" className="btn btn-primary btn-full">
            Pedir enlace nuevo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen auth-screen--login auth-screen--reset">
      {visual}

      <div className="auth-card">
        <div className="auth-heading">
          <h2>Nueva contraseña</h2>
          <p>Elige una contraseña segura para tu cuenta.</p>
        </div>

        {error && <div className="banner banner-error">{error}</div>}

        {done ? (
          <div className="banner banner-success">¡Listo! Te llevamos al login…</div>
        ) : (
          <form onSubmit={handleSubmit} className="stack">
            <div className="field">
              <label htmlFor="new_password">Nueva contraseña</label>
              <div className="input-wrap">
                <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
                  <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
                </svg>
                <input
                  id="new_password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Crea tu nueva contraseña"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="input-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
                      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 3l18 18" />
                      <path d="M10.6 5.1A9.8 9.8 0 0 1 12 5c5 0 8.5 4.2 9.5 7a12 12 0 0 1-2.6 3.9M6.6 6.7A12 12 0 0 0 2.5 12c1 2.8 4.5 7 9.5 7 1.5 0 2.8-.4 4-1" />
                      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
                      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7S2.5 12 2.5 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>

              <PasswordRequirements password={newPassword} />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={submitting || !isPasswordValid(newPassword)}
            >
              {submitting ? <span className="spinner" /> : "Cambiar contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}