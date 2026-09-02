import { useEffect, useState } from "react";
import { MoreVertical, Shield, Trash2 } from "lucide-react";
import { api } from "../api/client";
import "./AdminPage.css";

export function AdminPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [exchanges, setExchanges] = useState([]);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);

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
    setOpenMenu(null);
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
    setOpenMenu(null);
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
            <strong>{stats.completed_exchanges_count}</strong>
            <span>Completados</span>
          </div>
          <div className="admin-stat">
            <strong>{stats.reviews_count}</strong>
            <span>Reseñas</span>
          </div>
        </div>
      )}

      <section className="stack">
        <h2>Usuarios</h2>
        <div className="admin-table">
          {users.map((u) => (
            <div key={u.id} className="admin-table-row">
              <div className="admin-table-user">
                <strong>{u.username}</strong>
                <span>{u.email}</span>
              </div>
              <span className={`badge ${u.role === "admin" ? "badge-aceptada" : "badge-cancelado"}`}>{u.role}</span>
              <div className="admin-menu-wrap">
                <button className="icon-btn" onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)}>
                  <MoreVertical size={18} />
                </button>
                {openMenu === u.id && (
                  <div className="admin-menu">
                    {u.role !== "admin" && (
                      <button onClick={() => promote(u.id)} disabled={busyId === u.id}>
                        <Shield size={15} /> Hacer admin
                      </button>
                    )}
                    <button className="admin-menu-danger" onClick={() => deleteUser(u.id)} disabled={busyId === u.id}>
                      <Trash2 size={15} /> Eliminar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="stack">
        <h2>Publicaciones</h2>
        <div className="admin-table">
          {exchanges.map((e) => (
            <div key={e.id} className="admin-table-row">
              <div className="admin-table-user">
                <strong>{e.title}</strong>
                <span>{e.category}</span>
              </div>
              <button
                className="btn btn-danger btn-icon"
                disabled={busyId === e.id}
                onClick={() => deleteExchange(e.id)}
                aria-label="Eliminar"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
