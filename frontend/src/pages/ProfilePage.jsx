import { useEffect, useState } from "react";
import { Flag, MapPin, Star, UserX } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { api, uploadUrl } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ExchangeCard } from "../components/ExchangeCard";
import { ReportModal } from "../components/ReportModal";
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
  const [showReport, setShowReport] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);

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

  const toggleBlock = async () => {
    setBlockBusy(true);
    try {
      if (blocked) {
        await api.delete(`/api/users/${profile.id}/block`);
        setBlocked(false);
      } else {
        await api.post(`/api/users/${profile.id}/block`);
        setBlocked(true);
      }
    } catch {
      // silencioso
    } finally {
      setBlockBusy(false);
    }
  };

  return (
    <div className="stack">
      <div className="profile-header card">
        <div className="profile-header-top">
          <img src={uploadUrl(profile.avatar)} alt="" className="profile-avatar" />
          <div className="profile-header-info">
            <h1>{profile.username}</h1>
            <div className="profile-meta">
              {profile.city && (
                <span className="profile-meta-badge">
                  <MapPin size={13} /> {profile.city}
                </span>
              )}
              {profile.average_rating && (
                <span className="profile-meta-badge profile-meta-rating">
                  <Star size={13} fill="currentColor" /> {profile.average_rating} ({profile.reviews_count})
                </span>
              )}
            </div>
            {profile.bio && <p>{profile.bio}</p>}
          </div>
        </div>

        <div className="profile-header-actions">
          {isSelf ? (
            <button className="btn btn-outline" onClick={() => navigate("/settings")}>
              Editar perfil
            </button>
          ) : (
            <>
              <button className="btn btn-primary" onClick={() => navigate(`/chat/${profile.id}`)}>
                Enviar mensaje
              </button>
              <button className="btn btn-outline btn-icon" onClick={() => setShowReport(true)} aria-label="Reportar">
                <Flag size={16} />
              </button>
              <button
                className={`btn btn-icon ${blocked ? "btn-danger" : "btn-outline"}`}
                onClick={toggleBlock}
                disabled={blockBusy}
                aria-label={blocked ? "Desbloquear" : "Bloquear"}
              >
                <UserX size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {showReport && (
        <ReportModal targetType="usuario" targetId={profile.id} onClose={() => setShowReport(false)} />
      )}

      <div className="segmented-control">
        {TABS.map((t) => (
          <button key={t} className={`segmented-option ${tab === t ? "segmented-option-active" : ""}`} onClick={() => setTab(t)}>
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
