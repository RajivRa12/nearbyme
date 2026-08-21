export function formatINR(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return String(v);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

// Stores operate in India regardless of where the admin is logged in from,
// so every date/time is rendered in salon-local IST rather than the
// viewer's device timezone (which would silently misdisplay slot times).
const SALON_TZ = "Asia/Kolkata";

export function formatDate(v: string | Date | null | undefined): string {
  if (!v) return "—";
  const d = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: SALON_TZ });
}

export function formatDateTime(v: string | Date | null | undefined): string {
  if (!v) return "—";
  const d = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: SALON_TZ,
  });
}

export function formatSlotTime(v: string | Date | null | undefined): string {
  if (!v) return "—";
  const d = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: SALON_TZ });
}

// Hour-of-day (0-23) and minute in salon-local IST, for grid positioning
// where a Date's local getHours()/getMinutes() would use the viewer's
// device timezone instead.
export function istHourMinute(v: string | Date): { hour: number; minute: number } {
  const d = typeof v === "string" ? new Date(v) : v;
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: SALON_TZ,
  }).formatToParts(d);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return { hour, minute };
}

// Calendar-day key ("YYYY-MM-DD") in salon-local IST, for bucketing slots
// by day without drifting across the boundary in other device timezones.
export function istDateKey(v: string | Date): string {
  const d = typeof v === "string" ? new Date(v) : v;
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: SALON_TZ,
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${day}`;
}

export function toArray<T = any>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (v && typeof v === "object") {
    const anyV = v as any;
    if (Array.isArray(anyV.results)) return anyV.results as T[];
    if (Array.isArray(anyV.data)) return anyV.data as T[];
  }
  return [];
}
