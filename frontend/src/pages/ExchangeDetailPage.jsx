import { useEffect, useState } from "react";
import { ArrowLeft, MapPin, MessageCircle, Repeat, Star } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, uploadUrl } from "../api/client";
import { useAuth } from "../context/AuthContext";
import "./ExchangeDetailPage.css";

const CATEGORY_ICON = { Materiales: "🧱", Bienes: "📦", Servicios: "🛠" };

export function ExchangeDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [exchange, setExchange] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requestState, setRequestState] = useState("idle");

  useEffect(() => {
    api
      .get(`/api/exchanges/${id}`)
      .then((data) => setExchange(data.exchange))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const isOwner = exchange && user && exchange.owner_id === user.id;

  const handleRequest = async () => {
    setRequestState("sending");
    setError(null);
    try {
      await api.post(`/api/exchanges/${id}/request`);
      setRequestState("sent");
    } catch (err) {
      setError(err.message);
      setRequestState("idle");
    }
  };

  if (loading) return <p>Cargando…</p>;
  if (!exchange) return <div className="banner banner-error">No se encontró esta publicación.</div>;

  return (
    <div className="exchange-detail">
      <Link to="/exchanges" className="back-link">
        <ArrowLeft size={16} /> Volver a explorar
      </Link>

      <div className="exchange-detail-grid">
        <div className="exchange-detail-image">
          <img src={uploadUrl(exchange.image)} alt="" />
        </div>

        <div className="card exchange-detail-info">
          <span className="badge badge-disponible">
            {CATEGORY_ICON[exchange.category]} {exchange.category}
          </span>
          <h1>{exchange.title}</h1>

          <div className="exchange-detail-terms">
            <div>
              <span className="exchange-card-label">Ofrece</span>
              <p>{exchange.offers}</p>
            </div>
            <div>
              <span className="exchange-card-label">Busca</span>
              <p>{exchange.seeks}</p>
            </div>
          </div>

          {exchange.description && <p className="exchange-detail-desc">{exchange.description}</p>}

          {exchange.owner && (
            <Link to={`/profile/${exchange.owner.id}`} className="exchange-detail-owner">
              <img src={uploadUrl(exchange.owner.avatar)} alt="" />
              <div>
                <strong>{exchange.owner.username}</strong>
                {exchange.owner.average_rating && (
                  <span className="rating-inline">
                    <Star size={13} fill="currentColor" /> {exchange.owner.average_rating}
                  </span>
                )}
                {exchange.owner.city && (
                  <span className="exchange-card-meta">
                    <MapPin size={12} /> {exchange.owner.city}
                  </span>
                )}
              </div>
            </Link>
          )}

          {error && <div className="banner banner-error">{error}</div>}

          {isOwner ? (
            <p className="field-hint">Esta es tu publicación.</p>
          ) : (
            <div className="exchange-detail-actions">
              {requestState === "sent" ? (
                <div className="banner banner-success">Solicitud enviada — seguí la charla en Mensajes.</div>
              ) : (
                <button className="btn btn-primary" onClick={handleRequest} disabled={requestState === "sending"}>
                  {requestState === "sending" ? (
                    <span className="spinner" />
                  ) : (
                    <>
                      <Repeat size={17} /> Solicitar intercambio
                    </>
                  )}
                </button>
              )}
              <button className="btn btn-outline" onClick={() => navigate(`/chat/${exchange.owner.id}`)}>
                <MessageCircle size={17} /> Iniciar chat
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
