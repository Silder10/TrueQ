import { useEffect, useState } from "react";
import { ExchangeCard } from "../components/ExchangeCard";
import { api } from "../api/client";
import "./ExchangesPage.css";

export function FavoritesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/api/favorites")
      .then((data) => setItems(data.items))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="stack">
      <div>
        <h1>Favoritos</h1>
        <p>Lo que guardaste para más adelante.</p>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      {loading ? (
        <p>Cargando…</p>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <h3>Aún no guardaste nada</h3>
          <p>Marca el corazón en cualquier publicación para verla acá.</p>
        </div>
      ) : (
        <div className="exchanges-grid">
          {items.map((f) => (
            <ExchangeCard key={f.id} exchange={f.exchange} />
          ))}
        </div>
      )}
    </div>
  );
}
