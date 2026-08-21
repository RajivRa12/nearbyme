// Simple in-memory booking draft store (frontend-only).
import { useSyncExternalStore } from "react";

type Draft = {
  salonId: string;
  serviceId?: string;
  serviceName?: string;
  servicePrice?: number;
  depositPercentage?: number;
  durationMin?: number;
  professionalId?: string;
  professionalName?: string;
  roomId?: string;
  roomName?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  when?: string;
  mode?: "salon" | "home";
  serviceAddress?: string;
  // Slot hold (see customer-app-build-guide.pdf section 6) — a session-scoped
  // reservation created the moment a time is picked, so the slot can't be
  // taken by someone else while this guest finishes OTP + payment.
  sessionToken?: string;
  holdId?: string;
  holdExpiresAt?: string;
};

function genSessionToken() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

let state: Draft = { salonId: "", sessionToken: genSessionToken() };
const listeners = new Set<() => void>();

export function setDraft(next: Partial<Draft>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function resetDraft(salonId: string) {
  state = { salonId, sessionToken: genSessionToken() };
  listeners.forEach((l) => l());
}

export function useDraft(): Draft {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}

export const dates = Array.from({ length: 7 }).map((_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i);
  return {
    key: d.toISOString().slice(0, 10),
    weekday: d.toLocaleDateString("en-GB", { weekday: "short" }),
    day: d.getDate(),
  };
});
