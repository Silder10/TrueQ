import { useState } from "react";
import { Heart, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { api, uploadUrl } from "../api/client";
import "./ExchangeCard.css";

const CATEGORY_ICON = {
  Materiales: "🧱",
  Bienes: "📦",
  Servicios: "🛠",
};

export function ExchangeCard({ exchange, showFavorite = true }) {
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
    <Link to={`/exchanges/${exchange.id}`} className="exchange-card">
      <div className="exchange-card-image">
        <img src={uploadUrl(exchange.image)} alt="" loading="lazy" />
        <span className="exchange-card-category-badge">
          {CATEGORY_ICON[exchange.category]} {exchange.category}
        </span>
        {showFavorite && (
          <button
            type="button"
            className={`favorite-btn ${favorited ? "favorite-btn-active" : ""}`}
            onClick={toggleFavorite}
            disabled={busy}
            aria-label={favorited ? "Quitar de favoritos" : "Guardar en favoritos"}
          >
            <Heart size={18} fill={favorited ? "currentColor" : "none"} />
          </button>
        )}
      </div>
      <div className="exchange-card-body">
        <h3>{exchange.title}</h3>

        <div className="exchange-card-terms">
          <div>
            <span className="exchange-card-label">Ofrece</span>
            <span>{exchange.offers}</span>
          </div>
          <div>
            <span className="exchange-card-label">Busca</span>
            <span>{exchange.seeks}</span>
          </div>
        </div>

        <div className="exchange-card-footer">
          {exchange.distance_km != null ? (
            <span className="exchange-card-meta">
              <MapPin size={13} /> A {exchange.distance_km} km de ti
            </span>
          ) : (
            exchange.owner?.city && (
              <span className="exchange-card-meta">
                <MapPin size={13} /> {exchange.owner.city}
              </span>
            )
          )}
          {exchange.owner && <span className="exchange-card-meta">👤 {exchange.owner.username}</span>}
        </div>
      </div>
    </Link>
  );
}
