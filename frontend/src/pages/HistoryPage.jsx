import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { Link } from "react-router-dom";
import { api, uploadUrl } from "../api/client";
import "./HistoryPage.css";

export function HistoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/api/exchanges/history")
      .then((data) => setItems(data.items))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="stack">
      <div>
        <h1>📜 Historial de intercambios</h1>
        <p>Trueques que ya completaste. Los pendientes o cancelados no aparecen acá.</p>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      {loading ? (
        <p>Cargando…</p>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <h3>Todavía no completaste ningún intercambio</h3>
          <p>Cuando termines uno, va a aparecer acá con la fecha y con quién lo hiciste.</p>
        </div>
      ) : (
        <div className="stack" style={{ gap: "8px" }}>
          {items.map((item) => (
            <div key={item.exchange_id} className="history-row card">
              <img src={uploadUrl(item.image)} alt="" className="history-image" />
              <div className="history-info">
                <strong>{item.title}</strong>
                <span className="exchange-card-terms">
                  {item.offers} ↔ {item.seeks}
                </span>
                <span className="field-hint">
                  {new Date(item.created_at).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
                </span>
              </div>
              {item.other_participant && (
                <div className="history-participant">
                  <img src={uploadUrl(item.other_participant.avatar)} alt="" />
                  <div>
                    <Link to={`/profile/${item.other_participant.id}`}>{item.other_participant.username}</Link>
                    {item.other_participant.average_rating && (
                      <span className="rating-inline">
                        <Star size={12} fill="currentColor" /> {item.other_participant.average_rating}
                      </span>
                    )}
                  </div>
                </div>
              )}
              <span className="badge badge-completado">Completado</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
