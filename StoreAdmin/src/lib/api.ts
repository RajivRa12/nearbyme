const TOKEN_KEY = "admin_token";
// A Brand Owner has no single store — once they pick one to work in (see
// lib/auth.tsx), its id is sent as X-Store-Id on every request so the
// backend can scope store_erp queries to it for that request only.
const STORE_CONTEXT_KEY = "admin_current_store_id";
export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export function getStoreContext(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORE_CONTEXT_KEY);
}

export function setStoreContext(storeId: string | null) {
  if (typeof window === "undefined") return;
  if (storeId) window.localStorage.setItem(STORE_CONTEXT_KEY, storeId);
  else window.localStorage.removeItem(STORE_CONTEXT_KEY);
}

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

type Options = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  auth?: boolean;
};

export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  try {
    const token = getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    };

    if (token && opts.auth !== false) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const storeId = getStoreContext();
    if (storeId && opts.auth !== false && !headers["X-Store-Id"]) {
      headers["X-Store-Id"] = storeId;
    }

    const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
    const response = await fetch(url, {
      method: opts.method || "GET",
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = null;
      }
      throw new ApiError(
        errorData?.message || errorData?.detail || `HTTP error ${response.status}`,
        response.status,
        errorData
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError((err as Error).message || "Network error", 500, err);
  }
}
