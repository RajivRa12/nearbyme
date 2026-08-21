import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@/hooks/useFetch";
import { api, ApiError } from "@/lib/api";
import { toArray } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, PhoneCall, Play, Check, X, UserX } from "lucide-react";

type Service = { id: number | string; name: string; duration_minutes?: number; duration_min?: number };
type Professional = { id: number | string; display_name: string };
type QueueEntry = {
  id: string;
  name: string | null;
  phone: string | null;
  service_name: string | null;
  professional_name: string | null;
  status: "waiting" | "called" | "in_service" | "completed" | "cancelled" | "no_show";
  checked_in_at: string;
  position: number | null;
  estimated_wait_minutes: number | null;
};

const REFRESH_MS = 8000;

const STATUS_LABEL: Record<QueueEntry["status"], string> = {
  waiting: "Waiting", called: "Called", in_service: "In service",
  completed: "Completed", cancelled: "Cancelled", no_show: "No show",
};

function elapsedMinutes(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

export default function Queue() {
  const qc = useQueryClient();
  const listQ = useQuery({ queryKey: ["/api/erp/queue/"], queryFn: () => api<unknown>("/api/erp/queue/") });
  const servicesQ = useQuery({ queryKey: ["/api/erp/store-services/"], queryFn: () => api<{ data: Service[] }>("/api/erp/store-services/") });
  const professionalsQ = useQuery({ queryKey: ["/api/erp/professionals/"], queryFn: () => api<unknown>("/api/erp/professionals/") });
  const entries = toArray<QueueEntry>(listQ.data);
  const services = toArray<Service>((servicesQ.data as any)?.data ?? servicesQ.data);
  const professionals = toArray<Professional>(professionalsQ.data);

  useEffect(() => {
    const interval = setInterval(() => qc.invalidateQueries({ queryKey: ["/api/erp/queue/"] }), REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ guest_name: "", guest_phone: "", store_service: "", professional: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  async function checkIn(e: React.FormEvent) {
    e.preventDefault();
    if (!form.guest_name.trim()) return toast.error("Name is required");
    setSaving(true);
    try {
      await api("/api/erp/queue/", {
        method: "POST",
        body: {
          guest_name: form.guest_name.trim(),
          guest_phone: form.guest_phone.trim() || undefined,
          store_service: form.store_service || undefined,
          professional: form.professional || undefined,
          notes: form.notes.trim() || undefined,
        },
      });
      toast.success(`${form.guest_name.trim()} checked in`);
      setForm({ guest_name: "", guest_phone: "", store_service: "", professional: "", notes: "" });
      setCreating(false);
      qc.invalidateQueries({ queryKey: ["/api/erp/queue/"] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not check in");
    } finally {
      setSaving(false);
    }
  }

  async function act(id: string, action: "call" | "start" | "complete" | "cancel" | "no-show") {
    setActingId(id);
    try {
      await api(`/api/erp/queue/${id}/${action}/`, { method: "POST" });
      qc.invalidateQueries({ queryKey: ["/api/erp/queue/"] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not update");
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Queue</h1>
          <p className="text-sm text-muted-foreground">Who's here right now — check in walk-ins and call them in turn.</p>
        </div>
        <Button size="sm" onClick={() => setCreating((v) => !v)}><Plus className="h-4 w-4 mr-1" /> Check in</Button>
      </div>

      {creating && (
        <Card>
          <CardHeader><CardTitle className="text-base">Check in a walk-in</CardTitle></CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={checkIn}>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Name</label>
                <Input value={form.guest_name} onChange={(e) => setForm((s) => ({ ...s, guest_name: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Phone</label>
                <Input value={form.guest_phone} onChange={(e) => setForm((s) => ({ ...s, guest_phone: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Service (optional)</label>
                <select
                  value={form.store_service}
                  onChange={(e) => setForm((s) => ({ ...s, store_service: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">Not decided yet</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Preferred professional (optional)</label>
                <select
                  value={form.professional}
                  onChange={(e) => setForm((s) => ({ ...s, professional: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">No preference</option>
                  {professionals.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs text-muted-foreground">Notes</label>
                <Input value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" size="sm" disabled={saving}>{saving ? "Checking in…" : "Check in"}</Button>
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
            <div className="p-8 text-center text-sm text-muted-foreground">No one waiting right now.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Waiting</TableHead>
                  <TableHead>Est. wait</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{e.position ?? "—"}</TableCell>
                    <TableCell>
                      <div className="font-medium">{e.name ?? "—"}</div>
                      {e.phone && <div className="text-xs text-muted-foreground">{e.phone}</div>}
                    </TableCell>
                    <TableCell>{e.service_name ?? "Not decided"}{e.professional_name ? ` · ${e.professional_name}` : ""}</TableCell>
                    <TableCell>{elapsedMinutes(e.checked_in_at)}m</TableCell>
                    <TableCell>{e.estimated_wait_minutes != null ? `~${e.estimated_wait_minutes}m` : "—"}</TableCell>
                    <TableCell><Badge variant="outline">{STATUS_LABEL[e.status]}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {e.status === "waiting" && (
                          <Button variant="ghost" size="icon" title="Call" disabled={actingId === e.id} onClick={() => act(e.id, "call")}>
                            <PhoneCall className="h-4 w-4" />
                          </Button>
                        )}
                        {e.status === "called" && (
                          <Button variant="ghost" size="icon" title="Start service" disabled={actingId === e.id} onClick={() => act(e.id, "start")}>
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {e.status === "in_service" && (
                          <Button variant="ghost" size="icon" title="Complete" disabled={actingId === e.id} onClick={() => act(e.id, "complete")}>
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        {(e.status === "waiting" || e.status === "called") && (
                          <Button variant="ghost" size="icon" title="No show" disabled={actingId === e.id} onClick={() => act(e.id, "no-show")}>
                            <UserX className="h-4 w-4" />
                          </Button>
                        )}
                        {e.status !== "completed" && e.status !== "cancelled" && e.status !== "no_show" && (
                          <Button variant="ghost" size="icon" title="Cancel" disabled={actingId === e.id} onClick={() => act(e.id, "cancel")}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
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
