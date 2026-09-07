import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import "./AuthPage.css";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
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

  if (!email || !token) {
    return (
      <div className="auth-screen">
        <div className="auth-card" style={{ margin: "auto" }}>
          <div className="banner banner-error">
            Este enlace no es válido. Pedí uno nuevo desde "¿Olvidaste tu contraseña?".
          </div>
          <Link to="/forgot-password" className="btn btn-primary">
            Pedir enlace nuevo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <div className="auth-visual">
        <span className="auth-visual-icon">🔑</span>
        <h1>Elegí tu nueva contraseña</h1>
      </div>

      <div className="auth-card">
        <h2>Nueva contraseña</h2>

        {error && <div className="banner banner-error">{error}</div>}

        {done ? (
          <div className="banner banner-success">¡Listo! Te llevamos al login…</div>
        ) : (
          <form onSubmit={handleSubmit} className="stack">
            <div className="field">
              <label htmlFor="new_password">Nueva contraseña</label>
              <input
                id="new_password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <div className="field-hint">Mínimo 8 caracteres.</div>
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
              {submitting ? <span className="spinner" /> : "Cambiar contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
