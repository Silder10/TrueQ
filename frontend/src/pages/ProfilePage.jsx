import { useEffect, useState } from "react";
import { MapPin, Star } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { api, uploadUrl } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ExchangeCard } from "../components/ExchangeCard";
import "./ProfilePage.css";

const TABS = ["Intercambios", "Reseñas"];

export function ProfilePage() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("Intercambios");
  const [exchanges, setExchanges] = useState([]);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    api
      .get(`/api/users/${id}`)
      .then((data) => setProfile(data.user))
      .catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    if (tab === "Intercambios") {
      api
        .get(`/api/exchanges?owner_id=${id}`)
        .then((data) => setExchanges(data.items || []))
        .catch(() => setExchanges([]));
    } else {
      api
        .get(`/api/users/${id}/reviews`)
        .then((data) => setReviews(data.items || []))
        .catch(() => setReviews([]));
    }
  }, [tab, id]);

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!profile) return <p>Cargando…</p>;

  const isSelf = currentUser?.id === profile.id;

  return (
    <div className="stack">
      <div className="profile-header card">
        <img src={uploadUrl(profile.avatar)} alt="" className="profile-avatar" />
        <div className="profile-header-info">
          <h1>{profile.username}</h1>
          <div className="profile-meta">
            {profile.city && (
              <span>
                <MapPin size={14} /> {profile.city}
              </span>
            )}
            {profile.average_rating && (
              <span>
                <Star size={14} fill="currentColor" /> {profile.average_rating} ({profile.reviews_count})
              </span>
            )}
          </div>
          {profile.bio && <p>{profile.bio}</p>}
        </div>

        {isSelf ? (
          <button className="btn btn-outline" onClick={() => navigate("/settings")}>
            Editar perfil
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => navigate(`/chat/${profile.id}`)}>
            Enviar mensaje
          </button>
        )}
      </div>

      <div className="profile-tabs">
        {TABS.map((t) => (
          <button key={t} className={`profile-tab ${tab === t ? "profile-tab-active" : ""}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Intercambios" ? (
        exchanges.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <h3>Todavía no publicó nada</h3>
          </div>
        ) : (
          <div className="exchanges-grid">
            {exchanges.map((e) => (
              <ExchangeCard key={e.id} exchange={e} showFavorite={!isSelf} />
            ))}
          </div>
        )
      ) : reviews.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⭐</div>
          <h3>Sin reseñas todavía</h3>
        </div>
      ) : (
        <div className="stack" style={{ gap: "8px" }}>
          {reviews.map((r) => (
            <div key={r.id} className="review-row card">
              <img src={uploadUrl(r.reviewer?.avatar)} alt="" className="review-avatar" />
              <div>
                <div className="review-row-header">
                  <strong>{r.reviewer?.username}</strong>
                  <span className="rating-inline">
                    {"★".repeat(r.rating)}
                    {"☆".repeat(5 - r.rating)}
                  </span>
                </div>
                {r.comment && <p>{r.comment}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
