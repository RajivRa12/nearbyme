import { useSyncExternalStore } from "react";

export type Message = { id: string; from: "me" | "them"; text: string; at: string };
export type Thread = {
  id: string;
  salonId: string;
  therapistId: string;
  bookingId?: string;
  messages: Message[];
  unread?: number;
};

let threads: Thread[] = [
  {
    id: "t-b-2001",
    salonId: "quiet-sanctuary",
    therapistId: "sarah-lin",
    bookingId: "b-2001",
    unread: 1,
    messages: [
      { id: "m1", from: "them", text: "Hi Elena — looking forward to your session today at 11:30. The room will be ready 10 minutes early if you'd like to arrive.", at: "9:12 AM" },
      { id: "m2", from: "me", text: "Perfect, I'll be there at 11:20. Any prep I should do?", at: "9:20 AM" },
      { id: "m3", from: "them", text: "Just come hydrated. I've noted your upper-back focus from last time.", at: "9:22 AM" },
    ],
  },
  {
    id: "t-b-2002",
    salonId: "oak-ember",
    therapistId: "elena-cruz",
    bookingId: "b-2002",
    messages: [
      { id: "m1", from: "them", text: "Bringing the shade samples we discussed. See you Friday.", at: "Yesterday" },
    ],
  },
  {
    id: "t-shizuka",
    salonId: "shizuka",
    therapistId: "marcus-hale",
    messages: [
      { id: "m1", from: "them", text: "Your Head Spa recap and home-care notes have been sent to your email.", at: "13 Jul" },
    ],
  },
];

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function getThreads() { return threads; }
export function getThread(id: string) { return threads.find((t) => t.id === id); }

export function ensureThreadForBooking(bookingId: string, salonId: string, therapistId: string) {
  let t = threads.find((x) => x.bookingId === bookingId);
  if (!t) {
    t = { id: `t-${bookingId}`, salonId, therapistId, bookingId, messages: [] };
    threads = [t, ...threads];
    notify();
  }
  return t;
}

export function markRead(id: string) {
  threads = threads.map((t) => (t.id === id ? { ...t, unread: 0 } : t));
  notify();
}

const QUICK_REPLIES = [
  "Got it — see you soon.",
  "Confirmed. I'll set up the room.",
  "Thanks, I've noted the change.",
  "No worries, take your time.",
];

export function sendMessage(threadId: string, text: string) {
  const now = new Date();
  const at = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  threads = threads.map((t) =>
    t.id === threadId
      ? { ...t, messages: [...t.messages, { id: `m-${now.getTime()}`, from: "me", text, at }] }
      : t,
  );
  notify();
  setTimeout(() => {
    const reply = QUICK_REPLIES[Math.floor(Math.random() * QUICK_REPLIES.length)];
    const t2 = new Date();
    const at2 = t2.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    threads = threads.map((t) =>
      t.id === threadId
        ? { ...t, messages: [...t.messages, { id: `r-${t2.getTime()}`, from: "them", text: reply, at: at2 }] }
        : t,
    );
    notify();
  }, 1100);
}

export function useThreads() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => threads,
    () => threads,
  );
}
