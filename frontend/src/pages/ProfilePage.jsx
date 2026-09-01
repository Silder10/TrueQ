import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, uploadUrl } from "../api/client";
import { useAuth } from "../context/AuthContext";

export function ProfilePage() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get(`/api/users/${id}`)
      .then((data) => setProfile(data.user))
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) return <div className="banner banner-error">{error}</div>;
  if (!profile) return <p>Cargando…</p>;

  const isSelf = currentUser?.id === profile.id;

  return (
    <div className="stack" style={{ maxWidth: 480 }}>
      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <img
          src={uploadUrl(profile.avatar)}
          alt=""
          style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover" }}
        />
        <div>
          <h1 style={{ marginBottom: 0 }}>{profile.username}</h1>
          {profile.is_private && !isSelf && <span className="field-hint">Perfil privado</span>}
        </div>
      </div>

      {profile.bio && <p>{profile.bio}</p>}

      {!isSelf && (
        <button className="btn btn-primary" onClick={() => navigate(`/chat/${profile.id}`)}>
          Enviar mensaje
        </button>
      )}
    </div>
  );
}
