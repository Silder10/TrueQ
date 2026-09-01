import { useState } from "react";
import { Link } from "react-router-dom";
import { api, uploadUrl } from "../api/client";
import "./ExchangeCard.css";

const CATEGORY_COLORS = {
  Hogar: "var(--accent)",
  Deportes: "var(--brand)",
  Música: "var(--accent-2)",
  Libros: "var(--brand)",
  Ropa: "var(--accent)",
  Tecnología: "var(--accent-2)",
};

export function ExchangeCard({ exchange, showFavorite = true }) {
  const borderColor = CATEGORY_COLORS[exchange.category] || "var(--ink)";
  const [favorited, setFavorited] = useState(Boolean(exchange.favorited));
  const [busy, setBusy] = useState(false);

  const toggleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    try {
      const data = await api.post(`/api/favorites/${exchange.id}`);
      setFavorited(data.favorited);
    } catch {
      // silencioso: no bloqueamos la navegación por un fallo al marcar favorito
    } finally {
      setBusy(false);
    }
  };

  return (
    <Link to={`/exchanges/${exchange.id}`} className="exchange-card" style={{ borderLeftColor: borderColor }}>
      <div className="exchange-card-image">
        <img src={uploadUrl(exchange.image)} alt="" loading="lazy" />
      </div>
      <div className="exchange-card-body">
        <div className="exchange-card-top">
          <span className="exchange-card-category">{exchange.category}</span>
          {showFavorite && (
            <button
              type="button"
              className={`favorite-btn ${favorited ? "favorite-btn-active" : ""}`}
              onClick={toggleFavorite}
              disabled={busy}
              aria-label={favorited ? "Quitar de favoritos" : "Guardar en favoritos"}
            >
              ♥
            </button>
          )}
        </div>
        <h3>{exchange.title}</h3>
        <p className="exchange-card-desc">{exchange.description}</p>
        {exchange.owner && <span className="exchange-card-owner">por {exchange.owner.username}</span>}
      </div>
    </Link>
  );
}
