import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = "therapist_token";
const USER_KEY = "therapist_user";

// expo-secure-store has no web implementation, so fall back to localStorage
// there (dev-only web preview; native platforms keep using SecureStore).
async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  }
  return SecureStore.getItemAsync(key);
}

async function storageSet(key: string, value: string) {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function storageDelete(key: string) {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function getToken(): Promise<string | null> {
  try {
    return await storageGet(TOKEN_KEY);
  } catch (e) {
    return null;
  }
}

export async function setToken(token: string | null) {
  try {
    if (token) await storageSet(TOKEN_KEY, token);
    else await storageDelete(TOKEN_KEY);
  } catch (e) {}
}

export async function getUser(): Promise<Record<string, unknown> | null> {
  try {
    const s = await storageGet(USER_KEY);
    return s ? JSON.parse(s) : null;
  } catch (e) {
    return null;
  }
}

export async function setUser(user: Record<string, unknown> | null) {
  try {
    if (user) await storageSet(USER_KEY, JSON.stringify(user));
    else await storageDelete(USER_KEY);
  } catch (e) {}
}

export async function logout() {
  try {
    await storageDelete(TOKEN_KEY);
    await storageDelete(USER_KEY);
  } catch (e) {}
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
};

export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  // Use production backend URL
  const API_BASE = 'https://api.sancharitribe.com';
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  if (!res.ok) {
    let errorData: unknown;
    try { errorData = await res.json(); } catch { errorData = null; }
    if (res.status === 401) {
      logout();
    }
    throw new ApiError(
      (errorData as { message?: string })?.message || `HTTP error ${res.status}`,
      res.status,
      errorData
    );
  }

  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
}

// Multipart upload — separate from api() because that always JSON-encodes
// the body. Used for portfolio/profile photos picked via expo-image-picker.
export async function uploadPhoto(path: string, uri: string, filename = 'photo.jpg'): Promise<{ url: string }> {
  const token = await getToken();
  const API_BASE = 'https://api.sancharitribe.com';
  const ext = (filename.split('.').pop() || 'jpg').toLowerCase();
  const form = new FormData();
  form.append('photo', {
    uri,
    name: filename,
    type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
  } as any);

  const res = await fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });

  if (!res.ok) {
    let errorData: unknown;
    try { errorData = await res.json(); } catch { errorData = null; }
    throw new ApiError((errorData as { message?: string })?.message || `HTTP error ${res.status}`, res.status, errorData);
  }
  const json = await res.json();
  return json.data ?? json;
}

export function formatINR(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (isNaN(n)) return String(v);
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(n);
}

export function formatTime(v: string | null | undefined): string {
  if (!v) return "—";
  const d = new Date(v);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function formatDate(v: string | Date | null | undefined): string {
  if (!v) return "—";
  const d = typeof v === "string" ? new Date(v) : v;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function toArray<T = unknown>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (v && typeof v === "object") {
    const a = v as Record<string, unknown>;
    if (Array.isArray(a.results)) return a.results as T[];
    if (Array.isArray(a.data)) return a.data as T[];
  }
  return [];
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
