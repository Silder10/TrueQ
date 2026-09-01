import { useEffect, useState } from "react";
import { api } from "../api/client";
import "./RequestsPage.css";

const STATUS_STYLES = {
  Pendiente: { background: "#fdf3e3", color: "#8a6116" },
  Aceptada: { background: "#eaf5ee", color: "var(--success)" },
  Rechazada: { background: "#fbeaea", color: "var(--danger)" },
};

export function RequestsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    setLoading(true);
    api
      .get("/api/exchanges/requests")
      .then((data) => setItems(data.items))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const resolve = async (requestId, action) => {
    setBusyId(requestId);
    try {
      await api.post(`/api/exchanges/requests/${requestId}/${action}`);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="stack">
      <div>
        <h1>Solicitudes recibidas</h1>
        <p>Gente interesada en tus publicaciones.</p>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      {loading ? (
        <p>Cargando…</p>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <h3>Todavía no tienes solicitudes</h3>
          <p>Cuando alguien pida uno de tus intercambios, aparecerá aquí.</p>
        </div>
      ) : (
        <div className="stack">
          {items.map((r) => (
            <div key={r.id} className="request-row">
              <div>
                <strong>{r.requester?.username}</strong> solicitó{" "}
                <em>{r.exchange?.title}</em>
                <div>
                  <span
                    className="status-badge"
                    style={STATUS_STYLES[r.status] || {}}
                  >
                    {r.status}
                  </span>
                </div>
              </div>

              {r.status === "Pendiente" && (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    className="btn btn-primary"
                    disabled={busyId === r.id}
                    onClick={() => resolve(r.id, "accept")}
                  >
                    Aceptar
                  </button>
                  <button
                    className="btn btn-danger"
                    disabled={busyId === r.id}
                    onClick={() => resolve(r.id, "reject")}
                  >
                    Rechazar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
