import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Bell, BellOff, Image as ImageIcon, MoreVertical, Send, ShieldOff, UserX } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { api, uploadUrl } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { getSocket } from "../api/socket";
import "./ChatPage.css";
import "./AdminPage.css";

export function ChatPage() {
  const { userId } = useParams();
  const { user } = useAuth();
  const [otherUser, setOtherUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const bottomRef = useRef(null);

  const load = () => {
    api
      .get(`/api/chat/${userId}`)
      .then((data) => {
        setOtherUser(data.other_user);
        setMessages(data.messages);
        setIsBlocked(data.is_blocked);
        setIsMuted(data.is_muted);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [userId]);

  // Tiempo real: nos unimos a la sala de esta conversación y escuchamos
  // mensajes nuevos sin tener que recargar (RF09).
  useEffect(() => {
    const socket = getSocket();
    socket.emit("join_conversation", { other_user_id: Number(userId) });

    const handleNewMessage = (message) => {
      const belongsHere =
        (message.sender_id === Number(userId) && message.receiver_id === user.id) ||
        (message.sender_id === user.id && message.receiver_id === Number(userId));
      if (belongsHere) {
        setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      }
    };

    socket.on("new_message", handleNewMessage);

    return () => {
      socket.emit("leave_conversation", { other_user_id: Number(userId) });
      socket.off("new_message", handleNewMessage);
    };
  }, [userId, user.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!content.trim() && !image) return;
    setSending(true);
    setError(null);
    try {
      if (image) {
        const formData = new FormData();
        if (content.trim()) formData.append("content", content.trim());
        formData.append("image", image);
        await api.postForm(`/api/chat/${userId}`, formData);
      } else {
        await api.post(`/api/chat/${userId}`, { content: content.trim() });
      }
      setContent("");
      setImage(null);
      // No recargamos toda la lista: el propio socket nos va a traer este
      // mensaje por 'new_message'. Igual refrescamos por si el socket
      // todavía no conectó (fallback).
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const toggleMute = async () => {
    setMenuOpen(false);
    try {
      if (isMuted) {
        await api.delete(`/api/chat/${userId}/mute`);
        setIsMuted(false);
      } else {
        await api.post(`/api/chat/${userId}/mute`);
        setIsMuted(true);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleBlock = async () => {
    setMenuOpen(false);
    try {
      if (isBlocked) {
        await api.delete(`/api/users/${userId}/block`);
        setIsBlocked(false);
      } else {
        await api.post(`/api/users/${userId}/block`);
        setIsBlocked(true);
      }
    } catch (err) {
      setError(err.message);
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
        <div className="admin-menu-wrap" style={{ marginLeft: "auto" }}>
          <button className="icon-btn" onClick={() => setMenuOpen((v) => !v)} aria-label="Más opciones">
            <MoreVertical size={18} />
          </button>
          {menuOpen && (
            <div className="admin-menu">
              <button onClick={toggleMute}>
                {isMuted ? <Bell size={15} /> : <BellOff size={15} />}
                {isMuted ? "Reactivar notificaciones" : "Silenciar conversación"}
              </button>
              <button className="admin-menu-danger" onClick={toggleBlock}>
                {isBlocked ? <ShieldOff size={15} /> : <UserX size={15} />}
                {isBlocked ? "Desbloquear" : "Bloquear usuario"}
              </button>
            </div>
          )}
        </div>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      <div className="chat-messages">
        {messages.map((m) => (
          <div key={m.id} className={`chat-bubble ${m.sender_id === user.id ? "chat-bubble-mine" : ""}`}>
            {m.image && <img src={uploadUrl(m.image)} alt="Evidencia" className="chat-bubble-image" />}
            {m.content && <div>{m.content}</div>}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {isBlocked ? (
        <div className="banner banner-error" style={{ margin: "0.5rem" }}>
          Bloqueaste a este usuario. Desbloqueá para poder seguir chateando.
        </div>
      ) : (
        <form onSubmit={handleSend} className="chat-input-row">
          <label className="icon-btn" style={{ cursor: "pointer" }}>
            <ImageIcon size={20} />
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              hidden
              onChange={(e) => setImage(e.target.files?.[0] || null)}
            />
          </label>
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={image ? `Imagen lista: ${image.name}` : "Escribe un mensaje…"}
            autoFocus
          />
          <button type="submit" className="btn btn-primary btn-icon" disabled={sending} aria-label="Enviar">
            {sending ? <span className="spinner" /> : <Send size={18} />}
          </button>
        </form>
      )}
    </div>
  );
}
