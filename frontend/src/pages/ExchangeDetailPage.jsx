import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, uploadUrl } from "../api/client";
import { useAuth } from "../context/AuthContext";
import "./ExchangeDetailPage.css";

export function ExchangeDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [exchange, setExchange] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requestState, setRequestState] = useState("idle"); // idle | sending | sent

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
        ← Volver a explorar
      </Link>

      <div className="exchange-detail-grid">
        <div className="exchange-detail-image">
          <img src={uploadUrl(exchange.image)} alt="" />
        </div>

        <div>
          <span className="exchange-detail-category">{exchange.category}</span>
          <h1>{exchange.title}</h1>
          <p className="exchange-detail-desc">{exchange.description}</p>

          {exchange.owner && (
            <p className="exchange-detail-owner">
              Publicado por <Link to={`/profile/${exchange.owner.id}`}>{exchange.owner.username}</Link>
            </p>
          )}

          {error && <div className="banner banner-error">{error}</div>}

          {isOwner ? (
            <p className="field-hint">Esta es tu publicación.</p>
          ) : requestState === "sent" ? (
            <div className="banner banner-success">
              Solicitud enviada. Puedes seguir la conversación desde Mensajes.
            </div>
          ) : (
            <button className="btn btn-primary" onClick={handleRequest} disabled={requestState === "sending"}>
              {requestState === "sending" ? <span className="spinner" /> : "Solicitar intercambio"}
            </button>
          )}

          {!isOwner && exchange.owner && (
            <button
              className="btn btn-outline"
              style={{ marginLeft: "0.6rem" }}
              onClick={() => navigate(`/chat/${exchange.owner.id}`)}
            >
              Enviar mensaje
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
