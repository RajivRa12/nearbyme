import { useNavigate } from "react-router-dom";
import { useQuery } from "@/hooks/useFetch";
import { useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { toArray, formatINR } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Search, Trash2, ShoppingBag, User as UserIcon, Receipt as ReceiptIcon, Plus } from "lucide-react";

type StoreServiceLite = { id: string; name: string; default_price_paise: number; duration_min: number; category_name: string | null };
type Professional = { id: string; display_name: string; is_bookable: boolean; link_status: string };
type BookingSlot = { id: string; store_service_name: string; professional_name: string | null; status: string; price_paise: number };
type BookingRow = { id: string; status: string; customer: string | null; customer_name: string | null; booking_start: string; slots: BookingSlot[] };
type CartLine = { key: string; store_service_id: string; name: string; price_paise: number; professional_id: string; professional_name: string; fromBooking: boolean; package_id?: string };
type PaymentRow = { method: string; amount: string; reference_id?: string };
type CustomerMembership = { id: string; plan_name: string; value_paise_remaining: number; valid_until: string };
type CustomerPackage = { id: string; name: string; service_credits: Record<string, number>; valid_until: string };

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "UPI", label: "UPI" },
  { value: "WALLET", label: "Wallet" },
  { value: "GIFT_CARD", label: "Gift Card" },
  { value: "MEMBERSHIP_CREDIT", label: "Membership Credit" },
  { value: "PACKAGE_CREDIT", label: "Package Credit" },
];
const DISCOUNT_THRESHOLD_PCT = 15;
const GST_DISPLAY_RATE = 0.18;

export default function POS() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"booking" | "walkin">("walkin");
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string>("");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [resolvedCustomerId, setResolvedCustomerId] = useState("");
  const [resolvingCustomer, setResolvingCustomer] = useState(false);

  const [discountPct, setDiscountPct] = useState(0);
  const [managerApproved, setManagerApproved] = useState(false);
  const [payments, setPayments] = useState<PaymentRow[]>([{ method: "CASH", amount: "" }]);
  const [submitting, setSubmitting] = useState(false);

  const servicesQ = useQuery({ queryKey: ["/api/erp/store-services/"], queryFn: () => api<{ data: StoreServiceLite[] }>("/api/erp/store-services/") });
  const professionalsQ = useQuery({ queryKey: ["/api/erp/professionals/"], queryFn: () => api<{ data: Professional[] }>("/api/erp/professionals/") });
  const bookingsQ = useQuery({ queryKey: ["/api/erp/bookings/"], queryFn: () => api<{ data: BookingRow[] }>("/api/erp/bookings/") });

  const services = toArray<StoreServiceLite>(servicesQ.data);
  const professionals = toArray<Professional>(professionalsQ.data).filter((p) => p.is_bookable && p.link_status === "accepted");
  const openBookings = toArray<BookingRow>(bookingsQ.data).filter((b) => b.status === "confirmed" || b.status === "in_service");

  const filteredServices = q ? services.filter((s) => s.name.toLowerCase().includes(q.toLowerCase())) : services;

  const activeCustomerId = mode === "booking" ? (openBookings.find((b) => b.id === selectedBookingId)?.customer ?? "") : resolvedCustomerId;
  const today = new Date().toISOString().slice(0, 10);
  const membershipsQ = useQuery({
    queryKey: ["/api/erp/customer-memberships/", activeCustomerId],
    queryFn: () => (activeCustomerId ? api<CustomerMembership[]>(`/api/erp/customer-memberships/?customer_id=${activeCustomerId}`) : Promise.resolve([])),
  });
  const packagesQ = useQuery({
    queryKey: ["/api/erp/packages/", activeCustomerId],
    queryFn: () => (activeCustomerId ? api<CustomerPackage[]>(`/api/erp/packages/?customer_id=${activeCustomerId}`) : Promise.resolve([])),
  });
  const availableMemberships = toArray<CustomerMembership>(membershipsQ.data).filter((m) => m.valid_until >= today);
  const availablePackages = toArray<CustomerPackage>(packagesQ.data).filter((p) => p.valid_until >= today);

  async function findCustomer() {
    if (!customerName.trim()) return toast.error("Enter a name first");
    setResolvingCustomer(true);
    try {
      const res = await api<{ data: { id: string } }>("/api/erp/customers/find-or-create/", {
        method: "POST", body: { name: customerName.trim(), phone: customerPhone.trim() },
      });
      setResolvedCustomerId(res.data.id);
      toast.success("Customer found");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not find customer");
    } finally {
      setResolvingCustomer(false);
    }
  }

  function loadBooking(bookingId: string) {
    setSelectedBookingId(bookingId);
    const booking = openBookings.find((b) => b.id === bookingId);
    if (!booking) return;
    setCart(
      booking.slots
        .filter((s) => s.status !== "cancelled")
        .map((s) => ({
          key: s.id, store_service_id: "", name: s.store_service_name, price_paise: s.price_paise,
          professional_id: "", professional_name: s.professional_name ?? "Unassigned", fromBooking: true,
        }))
    );
  }

  function addService(svc: StoreServiceLite) {
    setCart((prev) => [...prev, {
      key: `${svc.id}-${Date.now()}`, store_service_id: svc.id, name: svc.name, price_paise: svc.default_price_paise,
      professional_id: "", professional_name: "", fromBooking: false,
    }]);
  }
  function removeLine(key: string) {
    setCart((prev) => prev.filter((l) => l.key !== key));
  }
  function setLineProfessional(key: string, professionalId: string) {
    const p = professionals.find((pr) => pr.id === professionalId);
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, professional_id: professionalId, professional_name: p?.display_name ?? "" } : l)));
  }
  function setLinePackage(key: string, packageId: string) {
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, package_id: packageId || undefined } : l)));
  }

  const subtotal = useMemo(() => cart.reduce((s, l) => s + (l.package_id ? 0 : l.price_paise), 0) / 100, [cart]);
  const discountAmount = (subtotal * discountPct) / 100;
  const estimatedTax = Math.max(0, subtotal - discountAmount) * GST_DISPLAY_RATE;
  const estimatedTotal = Math.max(0, subtotal - discountAmount) + estimatedTax;
  const paidTotal = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const requiresApproval = discountPct > DISCOUNT_THRESHOLD_PCT;

  function addPaymentRow() {
    setPayments((p) => [...p, { method: "CASH", amount: "" }]);
  }
  function updatePayment(i: number, patch: Partial<PaymentRow>) {
    setPayments((p) => p.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function removePayment(i: number) {
    setPayments((p) => p.filter((_, idx) => idx !== i));
  }

  async function completeSale() {
    if (cart.length === 0) return toast.error("Cart is empty");
    if (requiresApproval && !managerApproved) return toast.error("Manager approval is required for this discount");
    setSubmitting(true);
    try {
      let globalCustomerId: string | undefined = resolvedCustomerId || undefined;
      if (mode === "walkin" && !globalCustomerId && customerName.trim()) {
        const res = await api<{ data: { id: string } }>("/api/erp/customers/find-or-create/", {
          method: "POST", body: { name: customerName.trim(), phone: customerPhone.trim() },
        });
        globalCustomerId = res.data.id;
      }
      const res = await api<{ data: { id: string } }>("/api/erp/invoices/checkout/", {
        method: "POST",
        body: {
          booking_id: mode === "booking" ? selectedBookingId : undefined,
          global_customer_id: globalCustomerId,
          lines: cart.filter((l) => !l.fromBooking).map((l) => ({
            store_service_id: l.store_service_id,
            ...(l.professional_id ? { professional_id: l.professional_id } : {}),
            ...(l.package_id ? { package_id: l.package_id } : {}),
          })),
          discount_amount: discountAmount.toFixed(2),
          is_discount_approved: managerApproved,
          payments: payments
            .filter((p) => Number(p.amount) > 0)
            .map((p) => ({ method: p.method, amount: p.amount, ...(p.reference_id ? { reference_id: p.reference_id } : {}) })),
        },
      });
      toast.success("Invoice created");
      navigate(`/billing/${res.data.id}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not complete sale");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
      <div className="space-y-4 min-w-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New Sale</h1>
          <p className="text-sm text-muted-foreground">Load a confirmed booking or ring up a walk-in.</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex rounded-md border p-0.5">
                <Button size="sm" variant={mode === "walkin" ? "default" : "ghost"} className="h-8" onClick={() => { setMode("walkin"); setCart([]); setSelectedBookingId(""); }}>Walk-in</Button>
                <Button size="sm" variant={mode === "booking" ? "default" : "ghost"} className="h-8" onClick={() => { setMode("booking"); setCart([]); }}>From Booking</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {mode === "booking" ? (
              <div className="space-y-2">
                {bookingsQ.isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading bookings…</p>
                ) : bookingsQ.isError ? (
                  <p className="text-sm text-destructive">{(bookingsQ.error as Error)?.message ?? "Could not load bookings."}</p>
                ) : openBookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No confirmed or in-service bookings right now.</p>
                ) : (
                  openBookings.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => loadBooking(b.id)}
                      className={`w-full text-left p-3 rounded-lg border transition ${selectedBookingId === b.id ? "border-primary bg-primary/5" : "hover:border-primary hover:bg-primary/5"}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{b.customer_name ?? "Walk-in"}</span>
                        <Badge variant="outline">{b.status}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{b.slots.map((s) => s.store_service_name).join(", ")}</div>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <>
                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search services…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8 h-9" />
                </div>
                {servicesQ.isError ? (
                  <p className="text-sm text-destructive">{(servicesQ.error as Error)?.message ?? "Could not load services."}</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredServices.map((s) => (
                      <button key={s.id} onClick={() => addService(s)} className="text-left p-3 rounded-lg border hover:border-primary hover:bg-primary/5 transition">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{s.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{s.duration_min}m{s.category_name ? ` · ${s.category_name}` : ""}</div>
                          </div>
                          <div className="text-sm font-semibold whitespace-nowrap">{formatINR(s.default_price_paise / 100)}</div>
                        </div>
                      </button>
                    ))}
                    {filteredServices.length === 0 && <div className="col-span-full text-sm text-muted-foreground text-center py-8">No matches.</div>}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {mode === "walkin" && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><UserIcon className="h-4 w-4" /> Customer</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Input placeholder="Name (optional)" value={customerName} onChange={(e) => { setCustomerName(e.target.value); setResolvedCustomerId(""); }} />
              <Input placeholder="Phone (optional)" value={customerPhone} onChange={(e) => { setCustomerPhone(e.target.value); setResolvedCustomerId(""); }} />
              {resolvedCustomerId ? (
                <p className="text-xs text-emerald-600">Customer found — memberships &amp; packages loaded below.</p>
              ) : (
                <Button size="sm" variant="outline" disabled={!customerName.trim() || resolvingCustomer} onClick={findCustomer}>
                  {resolvingCustomer ? "Finding…" : "Find Customer"}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="flex flex-col">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShoppingBag className="h-4 w-4" /> Cart · {cart.length}</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[32vh] overflow-auto">
            {cart.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">Add services to the cart.</div>}
            {cart.map((l) => {
              const eligiblePackages = availablePackages.filter((p) => (p.service_credits[l.store_service_id] ?? 0) > 0);
              return (
                <div key={l.key} className="space-y-1 text-sm border-b pb-2 last:border-b-0">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{l.name}</div>
                      <div className="text-xs text-muted-foreground">{l.package_id ? "Redeemed from package — free" : formatINR(l.price_paise / 100)}</div>
                    </div>
                    {!l.fromBooking && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeLine(l.key)}><Trash2 className="h-3 w-3" /></Button>
                    )}
                  </div>
                  {l.fromBooking ? (
                    <p className="text-xs text-muted-foreground">Professional: {l.professional_name}</p>
                  ) : (
                    <>
                      <select
                        value={l.professional_id}
                        onChange={(e) => setLineProfessional(l.key, e.target.value)}
                        className="flex h-7 w-full rounded-md border border-input bg-transparent px-2 text-xs"
                      >
                        <option value="">Professional (optional)</option>
                        {professionals.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
                      </select>
                      {eligiblePackages.length > 0 && (
                        <select
                          value={l.package_id ?? ""}
                          onChange={(e) => setLinePackage(l.key, e.target.value)}
                          className="flex h-7 w-full rounded-md border border-input bg-transparent px-2 text-xs"
                        >
                          <option value="">Pay normally</option>
                          {eligiblePackages.map((p) => (
                            <option key={p.id} value={p.id}>Redeem from {p.name} ({p.service_credits[l.store_service_id]} left)</option>
                          ))}
                        </select>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </CardContent>
          <div className="border-t px-6 py-3 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatINR(subtotal)}</span></div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Discount %</span>
              <Input type="number" min={0} max={100} value={discountPct} onChange={(e) => setDiscountPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} className="h-7 w-20 text-right" />
            </div>
            {requiresApproval && (
              <label className="flex items-center gap-2 text-xs text-amber-600">
                <Checkbox checked={managerApproved} onCheckedChange={(c) => setManagerApproved(!!c)} />
                Manager approves discount over {DISCOUNT_THRESHOLD_PCT}%
              </label>
            )}
            <div className="flex justify-between text-muted-foreground text-xs"><span>Discount</span><span>−{formatINR(discountAmount)}</span></div>
            <div className="flex justify-between text-muted-foreground text-xs"><span>Est. tax</span><span>{formatINR(estimatedTax)}</span></div>
            <div className="flex justify-between text-base font-semibold pt-1 border-t"><span>Est. Total</span><span>{formatINR(estimatedTotal)}</span></div>

            <div className="pt-2 space-y-1">
              <p className="text-xs text-muted-foreground">Payment (split across methods)</p>
              {payments.map((p, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex gap-1">
                    <select value={p.method} onChange={(e) => updatePayment(i, { method: e.target.value, reference_id: undefined })} className="flex h-8 flex-1 rounded-md border border-input bg-transparent px-2 text-xs">
                      {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <Input type="number" placeholder="Amount" value={p.amount} onChange={(e) => updatePayment(i, { amount: e.target.value })} className="h-8 w-24 text-right" />
                    {payments.length > 1 && (
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removePayment(i)}><Trash2 className="h-3 w-3" /></Button>
                    )}
                  </div>
                  {p.method === "MEMBERSHIP_CREDIT" && (
                    <select
                      value={p.reference_id ?? ""}
                      onChange={(e) => updatePayment(i, { reference_id: e.target.value })}
                      className="flex h-7 w-full rounded-md border border-input bg-transparent px-2 text-xs"
                    >
                      <option value="">Select membership…</option>
                      {availableMemberships.map((m) => (
                        <option key={m.id} value={m.id}>{m.plan_name} — {formatINR(m.value_paise_remaining / 100)} left</option>
                      ))}
                    </select>
                  )}
                  {p.method === "GIFT_CARD" && (
                    <Input
                      placeholder="Gift card code"
                      value={p.reference_id ?? ""}
                      onChange={(e) => updatePayment(i, { reference_id: e.target.value.toUpperCase() })}
                      className="h-7 text-xs"
                    />
                  )}
                </div>
              ))}
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={addPaymentRow}><Plus className="h-3 w-3 mr-1" /> Add payment method</Button>
              <p className="text-xs text-muted-foreground">Paid: {formatINR(paidTotal)}</p>
            </div>

            <Button className="w-full mt-2" size="lg" disabled={cart.length === 0 || submitting} onClick={completeSale}>
              <ReceiptIcon className="h-4 w-4 mr-2" />
              {submitting ? "Processing…" : "Complete Sale"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
