import { useEffect, useState } from "react";
import { api } from "../api/client";
import { ExchangeCard } from "../components/ExchangeCard";
import "./ExchangesPage.css";

const CATEGORIES = ["Hogar", "Deportes", "Música", "Libros", "Ropa", "Tecnología"];

export function ExchangesPage() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);

    setLoading(true);
    const timeout = setTimeout(() => {
      api
        .get(`/api/exchanges?${params.toString()}`)
        .then((data) => setItems(data.items))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }, 250); // debounce simple para no golpear la API en cada tecla

    return () => clearTimeout(timeout);
  }, [search, category]);

  return (
    <div className="stack">
      <div className="exchanges-header">
        <div>
          <h1>Explorar</h1>
          <p>Lo que otros ya no usan, listo para intercambiar.</p>
        </div>
      </div>

      <div className="exchanges-filters">
        <input
          type="search"
          placeholder="Buscar por título…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="exchanges-search"
        />
        <div className="exchanges-categories">
          <button
            className={`chip ${category === "" ? "chip-active" : ""}`}
            onClick={() => setCategory("")}
          >
            Todas
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={`chip ${category === c ? "chip-active" : ""}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      {loading ? (
        <p>Cargando…</p>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <h3>No hay nada por aquí todavía</h3>
          <p>Prueba con otra categoría, o sé el primero en publicar algo.</p>
        </div>
      ) : (
        <div className="exchanges-grid">
          {items.map((exchange) => (
            <ExchangeCard key={exchange.id} exchange={exchange} />
          ))}
        </div>
      )}
    </div>
  );
}
