import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./AppLayout.css";

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="container app-header-inner">
          <NavLink to="/exchanges" className="wordmark">
            TRUEQ
          </NavLink>

          {user && (
            <nav className="app-nav">
              <NavLink to="/exchanges" className="app-nav-link">
                Explorar
              </NavLink>
              <NavLink to="/create-exchange" className="app-nav-link">
                Publicar
              </NavLink>
              <NavLink to="/requests" className="app-nav-link">
                Solicitudes
              </NavLink>
              <NavLink to="/favorites" className="app-nav-link">
                Favoritos
              </NavLink>
              <NavLink to="/conversations" className="app-nav-link">
                Mensajes
              </NavLink>
              {user.role === "admin" && (
                <NavLink to="/admin" className="app-nav-link">
                  Admin
                </NavLink>
              )}
              <NavLink to="/settings" className="app-nav-link">
                {user.username}
              </NavLink>
              <button className="btn btn-outline app-logout" onClick={handleLogout}>
                Salir
              </button>
            </nav>
          )}
        </div>
      </header>

      <main className="app-main">
        <div className="container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
