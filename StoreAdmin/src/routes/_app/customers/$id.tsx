import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from "@/hooks/useFetch";
import { api, ApiError } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { formatINR, formatDateTime, toArray } from "@/lib/format";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function SellPlanDialog({
  label, plansEndpoint, sellEndpoint, customerName, customerPhone, onSold,
}: {
  label: string; plansEndpoint: string; sellEndpoint: string; customerName: string; customerPhone: string; onSold: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [planId, setPlanId] = useState("");
  const plansQ = useQuery({ queryKey: [plansEndpoint], queryFn: () => api<any>(plansEndpoint) });
  const plans = toArray<any>(plansQ.data).filter((p) => p.is_active !== false);

  const sell = useMutation({
    mutationFn: () => api(sellEndpoint, {
      method: "POST",
      body: { plan_id: planId, customer_name: customerName, customer_phone: customerPhone },
    }),
    onSuccess: () => { toast.success(`${label} sold`); setOpen(false); setPlanId(""); onSold(); },
    onError: (e: Error) => toast.error(e instanceof ApiError ? e.message : `Could not sell ${label.toLowerCase()}`),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={!customerPhone}>Sell {label}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Sell {label}</DialogTitle></DialogHeader>
        <Select value={planId} onValueChange={setPlanId}>
          <SelectTrigger><SelectValue placeholder={`Choose a ${label.toLowerCase()} plan…`} /></SelectTrigger>
          <SelectContent>
            {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} — {formatINR(p.price_paise / 100)}</SelectItem>)}
            {plans.length === 0 && <div className="px-2 py-1.5 text-sm text-muted-foreground">No active plans configured.</div>}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!planId || sell.isPending} onClick={() => sell.mutate()}>
            {sell.isPending ? "Selling…" : `Sell ${label}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CustomerDetail;

function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const key = ["customer", id];

  const q = useQuery({
    queryKey: key,
    queryFn: () => api<any>(`/api/erp/crm/${id}/`),
  });

  const [notes, setNotes] = useState("");
  useEffect(() => {
    if (q.data) setNotes(q.data.notes || q.data.skin_notes || q.data.hair_notes || "");
  }, [q.data]);

  const saveNotes = useMutation({
    mutationFn: () => api(`/api/erp/crm/${id}/`, { method: "PATCH", body: { notes } }),
    onSuccess: () => { toast.success("Notes saved"); qc.invalidateQueries({ queryKey: key }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const c = q.data ?? {};
  const visits = toArray<any>(c.visits ?? c.visit_history ?? c.appointments);
  const customerName = c.name || c.full_name || [c.first_name, c.last_name].filter(Boolean).join(" ");

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/customers")}>← Back</Button>
        <h1 className="text-2xl font-semibold mt-2">{customerName || `Customer #${id}`}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{c.customer_code || `CUST-${String(id).padStart(6, "0")}`}</p>
      </div>

      {q.isError && <div className="text-sm text-destructive">{(q.error as Error).message}</div>}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Visits</CardTitle></CardHeader>
          <CardContent className="text-lg font-semibold">{c.total_visits ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Spend</CardTitle></CardHeader>
          <CardContent className="text-lg font-semibold">{formatINR(c.total_spend ?? 0)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Average Spend</CardTitle></CardHeader>
          <CardContent className="text-lg font-semibold">{formatINR(c.average_spend ?? 0)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Favourite Therapist</CardTitle></CardHeader>
          <CardContent className="text-lg font-semibold">{c.favorite_therapist_name || "—"}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Phone</CardTitle></CardHeader>
          <CardContent>{c.phone || "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Email</CardTitle></CardHeader>
          <CardContent>{c.email || "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Outstanding</CardTitle></CardHeader>
          <CardContent className="text-lg font-semibold">{formatINR(c.outstanding ?? c.outstanding_balance ?? 0)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Membership &amp; Packages</CardTitle>
          <div className="flex gap-2">
            <SellPlanDialog
              label="Membership" plansEndpoint="/api/erp/membership-plans/" sellEndpoint="/api/erp/customer-memberships/sell/"
              customerName={customerName} customerPhone={c.phone || ""} onSold={() => qc.invalidateQueries({ queryKey: key })}
            />
            <SellPlanDialog
              label="Package" plansEndpoint="/api/erp/package-plans/" sellEndpoint="/api/erp/packages/sell/"
              customerName={customerName} customerPhone={c.phone || ""} onSold={() => qc.invalidateQueries({ queryKey: key })}
            />
          </div>
        </CardHeader>
        <CardContent>
          {c.active_membership ? (
            <div className="text-sm">
              <span className="font-medium">{c.active_membership.tier_name}</span>
              <span className="text-muted-foreground"> · {c.active_membership.discount_percentage}% off · valid until {c.active_membership.end_date}</span>
              {c.active_membership.is_frozen && <span className="ml-2 text-xs text-amber-600">(frozen)</span>}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No active membership.</div>
          )}
          {!c.phone && (
            <div className="text-xs text-muted-foreground mt-2">A phone number is required to sell a membership or package to this customer.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Skin / Hair notes</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} />
          <Button size="sm" onClick={() => saveNotes.mutate()} disabled={saveNotes.isPending}>
            {saveNotes.isPending ? "Saving…" : "Save notes"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Visit history</CardTitle></CardHeader>
        <CardContent>
          {visits.length === 0 ? (
            <div className="text-sm text-muted-foreground">No visits yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr><th className="py-1">Date</th><th>Service</th><th>Therapist</th><th className="text-right">Amount</th></tr>
              </thead>
              <tbody>
                {visits.map((v, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-1">{formatDateTime(v.date || v.start_time || v.created_at)}</td>
                    <td>{v.service_name || v.service || "—"}</td>
                    <td>{v.therapist_name || v.therapist || "—"}</td>
                    <td className="text-right">{formatINR(v.amount ?? v.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
