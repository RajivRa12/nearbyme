import { useSyncExternalStore } from "react";
import { bookings as seed, type Booking } from "./mock";

let list: Booking[] = [...seed];
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function getBookings() { return list; }
export function getBooking(id: string) { return list.find((b) => b.id === id); }

export function addBooking(b: Booking) {
  list = [b, ...list];
  notify();
}

export function updateBooking(id: string, patch: Partial<Booking>) {
  list = list.map((b) => (b.id === id ? { ...b, ...patch } : b));
  notify();
}

export function cancelBooking(id: string) {
  updateBooking(id, { status: "Cancelled" });
}

export function useBookings() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => list,
    () => list,
  );
}

export function nextBookingId() {
  return `b-${Math.floor(2100 + Math.random() * 899)}`;
}
