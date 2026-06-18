import { createContext, useContext, useMemo, useState } from "react";
import { ApiError, apiClient } from "../api/client";

const AuthContext = createContext(null);

const decodeJwtPayload = (token) => {
  if (!token) return null;
  try {
    const payloadBase64 = token.split(".")[1];
    const normalized = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(window.atob(normalized));
  } catch {
    return null;
  }
};

const isTokenExpired = (token) => {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  return Date.now() >= payload.exp * 1000;
};

export const AuthProvider = ({ children }) => {
  const [accessToken, setAccessToken] = useState(localStorage.getItem("smartpos_access_token"));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem("smartpos_refresh_token"));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("smartpos_user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = async ({ username, password }) => {
    const data = await apiClient("/auth/login/", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    const payload = decodeJwtPayload(data.access);
    const userProfile = data.user || {
      id: payload?.user_id,
      username: payload?.username || username,
      role: payload?.role,
      email: "",
    };
    setAccessToken(data.access);
    setRefreshToken(data.refresh);
    setUser(userProfile);
    localStorage.setItem("smartpos_access_token", data.access);
    localStorage.setItem("smartpos_refresh_token", data.refresh);
    localStorage.setItem("smartpos_user", JSON.stringify(userProfile));
    return userProfile;
  };

  const register = async (payload) =>
    apiClient("/auth/register/", {
      method: "POST",
      body: JSON.stringify(payload),
    });

  const logout = () => {
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    localStorage.removeItem("smartpos_access_token");
    localStorage.removeItem("smartpos_refresh_token");
    localStorage.removeItem("smartpos_user");
  };

  const getValidAccessToken = () => {
    if (!accessToken || isTokenExpired(accessToken)) {
      logout();
      throw new ApiError("Session expired. Please sign in again.", 401);
    }
    return accessToken;
  };

  const value = useMemo(
    () => ({
      accessToken,
      refreshToken,
      user,
      login,
      register,
      logout,
      getValidAccessToken,
      isAuthenticated: Boolean(accessToken && user && !isTokenExpired(accessToken)),
    }),
    [accessToken, refreshToken, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
};
