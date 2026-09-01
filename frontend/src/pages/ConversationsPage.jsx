import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, uploadUrl } from "../api/client";
import "./ConversationsPage.css";

export function ConversationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/api/conversations")
      .then((data) => setItems(data.items))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="stack">
      <div>
        <h1>Mensajes</h1>
        <p>Tus conversaciones sobre intercambios.</p>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      {loading ? (
        <p>Cargando…</p>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <h3>Sin conversaciones todavía</h3>
          <p>Escríbele al dueño de una publicación para empezar.</p>
        </div>
      ) : (
        <div className="stack">
          {items.map((u) => (
            <Link key={u.id} to={`/chat/${u.id}`} className="conversation-row">
              <img src={uploadUrl(u.avatar)} alt="" className="conversation-avatar" />
              <span>{u.username}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
