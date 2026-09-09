import { useEffect, useState } from "react";
import { Bell, Check, FileText, MoreVertical, Package, Shield, ShieldOff, Trash2, Users, X } from "lucide-react";
import { api } from "../api/client";
import "./AdminPage.css";
import "./ProfilePage.css";

const TABS = ["Resumen", "Moderación", "Reportes", "Usuarios", "Publicaciones"];

export function AdminPage() {
  const [tab, setTab] = useState("Resumen");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [exchanges, setExchanges] = useState([]);
  const [pending, setPending] = useState([]);
  const [reports, setReports] = useState([]);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);

  const loadAll = () => {
    Promise.all([
      api.get("/api/admin/dashboard"),
      api.get("/api/admin/users"),
      api.get("/api/admin/exchanges"),
      api.get("/api/admin/exchanges?moderation_status=Pendiente"),
      api.get("/api/admin/reports?status=Pendiente"),
    ])
      .then(([dashboard, usersRes, exchangesRes, pendingRes, reportsRes]) => {
        setStats(dashboard);
        setUsers(usersRes.items);
        setExchanges(exchangesRes.items);
        setPending(pendingRes.items);
        setReports(reportsRes.items);
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

  const unsuspend = async (userId) => {
    setBusyId(userId);
    setOpenMenu(null);
    try {
      await api.post(`/api/admin/users/${userId}/unsuspend`);
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

  const approveExchange = async (exchangeId) => {
    setBusyId(exchangeId);
    try {
      await api.post(`/api/admin/exchanges/${exchangeId}/approve`);
      loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const rejectExchange = async (exchangeId) => {
    const note = prompt("Motivo del rechazo (se le mostrará al usuario):", "Contenido duplicado o inapropiado");
    if (note === null) return;
    setBusyId(exchangeId);
    try {
      await api.post(`/api/admin/exchanges/${exchangeId}/reject`, { note });
      loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const resolveReport = async (reportId, action) => {
    setBusyId(reportId);
    try {
      await api.post(`/api/admin/reports/${reportId}/resolve`, { action });
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
            <div className="admin-stat-icon"><Users size={18} /></div>
            <strong>{stats.users_count}</strong>
            <span>Usuarios</span>
          </div>
          <div className="admin-stat">
            <div className="admin-stat-icon"><Package size={18} /></div>
            <strong>{stats.exchanges_count}</strong>
            <span>Publicaciones</span>
          </div>
          <div className="admin-stat admin-stat-warning">
            <div className="admin-stat-icon"><FileText size={18} /></div>
            <strong>{stats.pending_moderation_count}</strong>
            <span>Por moderar</span>
          </div>
          <div className="admin-stat admin-stat-danger">
            <div className="admin-stat-icon"><Bell size={18} /></div>
            <strong>{stats.pending_reports_count}</strong>
            <span>Reportes pendientes</span>
          </div>
        </div>
      )}

      <div className="segmented-control admin-segmented">
        {TABS.map((t) => (
          <button key={t} className={`segmented-option ${tab === t ? "segmented-option-active" : ""}`} onClick={() => setTab(t)}>
            {t}
            {t === "Moderación" && pending.length > 0 && <span className="tab-count">{pending.length}</span>}
            {t === "Reportes" && reports.length > 0 && <span className="tab-count">{reports.length}</span>}
          </button>
        ))}
      </div>

      {tab === "Moderación" && (
        <section className="stack">
          {pending.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✅</div>
              <h3>Nada pendiente de revisión</h3>
            </div>
          ) : (
            pending.map((e) => (
              <div key={e.id} className="admin-table-row">
                <div className="admin-table-user">
                  <strong>{e.title}</strong>
                  <span>
                    {e.category} · {e.offers} → {e.seeks}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button className="btn btn-primary btn-icon" disabled={busyId === e.id} onClick={() => approveExchange(e.id)} aria-label="Aprobar">
                    <Check size={16} />
                  </button>
                  <button className="btn btn-danger btn-icon" disabled={busyId === e.id} onClick={() => rejectExchange(e.id)} aria-label="Rechazar">
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {tab === "Reportes" && (
        <section className="stack">
          {reports.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🛡️</div>
              <h3>Sin reportes pendientes</h3>
            </div>
          ) : (
            reports.map((r) => (
              <div key={r.id} className="admin-table-row">
                <div className="admin-table-user">
                  <strong>
                    {r.reason} · {r.target_type === "usuario" ? "Usuario" : "Publicación"} #{r.target_id}
                  </strong>
                  <span>
                    Reportado por {r.reporter?.username}
                    {r.description ? ` — "${r.description}"` : ""}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <button className="btn btn-outline" disabled={busyId === r.id} onClick={() => resolveReport(r.id, "desestimar")}>
                    Desestimar
                  </button>
                  <button className="btn btn-outline" disabled={busyId === r.id} onClick={() => resolveReport(r.id, "advertencia")}>
                    Advertir
                  </button>
                  <button className="btn btn-danger" disabled={busyId === r.id} onClick={() => resolveReport(r.id, "suspender")}>
                    Suspender
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {tab === "Usuarios" && (
        <section className="stack">
          <div className="admin-table">
            {users.map((u) => (
              <div key={u.id} className="admin-table-row">
                <div className="admin-table-user">
                  <strong>{u.username}</strong>
                  <span>{u.email}</span>
                </div>
                <span className={`badge ${u.role === "admin" ? "badge-aceptada" : "badge-cancelado"}`}>{u.role}</span>
                {u.is_suspended && <span className="badge badge-rechazada">Suspendido</span>}
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
                      {u.is_suspended && (
                        <button onClick={() => unsuspend(u.id)} disabled={busyId === u.id}>
                          <ShieldOff size={15} /> Reactivar cuenta
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
      )}

      {tab === "Publicaciones" && (
        <section className="stack">
          <div className="admin-table">
            {exchanges.map((e) => (
              <div key={e.id} className="admin-table-row">
                <div className="admin-table-user">
                  <strong>{e.title}</strong>
                  <span>{e.category}</span>
                </div>
                <span className={`badge ${e.moderation_status === "Aprobado" ? "badge-aceptada" : e.moderation_status === "Rechazado" ? "badge-rechazada" : "badge-pendiente"}`}>
                  {e.moderation_status}
                </span>
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
      )}

      {tab === "Resumen" && (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <h3>Elegí una pestaña para ver el detalle</h3>
          <p>Moderación y Reportes muestran lo pendiente de revisar.</p>
        </div>
      )}
    </div>
  );
}
