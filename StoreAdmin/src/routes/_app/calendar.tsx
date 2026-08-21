import { useMemo, useState } from "react";
import { useQuery } from "@/hooks/useFetch";
import { api, ApiError } from "@/lib/api";
import { toArray, formatDateTime, formatSlotTime, istHourMinute, istDateKey } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 9); // 9am – 9pm
const ROW_PX = 56;
const PALETTE = ["#6366f1", "#06b6d4", "#f59e0b", "#ec4899", "#10b981", "#8b5cf6", "#ef4444", "#3b82f6"];

function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

type Professional = { id: string; display_name: string; is_bookable: boolean; link_status: string };
type Slot = {
  id: string; store_service_name: string; professional: string | null; professional_name: string | null;
  resource_name: string | null; slot_start: string; slot_end: string; status: string; price_paise: number;
};
type BookingRow = { id: string; customer_name: string | null; status: string; slots: Slot[] };
type DaySlot = Slot & { booking_id: string; customer_name: string | null };

export default function CalendarView() {
  const [day, setDay] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const professionalsQ = useQuery({ queryKey: ["/api/erp/professionals/"], queryFn: () => api<{ data: Professional[] }>("/api/erp/professionals/") });
  const bookingsQ = useQuery({ queryKey: ["/api/erp/bookings/"], queryFn: () => api<{ data: BookingRow[] }>("/api/erp/bookings/") });

  const bookableProfessionals = toArray<Professional>(professionalsQ.data).filter((p) => p.is_bookable && p.link_status === "accepted");
  const bookings = toArray<BookingRow>(bookingsQ.data);

  const daySlots = useMemo(() => {
    const list: DaySlot[] = [];
    for (const b of bookings) {
      for (const s of b.slots ?? []) {
        if (s.status === "cancelled") continue;
        if (istDateKey(s.slot_start) === istDateKey(day)) {
          list.push({ ...s, booking_id: b.id, customer_name: b.customer_name });
        }
      }
    }
    return list;
  }, [bookings, day]);

  const hasUnassigned = daySlots.some((s) => !s.professional);
  const columns: Professional[] = hasUnassigned
    ? [...bookableProfessionals, { id: "__unassigned", display_name: "Unassigned", is_bookable: true, link_status: "accepted" }]
    : bookableProfessionals;

  const [detail, setDetail] = useState<DaySlot | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [acting, setActing] = useState(false);

  const [dragSlot, setDragSlot] = useState<DaySlot | null>(null);
  const [conflict, setConflict] = useState<{ conflicts: any[]; override_token: string } | null>(null);
  const [pendingReschedule, setPendingReschedule] = useState<{ slotId: string; bookingId: string; newStart: string; professionalId: string } | null>(null);
  const [overrideReason, setOverrideReason] = useState("");

  async function runBookingAction(bookingId: string, action: string, body?: unknown) {
    setActing(true);
    try {
      await api(`/api/erp/bookings/${bookingId}/${action}/`, { method: "POST", body });
      toast.success("Updated");
      setDetail(null);
      setCancelling(false);
      setCancelReason("");
      bookingsQ.refetch();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to update booking");
    } finally {
      setActing(false);
    }
  }

  async function doReschedule(slotId: string, bookingId: string, newStart: string, professionalId: string, overrideToken?: string) {
    try {
      const res = await api<{ data: any }>(`/api/erp/bookings/${bookingId}/slots/${slotId}/reschedule/`, {
        method: "POST",
        body: {
          slot_start: newStart,
          ...(professionalId && professionalId !== "__unassigned" ? { professional_id: professionalId } : {}),
          ...(overrideToken ? { override_token: overrideToken, override_reason: overrideReason } : {}),
        },
      });
      if (res.data?.conflict) {
        setConflict(res.data);
        setPendingReschedule({ slotId, bookingId, newStart, professionalId });
      } else {
        toast.success("Rescheduled");
        setConflict(null);
        setPendingReschedule(null);
        setOverrideReason("");
        bookingsQ.refetch();
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not reschedule");
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, professionalId: string) {
    e.preventDefault();
    if (!dragSlot) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const hourFloat = HOURS[0] + offsetY / ROW_PX;
    const snappedHour = Math.max(HOURS[0], Math.round(hourFloat * 4) / 4);
    const hh = String(Math.floor(snappedHour)).padStart(2, "0");
    const mm = String(Math.round((snappedHour % 1) * 60)).padStart(2, "0");
    // Grid hours are salon-local (IST); build the instant with an explicit
    // +05:30 offset so it's correct regardless of the admin's device timezone.
    const newIso = new Date(`${istDateKey(day)}T${hh}:${mm}:00+05:30`).toISOString();
    doReschedule(dragSlot.id, dragSlot.booking_id, newIso, professionalId);
    setDragSlot(null);
  }

  const move = (delta: number) => {
    const d = new Date(day);
    d.setDate(d.getDate() + delta);
    setDay(d);
  };

  const label = day.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
  const isToday = day.toDateString() === new Date().toDateString();
  const bodyHeight = HOURS.length * ROW_PX;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">Day view · colour-coded by professional · drag a booking to reschedule</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => move(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="min-w-[220px] text-center">
            <div className="text-sm font-medium">{label}</div>
            {isToday && <div className="text-xs text-primary">Today</div>}
          </div>
          <Button variant="outline" size="icon" onClick={() => move(1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setDay(new Date(new Date().setHours(0, 0, 0, 0)))}>Today</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-auto">
          {professionalsQ.isError || bookingsQ.isError ? (
            <div className="p-6 text-sm text-destructive">
              {((professionalsQ.error || bookingsQ.error) as Error)?.message ?? "Could not load calendar data."}
            </div>
          ) : (
            <div className="grid" style={{ gridTemplateColumns: `72px repeat(${Math.max(columns.length, 1)}, minmax(160px, 1fr))` }}>
              <div className="border-b border-r bg-muted/40 h-10" />
              {columns.map((p) => (
                <div key={p.id} className="border-b border-r px-3 py-2 text-sm font-medium bg-muted/40 last:border-r-0 flex items-center gap-2">
                  {p.id !== "__unassigned" && <span className="h-2 w-2 rounded-full shrink-0" style={{ background: colorFor(p.id) }} />}
                  <span className="truncate">{p.display_name}</span>
                </div>
              ))}

              <div className="relative border-r" style={{ height: bodyHeight }}>
                {HOURS.map((h, i) => (
                  <div key={h} className="absolute left-0 right-0 border-t text-[11px] text-muted-foreground px-2 pt-1" style={{ top: i * ROW_PX, height: ROW_PX }}>
                    {`${((h + 11) % 12) + 1} ${h < 12 ? "AM" : "PM"}`}
                  </div>
                ))}
              </div>

              {columns.map((p) => (
                <div
                  key={p.id}
                  className="relative border-r last:border-r-0"
                  style={{ height: bodyHeight }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, p.id)}
                >
                  {HOURS.map((h, i) => (
                    <div key={h} className="absolute left-0 right-0 border-t" style={{ top: i * ROW_PX, height: ROW_PX }} />
                  ))}
                  {daySlots
                    .filter((s) => (p.id === "__unassigned" ? !s.professional : s.professional === p.id))
                    .map((s) => {
                      const d = new Date(s.slot_start);
                      const { hour, minute } = istHourMinute(d);
                      const hourFloat = hour + minute / 60;
                      const top = (hourFloat - HOURS[0]) * ROW_PX;
                      const durationMin = (new Date(s.slot_end).getTime() - d.getTime()) / 60000;
                      const height = Math.max((durationMin / 60) * ROW_PX - 4, 22);
                      if (top < 0 || top > bodyHeight) return null;
                      const color = p.id === "__unassigned" ? "#94a3b8" : colorFor(p.id);
                      return (
                        <div
                          key={s.id}
                          draggable={s.status === "scheduled"}
                          onDragStart={() => setDragSlot(s)}
                          onClick={() => setDetail(s)}
                          className="absolute left-1 right-1 rounded-md border p-2 text-xs shadow-sm cursor-pointer overflow-hidden"
                          style={{ top, height, background: `${color}22`, borderColor: color }}
                        >
                          <div className="font-medium truncate">{s.customer_name ?? "Walk-in"}</div>
                          <div className="truncate opacity-80">{s.store_service_name}</div>
                          <div className="text-[10px] opacity-70 mt-0.5">
                            {formatSlotTime(d)} · {s.status}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {bookableProfessionals.length > 0 && (
        <div className="flex gap-3 flex-wrap text-xs items-center">
          {bookableProfessionals.map((p) => (
            <span key={p.id} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: colorFor(p.id) }} />
              {p.display_name}
            </span>
          ))}
        </div>
      )}

      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) { setDetail(null); setCancelling(false); setCancelReason(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{detail?.store_service_name}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <p><span className="text-muted-foreground">Customer:</span> {detail.customer_name ?? "Walk-in"}</p>
              <p><span className="text-muted-foreground">Professional:</span> {detail.professional_name ?? "Unassigned"}</p>
              <p><span className="text-muted-foreground">Time:</span> {formatDateTime(detail.slot_start)} – {formatSlotTime(detail.slot_end)}</p>
              <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline">{detail.status}</Badge></div>
              {cancelling ? (
                <div className="space-y-2">
                  <Textarea placeholder="Cancellation reason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={2} />
                  <div className="flex gap-2">
                    <Button size="sm" variant="destructive" disabled={!cancelReason.trim() || acting} onClick={() => runBookingAction(detail.booking_id, "cancel", { reason: cancelReason })}>
                      Confirm Cancel
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setCancelling(false)}>Back</Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="sm" disabled={acting} onClick={() => runBookingAction(detail.booking_id, "start")}>Start</Button>
                  <Button size="sm" disabled={acting} onClick={() => runBookingAction(detail.booking_id, "complete")}>Complete</Button>
                  <Button size="sm" variant="outline" disabled={acting} onClick={() => runBookingAction(detail.booking_id, "no-show")}>No-show</Button>
                  <Button size="sm" variant="destructive" disabled={acting} onClick={() => setCancelling(true)}>Cancel</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!conflict} onOpenChange={(o) => { if (!o) { setConflict(null); setPendingReschedule(null); setOverrideReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Scheduling Conflict</DialogTitle>
          </DialogHeader>
          <ul className="text-xs text-muted-foreground list-disc pl-4">
            {conflict?.conflicts.map((c: any, i: number) => (
              <li key={i}>
                {c.professional_conflict && "Professional is already booked. "}
                {c.resource_conflict && "No resource free. "}
              </li>
            ))}
          </ul>
          <Textarea placeholder="Reason to override" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} rows={2} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setConflict(null); setPendingReschedule(null); }}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!overrideReason.trim()}
              onClick={() => {
                if (pendingReschedule && conflict) {
                  doReschedule(pendingReschedule.slotId, pendingReschedule.bookingId, pendingReschedule.newStart, pendingReschedule.professionalId, conflict.override_token);
                }
              }}
            >
              Override &amp; Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
