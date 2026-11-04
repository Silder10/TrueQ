import { useEffect, useState } from "react";
import { api } from "../api/client";
import "./RequestsPage.css";

export function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    api
      .get("/api/notifications")
      .then((data) => {
        setItems(data.items);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.post("/api/notifications/read-all").catch(() => {});
  }, []);

  return (
    <div className="stack">
      <div>
        <h1>🔔 Notificaciones</h1>
        <p>Lo que pasó mientras no estabas.</p>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      {loading ? (
        <p>Cargando…</p>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔔</div>
          <h3>Sin notificaciones</h3>
          <p>Te avisamos acá cuando alguien interactúe con tus publicaciones.</p>
        </div>
      ) : (
        <div className="stack" style={{ gap: "6px" }}>
          {items.map((n) => (
            <div key={n.id} className={`request-row ${n.is_read ? "" : "notification-unread"}`}>
              <div>{n.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
