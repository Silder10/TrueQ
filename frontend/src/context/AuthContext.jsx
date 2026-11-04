
import { useCallback, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext.js";
import { api, resetCsrfToken } from "../api/client";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const data = await api.get("/api/auth/me");
    setUser(data.user);
    return data.user;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        await refreshUser();
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  const login = async (identifier, password) => {
    const data = await api.post("/api/auth/login", {
      identifier,
      password,
    });

    setUser(data.user);
    return data.user;
  };

  const register = async (
    username,
    email,
    password,
    interests = [],
    city = "",
    latitude = null,
    longitude = null,
    phone = ""
  ) => {
    const data = await api.post("/api/auth/register", {
      username,
      email,
      phone,
      password,
      interests,
      city,
      latitude,
      longitude,
    });

    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await api.post("/api/auth/logout");
    setUser(null);
    resetCsrfToken();
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
    setUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}