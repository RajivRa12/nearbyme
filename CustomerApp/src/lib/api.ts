import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = "customer_token";
const USER_KEY = "customer_user";

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

  // Hardcoded to local network IP for Expo Go compatibility
  const API_BASE = 'http://10.0.2.2:8000';
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

// Appointments are local to the salon (India), so always render their times
// in IST — not the viewer's device timezone, which would silently show the
// wrong time for anyone travelling or with a misconfigured clock.
const SALON_TZ = "Asia/Kolkata";

export function formatSlotTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: SALON_TZ });
}

export function formatSlotDate(value: string | Date, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" }): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-IN", { ...opts, timeZone: SALON_TZ });
}

export async function startConversation(therapistId: string | number): Promise<string | null> {
  try {
    const res = await api<any>("/api/customer/conversations/", { method: "POST", body: { therapist_id: therapistId } });
    return (res as any)?.id ?? (res as any)?.data?.id ?? null;
  } catch {
    return null;
  }
}

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function getOpenStatus(workingHours: Record<string, string> | null | undefined) {
  if (!workingHours || Object.keys(workingHours).length === 0) {
    return { isOpen: false, label: "Hours unavailable", hasData: false };
  }
  const now = new Date();
  const today = workingHours[DAY_KEYS[now.getDay()]];
  if (!today || today.toLowerCase() === "closed") {
    return { isOpen: false, label: "Closed today", hasData: true };
  }
  const [start, end] = today.split("-");
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const isOpen = minutesNow >= sh * 60 + sm && minutesNow < eh * 60 + em;
  return { isOpen, label: isOpen ? `Open · closes ${end}` : `Closed · opens ${start}`, hasData: true };
}

export function formatDiscount(offer: { discount_type?: string; discount_value?: number | string } | null | undefined): string {
  if (!offer) return "";
  const value = Number(offer.discount_value ?? 0);
  if (offer.discount_type === "FLAT") return `₹${value} off`;
  return `${value}% off`;
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
