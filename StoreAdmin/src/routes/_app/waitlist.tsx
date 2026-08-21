import { useState } from "react";
import { useQuery, useQueryClient } from "@/hooks/useFetch";
import { api, ApiError } from "@/lib/api";
import { toArray, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

type Customer = { id: number | string; name: string; full_name?: string; email: string; phone: string };
type Service = { id: number | string; name: string; price: number; duration_minutes: number };
type WaitlistEntry = {
  id: number | string; customer_name: string | null; service_name: string | null;
  preferred_date: string; preferred_time_slot: string; status: string;
};

const STATUS_OPTIONS = [
  { value: "WAITING", label: "Waiting" },
  { value: "NOTIFIED", label: "Notified" },
  { value: "BOOKED", label: "Booked" },
  { value: "CANCELLED", label: "Cancelled" },
];
const TIME_SLOTS = ["Morning", "Afternoon", "Evening"];

export default function Waitlist() {
  const qc = useQueryClient();
  const listQ = useQuery({ queryKey: ["/api/erp/waitlist/"], queryFn: () => api<unknown>("/api/erp/waitlist/") });
  const customersQ = useQuery({ queryKey: ["/api/erp/customers/"], queryFn: () => api<unknown>("/api/erp/customers/") });
  const servicesQ = useQuery({ queryKey: ["/api/erp/services/"], queryFn: () => api<unknown>("/api/erp/services/") });
  const entries = toArray<WaitlistEntry>(listQ.data);
  const customers = toArray<Customer>(customersQ.data);
  const services = toArray<Service>(servicesQ.data);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    customer: "", service: "", preferred_date: new Date().toISOString().slice(0, 10), preferred_time_slot: "Morning",
  });
  const [saving, setSaving] = useState(false);

  async function createEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!form.service) return toast.error("Pick a service");
    setSaving(true);
    try {
      await api("/api/erp/waitlist/", {
        method: "POST",
        body: { ...form, customer: form.customer || undefined },
      });
      toast.success("Added to waitlist");
      setCreating(false);
      qc.invalidateQueries({ queryKey: ["/api/erp/waitlist/"] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not add to waitlist");
    } finally {
      setSaving(false);
    }
  }

  async function removeEntry(id: number | string) {
    if (!confirm("Remove this waitlist entry?")) return;
    try {
      await api(`/api/erp/waitlist/${id}/`, { method: "DELETE" });
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["/api/erp/waitlist/"] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not remove entry");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Waitlist</h1>
          <p className="text-sm text-muted-foreground">Customers waiting for a slot to open up.</p>
        </div>
        <Button size="sm" onClick={() => setCreating((v) => !v)}><Plus className="h-4 w-4 mr-1" /> New</Button>
      </div>

      {creating && (
        <Card>
          <CardHeader><CardTitle className="text-base">Add to Waitlist</CardTitle></CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={createEntry}>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Customer</label>
                <select
                  value={form.customer}
                  onChange={(e) => setForm((s) => ({ ...s, customer: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">Select customer…</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name || c.name} {c.phone ? `(${c.phone})` : ""}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Service</label>
                <select
                  value={form.service}
                  onChange={(e) => setForm((s) => ({ ...s, service: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  required
                >
                  <option value="">Select service…</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes}m)</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Preferred Date</label>
                <Input type="date" value={form.preferred_date} onChange={(e) => setForm((s) => ({ ...s, preferred_date: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Preferred Time</label>
                <select
                  value={form.preferred_time_slot}
                  onChange={(e) => setForm((s) => ({ ...s, preferred_time_slot: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" size="sm" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setCreating(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {listQ.isLoading ? (
            <div className="p-8 flex items-center justify-center text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…</div>
          ) : listQ.isError ? (
            <div className="p-6 text-sm text-destructive">{(listQ.error as Error).message}</div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No one on the waitlist.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Preferred</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{e.customer_name ?? "—"}</TableCell>
                    <TableCell>{e.service_name ?? "—"}</TableCell>
                    <TableCell>{formatDate(e.preferred_date)} · {e.preferred_time_slot}</TableCell>
                    <TableCell><Badge variant="outline">{e.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => removeEntry(e.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
