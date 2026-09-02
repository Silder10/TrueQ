import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, resetCsrfToken } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const data = await api.get("/api/auth/me");
    setUser(data.user);
    return data.user;
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = async (email, password) => {
    const data = await api.post("/api/auth/login", { email, password });
    setUser(data.user);
    return data.user;
  };

  const register = async (username, email, password, interests = [], city = "") => {
    const data = await api.post("/api/auth/register", { username, email, password, interests, city });
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await api.post("/api/auth/logout");
    setUser(null);
    resetCsrfToken();
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
