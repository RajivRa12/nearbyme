import { useEffect, useState } from "react";
import { useQuery } from "@/hooks/useFetch";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toArray, formatINR, formatSlotTime, istDateKey } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

type StoreServiceLite = {
  id: string;
  name: string;
  default_price_paise: number;
  duration_min: number;
  category_name: string | null;
  skill_tag: string | null;
};
type AvailabilitySlot = { start: string; end: string; professionals: { id: string; display_name: string }[] };
type SlotRequest = { store_service_id: string; professional_id?: string; slot_start: string; slot_end: string };
type ConfirmedSlot = { id: string; store_service_name: string; professional_name: string | null; slot_start: string; slot_end: string; price_paise: number };

const STEPS = ["Customer", "Services", "Date & Time", "Review"];

function timeLabel(iso: string) {
  return formatSlotTime(iso);
}

export default function NewBooking() {
  const { user } = useAuth();
  const outletId = user?.outlet_id;
  const [step, setStep] = useState(0);

  // Step 0: customer
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customer, setCustomer] = useState<{ id: string; name: string; phone_e164: string | null } | null>(null);
  const [resolvingCustomer, setResolvingCustomer] = useState(false);

  // Step 1: services
  const servicesQuery = useQuery({
    queryKey: ["/api/erp/store-services/"],
    queryFn: () => api<{ data: StoreServiceLite[] }>("/api/erp/store-services/"),
  });
  const services = toArray<StoreServiceLite>(servicesQuery.data);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const selectedServices = selectedServiceIds.map((id) => services.find((s) => s.id === id)!).filter(Boolean);

  // Step 2: date & slot
  const [date, setDate] = useState(() => istDateKey(new Date()));
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>("");

  async function fetchSlots() {
    if (!outletId || selectedServiceIds.length === 0) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const res = await api<{ data: { slots: AvailabilitySlot[] } }>(
        `/api/erp/outlets/${outletId}/availability/?service_id=${selectedServiceIds[0]}&date=${date}`
      );
      setSlots(res.data?.slots ?? []);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not load availability");
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  useEffect(() => {
    if (step === 2) fetchSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, date]);

  // Step 3: confirm
  const [draftBookingId, setDraftBookingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [conflict, setConflict] = useState<{ conflicts: any[]; override_token: string } | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [confirmedSlots, setConfirmedSlots] = useState<ConfirmedSlot[] | null>(null);

  function buildSlotRequests(): SlotRequest[] {
    if (!selectedSlot) return [];
    const requests: SlotRequest[] = [];
    let cursorEnd = selectedSlot.end;
    selectedServiceIds.forEach((id, idx) => {
      const svc = services.find((s) => s.id === id);
      if (!svc) return;
      if (idx === 0) {
        requests.push({
          store_service_id: id,
          ...(selectedProfessionalId ? { professional_id: selectedProfessionalId } : {}),
          slot_start: selectedSlot.start,
          slot_end: selectedSlot.end,
        });
      } else {
        const start = cursorEnd;
        const end = new Date(new Date(start).getTime() + svc.duration_min * 60000).toISOString();
        requests.push({ store_service_id: id, slot_start: start, slot_end: end });
        cursorEnd = end;
      }
    });
    return requests;
  }

  const totalPaise = selectedServices.reduce((sum, s) => sum + (s.default_price_paise || 0), 0);

  async function resolveCustomer() {
    if (!customerName.trim()) {
      setCustomer(null);
      setStep(1);
      return;
    }
    setResolvingCustomer(true);
    try {
      const res = await api<{ data: { id: string; name: string; phone_e164: string | null } }>(
        "/api/erp/customers/find-or-create/",
        { method: "POST", body: { name: customerName.trim(), phone: customerPhone.trim() } }
      );
      setCustomer(res.data);
      setStep(1);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not resolve customer");
    } finally {
      setResolvingCustomer(false);
    }
  }

  async function handleConfirm(overrideToken?: string) {
    const slotRequests = buildSlotRequests();
    if (slotRequests.length === 0) return;
    setConfirming(true);
    try {
      let bookingId = draftBookingId;
      if (!bookingId) {
        const bookingRes = await api<{ data: { id: string } }>("/api/erp/bookings/", {
          method: "POST",
          body: {
            customer: customer?.id ?? null,
            source: "front_desk",
            booking_start: slotRequests[0].slot_start,
            booking_end: slotRequests[slotRequests.length - 1].slot_end,
          },
        });
        bookingId = bookingRes.data.id;
        setDraftBookingId(bookingId);
      }
      const confirmRes = await api<{ data: any }>(`/api/erp/bookings/${bookingId}/confirm/`, {
        method: "POST",
        body: {
          slots: slotRequests,
          ...(overrideToken ? { override_token: overrideToken, override_reason: overrideReason } : {}),
        },
      });
      if (confirmRes.data?.conflict) {
        setConflict({ conflicts: confirmRes.data.conflicts, override_token: confirmRes.data.override_token });
      } else {
        setConflict(null);
        setConfirmedSlots(confirmRes.data?.slots ?? []);
        toast.success("Booking confirmed");
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not confirm booking");
    } finally {
      setConfirming(false);
    }
  }

  function resetFlow() {
    setStep(0);
    setCustomerName("");
    setCustomerPhone("");
    setCustomer(null);
    setSelectedServiceIds([]);
    setSlots([]);
    setSelectedSlot(null);
    setSelectedProfessionalId("");
    setDraftBookingId(null);
    setConflict(null);
    setOverrideReason("");
    setConfirmedSlots(null);
  }

  if (!outletId) {
    return (
      <div className="p-6 text-sm text-destructive">
        Your account isn't assigned to an outlet, so bookings can't be created. Contact your store admin.
      </div>
    );
  }

  if (confirmedSlots) {
    return (
      <div className="max-w-xl mx-auto space-y-6 pt-8 animate-in fade-in duration-500">
        <Card>
          <CardContent className="pt-6 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
            <h2 className="text-xl font-semibold">Booking Confirmed</h2>
            <p className="text-sm text-muted-foreground">Reference: <span className="font-mono">{draftBookingId}</span></p>
            <div className="text-left space-y-2 pt-2">
              {confirmedSlots.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{s.store_service_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {timeLabel(s.slot_start)}–{timeLabel(s.slot_end)} · {s.professional_name ?? "Unassigned"}
                    </p>
                  </div>
                  <span className="text-sm">{formatINR(s.price_paise / 100)}</span>
                </div>
              ))}
            </div>
            <Button className="mt-2" onClick={resetFlow}>New Booking</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Booking</h1>
        <div className="flex gap-2 mt-3">
          {STEPS.map((label, i) => (
            <Badge key={label} variant={i === step ? "default" : i < step ? "secondary" : "outline"}>
              {i + 1}. {label}
            </Badge>
          ))}
        </div>
      </div>

      {step === 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Name</label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Leave blank for a walk-in" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Phone</label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+91…" />
            </div>
            <Button onClick={resolveCustomer} disabled={resolvingCustomer}>
              {resolvingCustomer ? "Saving…" : customerName.trim() ? "Continue" : "Continue as Walk-in"}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Pick Service(s)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {servicesQuery.isLoading ? (
              <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading services…</div>
            ) : servicesQuery.isError ? (
              <p className="text-sm text-destructive">{(servicesQuery.error as Error)?.message ?? "Could not load services."}</p>
            ) : services.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active services found for this store.</p>
            ) : (
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {services.map((s) => (
                  <label key={s.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-muted/40">
                    <span className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedServiceIds.includes(s.id)}
                        onCheckedChange={(checked) =>
                          setSelectedServiceIds((ids) => (checked ? [...ids, s.id] : ids.filter((id) => id !== s.id)))
                        }
                      />
                      <span>
                        {s.name}
                        {s.category_name && <span className="text-xs text-muted-foreground"> · {s.category_name}</span>}
                        <span className="text-xs text-muted-foreground"> · {s.duration_min} min</span>
                      </span>
                    </span>
                    <span className="text-sm">{formatINR(s.default_price_paise / 100)}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="flex justify-between items-center pt-2">
              <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
              <Button disabled={selectedServiceIds.length === 0} onClick={() => setStep(2)}>Next</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Date &amp; Time</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-48" />
            {loadingSlots ? (
              <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Checking availability…</div>
            ) : slots.length === 0 ? (
              <p className="text-sm text-muted-foreground">No available slots for {selectedServices[0]?.name} on this date.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {slots.map((slot) => (
                  <button
                    key={slot.start}
                    type="button"
                    onClick={() => { setSelectedSlot(slot); setSelectedProfessionalId(""); }}
                    className={`rounded-md border px-2 py-2 text-sm ${selectedSlot?.start === slot.start ? "border-primary bg-primary/10" : "hover:bg-muted/40"}`}
                  >
                    {timeLabel(slot.start)}
                  </button>
                ))}
              </div>
            )}
            {selectedSlot && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Professional for {selectedServices[0]?.name}</label>
                <select
                  value={selectedProfessionalId}
                  onChange={(e) => setSelectedProfessionalId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  <option value="">Any available</option>
                  {selectedSlot.professionals.map((p) => (
                    <option key={p.id} value={p.id}>{p.display_name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex justify-between items-center pt-2">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button disabled={!selectedSlot} onClick={() => setStep(3)}>Next</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Review &amp; Confirm</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm">
              <p className="text-muted-foreground text-xs">Customer</p>
              <p>{customer?.name ?? "Walk-in"}{customer?.phone_e164 ? ` · ${customer.phone_e164}` : ""}</p>
            </div>
            <div className="space-y-1">
              {buildSlotRequests().map((req, i) => {
                const svc = services.find((s) => s.id === req.store_service_id);
                return (
                  <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <span>{svc?.name} — {timeLabel(req.slot_start)}–{timeLabel(req.slot_end)}</span>
                    <span>{svc ? formatINR(svc.default_price_paise / 100) : ""}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-sm font-medium border-t pt-2">
              <span>Total</span>
              <span>{formatINR(totalPaise / 100)}</span>
            </div>

            {conflict && (
              <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 space-y-2">
                <div className="flex items-center gap-2 text-amber-600 text-sm font-medium">
                  <AlertTriangle className="h-4 w-4" /> This overlaps an existing booking
                </div>
                <ul className="text-xs text-muted-foreground list-disc pl-4">
                  {conflict.conflicts.map((c, i) => (
                    <li key={i}>
                      {c.professional_conflict && "Professional is already booked. "}
                      {c.resource_conflict && "No resource free. "}
                      ({timeLabel(c.slot_start)}–{timeLabel(c.slot_end)})
                    </li>
                  ))}
                </ul>
                <Textarea
                  placeholder="Reason for overriding this conflict…"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  rows={2}
                />
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={!overrideReason.trim() || confirming}
                  onClick={() => handleConfirm(conflict.override_token)}
                >
                  {confirming ? "Overriding…" : "Override & Confirm Anyway"}
                </Button>
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
              {!conflict && (
                <Button disabled={confirming} onClick={() => handleConfirm()}>
                  {confirming ? "Confirming…" : "Confirm Booking"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
