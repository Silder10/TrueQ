import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle, MapPin, MessageCircle, Repeat, Star } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, uploadUrl } from "../api/client";
import { useAuth } from "../context/AuthContext";
import "./ExchangeDetailPage.css";

const CATEGORY_ICON = { Materiales: "🧱", Bienes: "📦", Servicios: "🛠" };

function ReviewForm({ exchangeId, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Elegí una calificación de 1 a 5 estrellas.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/api/exchanges/${exchangeId}/reviews`, { rating, comment: comment.trim() || undefined });
      onSubmitted();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="review-form card">
      <h3>Deja tu reseña</h3>
      {error && <div className="banner banner-error">{error}</div>}
      <div className="star-picker">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className="star-picker-btn"
            onMouseEnter={() => setHoverRating(n)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(n)}
            aria-label={`${n} estrellas`}
          >
            <Star size={26} fill={n <= (hoverRating || rating) ? "currentColor" : "none"} />
          </button>
        ))}
      </div>
      <textarea
        rows={3}
        placeholder="Contá cómo te fue con el intercambio (opcional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? <span className="spinner" /> : "Enviar reseña"}
      </button>
    </form>
  );
}

export function ExchangeDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [exchange, setExchange] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requestState, setRequestState] = useState("idle");
  const [myRequests, setMyRequests] = useState([]);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [completing, setCompleting] = useState(false);

  const load = () => {
    api
      .get(`/api/exchanges/${id}`)
      .then((data) => setExchange(data.exchange))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  // Para saber si YO tengo una solicitud aceptada acá (y por lo tanto puedo
  // dejar reseña), revisamos mis solicitudes salientes. No hay un endpoint
  // dedicado a "mis solicitudes enviadas" todavía, así que lo inferimos
  // intentando el POST de reseña solo cuando corresponde mostrarlo: en vez
  // de adivinar en el front, dejamos que el backend sea la autoridad y
  // mostramos el formulario siempre que no seas el dueño; si no calificás
  // en una posición válida, el backend responde 403 con mensaje claro.
  const isOwner = exchange && user && exchange.owner_id === user.id;
  const canShowReviewForm = exchange && !isOwner && exchange.status !== "Cancelado";

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

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const data = await api.post(`/api/exchanges/${id}/complete`);
      setExchange(data.exchange);
    } catch (err) {
      setError(err.message);
    } finally {
      setCompleting(false);
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
                {exchange.distance_km != null ? (
                  <span className="exchange-card-meta">
                    <MapPin size={12} /> A {exchange.distance_km} km de ti
                  </span>
                ) : (
                  exchange.owner.city && (
                    <span className="exchange-card-meta">
                      <MapPin size={12} /> {exchange.owner.city}
                    </span>
                  )
                )}
              </div>
            </Link>
          )}

          {error && <div className="banner banner-error">{error}</div>}

          {isOwner ? (
            <div className="exchange-detail-actions">
              <p className="field-hint">Esta es tu publicación.</p>
              {exchange.status !== "Completado" && (
                <button className="btn btn-outline" onClick={handleComplete} disabled={completing}>
                  {completing ? <span className="spinner" /> : <><CheckCircle size={16} /> Marcar como completado</>}
                </button>
              )}
            </div>
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

      {canShowReviewForm && (
        reviewSubmitted ? (
          <div className="banner banner-success">¡Gracias por tu reseña!</div>
        ) : (
          <ReviewForm exchangeId={id} onSubmitted={() => setReviewSubmitted(true)} />
        )
      )}
    </div>
  );
}
