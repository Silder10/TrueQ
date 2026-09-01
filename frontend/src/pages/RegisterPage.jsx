import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./AuthPage.css";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      await register(form.username, form.email, form.password);
      navigate("/exchanges");
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.fields || {});
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-brand">
        <h1>
          Tu clóset, tu garaje,
          <br />
          el próximo <em>trueque</em>.
        </h1>
        <p>Publica en dos minutos. Sin comisiones, sin dinero de por medio.</p>
      </div>

      <div className="auth-card">
        <h2>Crea tu cuenta</h2>

        {error && <div className="banner banner-error">{error}</div>}

        <form onSubmit={handleSubmit} className="stack">
          <div className="field">
            <label htmlFor="username">Usuario</label>
            <input id="username" value={form.username} onChange={update("username")} required />
            {fieldErrors.username && <div className="field-error">{fieldErrors.username}</div>}
          </div>

          <div className="field">
            <label htmlFor="email">Correo</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={update("email")}
              required
              autoComplete="email"
            />
            {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
          </div>

          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={update("password")}
              required
              autoComplete="new-password"
            />
            {fieldErrors.password ? (
              <div className="field-error">{fieldErrors.password}</div>
            ) : (
              <div className="field-hint">Mínimo 8 caracteres.</div>
            )}
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
            {submitting ? <span className="spinner" /> : "Crear cuenta"}
          </button>
        </form>

        <p className="auth-switch">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
