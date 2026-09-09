import { useEffect, useState } from "react";
import {
  Bell,
  Heart,
  History,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  PlusCircle,
  Search,
  Settings,
  Shield,
  User,
  X,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api, uploadUrl } from "../api/client";
import "./AppLayout.css";

const PRIMARY_LINKS = [
  { to: "/exchanges", label: "Explorar", icon: Home },
  { to: "/create-exchange", label: "Publicar", icon: PlusCircle },
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
      api.get("/api/notifications/unread-count").then((data) => setUnreadCount(data.count)).catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 20000); // cada 20s, sin websockets todavía
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
          <NavLink to="/exchanges" className="wordmark">
            <span className="wordmark-icon">🔄</span> TrueQ
          </NavLink>

          {user && (
            <>
              <nav className="app-navbar">
                {PRIMARY_LINKS.map(({ to, label, icon: Icon }) => (
                  <NavLink key={to} to={to} className="app-navbar-link" end={to === "/exchanges"}>
                    <Icon size={17} /> {label}
                  </NavLink>
                ))}
              </nav>

              <div className="app-header-actions">
                <div className="app-location">📍 {user.city || "Sin ubicación"}</div>

                <NavLink to="/notifications" className="icon-btn notification-bell" aria-label="Notificaciones">
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
                  )}
                </NavLink>
                <NavLink to={`/profile/${user.id}`} className="avatar-link">
                  <img src={uploadUrl(user.avatar)} alt="" className="avatar-thumb" />
                </NavLink>
                <button className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="Más opciones">
                  <Menu size={22} />
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {menuOpen && (
        <div className="drawer-overlay" onClick={() => setMenuOpen(false)}>
          <nav className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <span className="wordmark">🔄 TrueQ</span>
              <button className="icon-btn" onClick={() => setMenuOpen(false)} aria-label="Cerrar">
                <X size={20} />
              </button>
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
        <nav className="bottom-nav">
          <NavLink to="/exchanges" className="bottom-nav-link" end>
            <Home size={22} />
            <span>Inicio</span>
          </NavLink>
          <NavLink to="/exchanges" className="bottom-nav-link">
            <Search size={22} />
            <span>Explorar</span>
          </NavLink>
          <NavLink to="/create-exchange" className="bottom-nav-link bottom-nav-cta">
            <PlusCircle size={26} />
          </NavLink>
          <NavLink to="/conversations" className="bottom-nav-link">
            <MessageCircle size={22} />
            <span>Chats</span>
          </NavLink>
          <NavLink to={`/profile/${user.id}`} className="bottom-nav-link">
            <User size={22} />
            <span>Perfil</span>
          </NavLink>
        </nav>
      )}
    </div>
  );
}
