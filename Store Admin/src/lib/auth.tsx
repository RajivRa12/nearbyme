import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, getToken, setToken } from "./api";

export type AuthUser = {
  id?: number | string;
  email?: string;
  name?: string;
  [k: string]: unknown;
} | null;

type AuthContextType = {
  token: string | null;
  user: AuthUser;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_KEY = "admin_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = getToken();
    setTokenState(t);
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(USER_KEY);
      if (raw) {
        try {
          setUser(JSON.parse(raw));
        } catch {
        }
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api<{
      token?: string;
      access?: string;
      key?: string;
      user?: AuthUser;
    }>("/api/auth/login/", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
    const t = res.token || res.access || res.key || null;
    if (!t) throw new Error("Login response missing token");
    setToken(t);
    setTokenState(t);
    const u = res.user ?? { email };
    setUser(u);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(USER_KEY, JSON.stringify(u));
    }
  };

  const logout = () => {
    setToken(null);
    setTokenState(null);
    setUser(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(USER_KEY);
      window.location.assign("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
