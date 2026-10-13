import { useEffect, useState } from "react";
import {
  Bell, Heart, History, Home, LogOut, Menu, MessageCircle,
  Plus, Search, Settings, Shield, User, X,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api, uploadUrl } from "../api/client";
import "./AppLayout.css";

const PRIMARY_LINKS = [
  { to: "/exchanges", label: "Explorar", icon: Search },
  { to: "/conversations", label: "Chats", icon: MessageCircle },
];

const SECONDARY_LINKS = [
  { to: "/favorites", label: "Favoritos", icon: Heart },
  { to: "/history", label: "Historial", icon: History },
  { to: "/requests", label: "Solicitudes", icon: Bell },
  { to: "/notifications", label: "Notificaciones", icon: Bell },
  { to: "/settings", label: "Configuración", icon: Settings },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchCount = () => {
      api.get("/api/notifications/unread-count")
        .then((data) => setUnreadCount(data.count))
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 20000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="container app-header-inner">
          <NavLink to="/exchanges" className="wordmark" aria-label="TrueQ, inicio">
            <span className="wordmark-mark">TQ</span>
            <span>TrueQ</span>
          </NavLink>

          {user && (
            <>
              <nav className="app-navbar" aria-label="Navegación principal">
                {PRIMARY_LINKS.map(({ to, label, icon: Icon }) => (
                  <NavLink key={to} to={to} className="app-navbar-link" end={to === "/exchanges"}>
                    <Icon size={17} strokeWidth={2} />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </nav>

              <div className="header-search">
                <Search size={17} aria-hidden="true" />
                <input aria-label="Buscar intercambios" placeholder="Buscar intercambios..." />
              </div>

              <div className="app-header-actions">
                <NavLink to="/notifications" className="icon-btn notification-bell" aria-label="Notificaciones">
                  <Bell size={19} />
                  {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
                  )}
                </NavLink>

                <NavLink to="/create-exchange" className="header-publish">
                  <Plus size={17} />
                  <span>Publicar</span>
                </NavLink>

                <NavLink to={`/profile/${user.id}`} className="avatar-link" aria-label="Mi perfil">
                  <img src={uploadUrl(user.avatar)} alt="" className="avatar-thumb" />
                </NavLink>

                <button className="icon-btn menu-trigger" onClick={() => setMenuOpen(true)} aria-label="Abrir menú">
                  <Menu size={20} />
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {menuOpen && (
        <div className="drawer-overlay" onClick={() => setMenuOpen(false)}>
          <nav className="drawer" onClick={(e) => e.stopPropagation()} aria-label="Menú de usuario">
            <div className="drawer-header">
              <span className="wordmark"><span className="wordmark-mark">TQ</span><span>TrueQ</span></span>
              <button className="icon-btn" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú">
                <X size={20} />
              </button>
            </div>

            <div className="drawer-profile">
              <img src={uploadUrl(user?.avatar)} alt="" className="drawer-avatar" />
              <div>
                <strong>{user?.username || "Mi cuenta"}</strong>
                <span>{user?.city || "Ubicación no definida"}</span>
              </div>
            </div>

            <div className="drawer-section">
              <NavLink to={`/profile/${user?.id}`} className="drawer-link" onClick={() => setMenuOpen(false)}>
                <User size={18} /> Mi perfil
              </NavLink>
              {SECONDARY_LINKS.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} className="drawer-link" onClick={() => setMenuOpen(false)}>
                  <Icon size={18} /> {label}
                </NavLink>
              ))}
              {user?.role === "admin" && (
                <NavLink to="/admin" className="drawer-link" onClick={() => setMenuOpen(false)}>
                  <Shield size={18} /> Administración
                </NavLink>
              )}
            </div>

            <button className="drawer-link drawer-logout" onClick={handleLogout}>
              <LogOut size={18} /> Cerrar sesión
            </button>
          </nav>
        </div>
      )}

      <main className="app-main">
        <div className="container">
          <Outlet />
        </div>
      </main>

      {user && (
        <nav className="bottom-nav" aria-label="Navegación móvil">
          <NavLink to="/exchanges" className="bottom-nav-link" end>
            <Home size={21} />
            <span>Inicio</span>
          </NavLink>
          <NavLink to="/exchanges" className="bottom-nav-link">
            <Search size={21} />
            <span>Explorar</span>
          </NavLink>
          <NavLink to="/create-exchange" className="bottom-nav-link bottom-nav-cta" aria-label="Publicar intercambio">
            <Plus size={25} />
          </NavLink>
          <NavLink to="/conversations" className="bottom-nav-link">
            <MessageCircle size={21} />
            <span>Chats</span>
          </NavLink>
          <NavLink to={`/profile/${user.id}`} className="bottom-nav-link">
            <User size={21} />
            <span>Perfil</span>
          </NavLink>
        </nav>
      )}
    </div>
  );
}
