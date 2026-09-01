import { useEffect, useState } from "react";
import { api } from "../api/client";
import "./AdminPage.css";
import "./RequestsPage.css";

export function AdminPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [exchanges, setExchanges] = useState([]);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const loadAll = () => {
    Promise.all([
      api.get("/api/admin/dashboard"),
      api.get("/api/admin/users"),
      api.get("/api/admin/exchanges"),
    ])
      .then(([dashboard, usersRes, exchangesRes]) => {
        setStats(dashboard);
        setUsers(usersRes.items);
        setExchanges(exchangesRes.items);
      })
      .catch((err) => setError(err.message));
  };

  useEffect(loadAll, []);

  const promote = async (userId) => {
    setBusyId(userId);
    try {
      await api.post(`/api/admin/users/${userId}/make-admin`);
      loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm("¿Eliminar este usuario y todo su contenido asociado?")) return;
    setBusyId(userId);
    try {
      await api.delete(`/api/admin/users/${userId}`);
      loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const deleteExchange = async (exchangeId) => {
    if (!confirm("¿Eliminar esta publicación?")) return;
    setBusyId(exchangeId);
    try {
      await api.delete(`/api/admin/exchanges/${exchangeId}`);
      loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="stack">
      <h1>Panel de administración</h1>

      {error && <div className="banner banner-error">{error}</div>}

      {stats && (
        <div className="admin-stats">
          <div className="admin-stat">
            <strong>{stats.users_count}</strong>
            <span>Usuarios</span>
          </div>
          <div className="admin-stat">
            <strong>{stats.exchanges_count}</strong>
            <span>Publicaciones</span>
          </div>
          <div className="admin-stat">
            <strong>{stats.messages_count}</strong>
            <span>Mensajes</span>
          </div>
        </div>
      )}

      <section className="stack">
        <h2>Usuarios</h2>
        {users.map((u) => (
          <div key={u.id} className="request-row">
            <div>
              <strong>{u.username}</strong> · {u.email}
              <div>
                <span className="status-badge" style={{ background: "#f0eee6", color: "var(--ink-soft)" }}>
                  {u.role}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {u.role !== "admin" && (
                <button className="btn btn-outline" disabled={busyId === u.id} onClick={() => promote(u.id)}>
                  Hacer admin
                </button>
              )}
              <button className="btn btn-danger" disabled={busyId === u.id} onClick={() => deleteUser(u.id)}>
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="stack">
        <h2>Publicaciones</h2>
        {exchanges.map((e) => (
          <div key={e.id} className="request-row">
            <div>
              <strong>{e.title}</strong> — {e.category}
            </div>
            <button className="btn btn-danger" disabled={busyId === e.id} onClick={() => deleteExchange(e.id)}>
              Eliminar
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
