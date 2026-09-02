import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { api, uploadUrl } from "../api/client";
import { useAuth } from "../context/AuthContext";
import "./ChatPage.css";

export function ChatPage() {
  const { userId } = useParams();
  const { user } = useAuth();
  const [otherUser, setOtherUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const load = () => {
    api
      .get(`/api/chat/${userId}`)
      .then((data) => {
        setOtherUser(data.other_user);
        setMessages(data.messages);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    setError(null);
    try {
      await api.post(`/api/chat/${userId}`, { content: content.trim() });
      setContent("");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <p>Cargando…</p>;

  return (
    <div className="chat-screen">
      <div className="chat-header">
        <Link to="/conversations" className="icon-btn">
          <ArrowLeft size={20} />
        </Link>
        {otherUser && <img src={uploadUrl(otherUser.avatar)} alt="" className="chat-header-avatar" />}
        <h2>{otherUser?.username}</h2>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      <div className="chat-messages">
        {messages.map((m) => (
          <div key={m.id} className={`chat-bubble ${m.sender_id === user.id ? "chat-bubble-mine" : ""}`}>
            {m.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="chat-input-row">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escribe un mensaje…"
          autoFocus
        />
        <button type="submit" className="btn btn-primary btn-icon" disabled={sending} aria-label="Enviar">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
