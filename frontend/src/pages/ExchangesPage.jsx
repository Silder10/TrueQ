import { useEffect, useState } from "react";
import { Package, Search, Wrench, Boxes, MapPin, Plus } from "lucide-react";
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
  const [radiusKm, setRadiusKm] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (nearby) {
      params.set("nearby", "true");
      params.set("radius_km", String(radiusKm));
    }

    setLoading(true);
    const timeout = setTimeout(() => {
      api
        .get(`/api/exchanges?${params.toString()}`)
        .then((data) => {
          setItems(data.items);
          setError(null);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }, 250);

    return () => clearTimeout(timeout);
  }, [search, category, nearby, radiusKm]);

  return (
    <div className="stack">
      <section className="explore-hero">
        <div className="explore-hero-copy">
          <div>
            <span className="explore-eyebrow">TrueQ · Intercambios</span>
            <h1>Hola, {user?.username} 👋</h1>
            <p>Encuentra algo que necesitas o descubre quién puede necesitar lo que tú tienes.</p>
          </div>
          <a className="explore-publish-btn" href="/create-exchange"><Plus size={17} /> Publicar intercambio</a>
        </div>
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

        {nearby && (
          <div className="radius-control">
            <label htmlFor="radius-range">Radio de búsqueda: {radiusKm} km</label>
            <input
              id="radius-range"
              type="range"
              min={1}
              max={200}
              step={1}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
            />
          </div>
        )}
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
