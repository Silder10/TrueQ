import { useEffect, useState } from "react";
import { Package, Search, Wrench, Boxes, MapPin } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ExchangeCard } from "../components/ExchangeCard";
import "./ExchangesPage.css";

const CATEGORIES = [
  { value: "Materiales", icon: Boxes },
  { value: "Bienes", icon: Package },
  { value: "Servicios", icon: Wrench },
];

export function ExchangesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [nearby, setNearby] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (nearby) params.set("nearby", "true");

    setLoading(true);
    const timeout = setTimeout(() => {
      api
        .get(`/api/exchanges?${params.toString()}`)
        .then((data) => setItems(data.items))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }, 250);

    return () => clearTimeout(timeout);
  }, [search, category, nearby]);

  return (
    <div className="stack">
      <section className="explore-hero">
        <h1>Hola, {user?.username} 👋</h1>
        <p>Encuentra intercambios que podrían interesarte.</p>

        <div className="search-bar">
          <Search size={20} />
          <input
            type="search"
            placeholder="¿Qué estás buscando intercambiar?"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="category-row">
          <button
            className={`chip ${category === "" ? "chip-active" : ""}`}
            onClick={() => setCategory("")}
          >
            Todas
          </button>
          {CATEGORIES.map(({ value, icon: Icon }) => (
            <button
              key={value}
              className={`chip ${category === value ? "chip-active" : ""}`}
              onClick={() => setCategory(value)}
            >
              <Icon size={15} /> {value}
            </button>
          ))}
          <button className={`chip ${nearby ? "chip-active" : ""}`} onClick={() => setNearby((v) => !v)}>
            <MapPin size={15} /> Cerca de mí
          </button>
        </div>
      </section>

      {error && <div className="banner banner-error">{error}</div>}

      {!loading && items.length > 0 && (
        <h2 className="explore-results-title">
          {category || "Todas las categorías"} · {items.length} publicación{items.length === 1 ? "" : "es"}
        </h2>
      )}

      {loading ? (
        <div className="exchanges-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-card" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
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
