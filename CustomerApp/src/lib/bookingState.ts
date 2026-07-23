// Simple in-memory booking draft store (frontend-only).
import { useSyncExternalStore } from "react";

type Draft = {
  salonId: string;
  serviceId?: string;
  therapistId?: string;
  roomId?: string;
  when?: string;
  date?: string;
  startTime?: string;
  mode?: "salon" | "home";
  addressId?: string;
};

let state: Draft = { salonId: "" };
const listeners = new Set<() => void>();

export function setDraft(next: Partial<Draft>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function resetDraft(salonId: string) {
  state = { salonId };
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

export const rooms = [
  { id: "r1", name: "Studio One", note: "Ground floor · natural light" },
  { id: "r2", name: "Studio Two", note: "Quiet corner · candle-lit" },
  { id: "r3", name: "Suite Blanc", note: "Private suite with shower" },
];

export const timeSlots = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "16:00", "16:30", "17:30", "18:00",
];

export const dates = Array.from({ length: 7 }).map((_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i);
  return {
    key: d.toISOString().slice(0, 10),
    weekday: d.toLocaleDateString("en-GB", { weekday: "short" }),
    day: d.getDate(),
  };
});
