import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, getToken, setToken, getStoreContext, setStoreContext } from "./api";

export type AuthUser = {
  id?: number | string;
  email?: string;
  name?: string;
  role?: string;
  brand_id?: string | null;
  store_id?: string | null;
  outlet_id?: string;
  [k: string]: unknown;
} | null;

type AuthContextType = {
  token: string | null;
  user: AuthUser;
  loading: boolean;
  /** For a Brand Owner: the store they've picked to work in, if any. Always
   * null for single-store roles (STORE_ADMIN/RECEPTIONIST/THERAPIST). */
  currentStoreId: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (patch: Partial<NonNullable<AuthUser>>) => void;
  switchStore: (storeId: string | null) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_KEY = "admin_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);
  const [currentStoreId, setCurrentStoreId] = useState<string | null>(null);

  useEffect(() => {
    const t = getToken();
    setTokenState(t);
    setCurrentStoreId(getStoreContext());
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

  const switchStore = (storeId: string | null) => {
    setStoreContext(storeId);
    setCurrentStoreId(storeId);
  };

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
    // A fresh login shouldn't inherit whatever store a previous session
    // (possibly a different Brand Owner) last picked.
    setStoreContext(null);
    setCurrentStoreId(null);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(USER_KEY, JSON.stringify(u));
    }
  };

  const updateUser = (patch: Partial<NonNullable<AuthUser>>) => {
    setUser((prev) => {
      const next = { ...(prev ?? {}), ...patch };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(USER_KEY, JSON.stringify(next));
      }
      return next;
    });
  };

  const logout = () => {
    setToken(null);
    setTokenState(null);
    setUser(null);
    setStoreContext(null);
    setCurrentStoreId(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(USER_KEY);
      window.location.assign("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, currentStoreId, login, logout, updateUser, switchStore }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
