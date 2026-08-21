import { useState } from "react";
import { useQuery, useQueryClient } from "@/hooks/useFetch";
import { api, ApiError } from "@/lib/api";
import { toArray, formatINR } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SellPlanDialog } from "@/components/sell-plan-dialog";
import { RowActionsMenu } from "@/components/row-actions-menu";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Eye, EyeOff } from "lucide-react";

type PackagePlan = {
  id: string; name: string; service_credits: Record<string, number>; validity_days: number; price_paise: number; is_active: boolean;
};
type StoreServiceLite = { id: string; name: string };

export default function PackagePlans() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["/api/erp/package-plans/"], queryFn: () => api<unknown>("/api/erp/package-plans/") });
  const servicesQ = useQuery({ queryKey: ["/api/erp/store-services/"], queryFn: () => api<{ data: StoreServiceLite[] }>("/api/erp/store-services/") });
  const plans = toArray<PackagePlan>(list.data);
  const services = toArray<StoreServiceLite>(servicesQ.data);
  const serviceName = (id: string) => services.find((s) => s.id === id)?.name ?? id;

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [validityDays, setValidityDays] = useState("180");
  const [price, setPrice] = useState("");
  const [rows, setRows] = useState<{ store_service_id: string; credits: string }[]>([{ store_service_id: "", credits: "1" }]);
  const [saving, setSaving] = useState(false);

  function addRow() {
    setRows((r) => [...r, { store_service_id: "", credits: "1" }]);
  }
  function updateRow(i: number, patch: Partial<{ store_service_id: string; credits: string }>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function removeRow(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }

  async function createPlan(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price) return;
    const service_credits: Record<string, number> = {};
    for (const row of rows) {
      if (row.store_service_id && Number(row.credits) > 0) service_credits[row.store_service_id] = Number(row.credits);
    }
    if (Object.keys(service_credits).length === 0) return toast.error("Add at least one service with credits");
    setSaving(true);
    try {
      await api("/api/erp/package-plans/", {
        method: "POST",
        body: { name: name.trim(), service_credits, validity_days: Number(validityDays) || 180, price_paise: Math.round(Number(price) * 100) },
      });
      toast.success("Package plan created");
      setName(""); setPrice(""); setValidityDays("180"); setRows([{ store_service_id: "", credits: "1" }]);
      setCreating(false);
      qc.invalidateQueries({ queryKey: ["/api/erp/package-plans/"] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not create package plan");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(plan: PackagePlan) {
    try {
      await api(`/api/erp/package-plans/${plan.id}/`, { method: "PATCH", body: { is_active: !plan.is_active } });
      toast.success(plan.is_active ? "Package deactivated" : "Package activated");
      list.refetch();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not update package");
    }
  }

  async function deletePlan(id: string) {
    if (!confirm("Delete this service package?")) return;
    try {
      await api(`/api/erp/package-plans/${id}/`, { method: "DELETE" });
      toast.success("Package deleted");
      list.refetch();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not delete package");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Service Packages</h1>
          <p className="text-sm text-muted-foreground">Bundles of pre-paid service sessions, redeemable at POS checkout.</p>
        </div>
        <Button size="sm" onClick={() => setCreating((v) => !v)}><Plus className="h-4 w-4 mr-1" /> New Package</Button>
      </div>

      {creating && (
        <Card>
          <CardHeader><CardTitle className="text-base">Create Package</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={createPlan}>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Validity (days)</label>
                  <Input type="number" value={validityDays} onChange={(e) => setValidityDays(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Price Customer Pays (₹)</label>
                  <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Included Sessions</label>
                {rows.map((row, i) => (
                  <div key={i} className="flex gap-2">
                    <select
                      value={row.store_service_id}
                      onChange={(e) => updateRow(i, { store_service_id: e.target.value })}
                      className="flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 text-sm"
                    >
                      <option value="">Select service…</option>
                      {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <Input type="number" min={1} value={row.credits} onChange={(e) => updateRow(i, { credits: e.target.value })} className="w-24" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(i)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button type="button" variant="ghost" size="sm" onClick={addRow}><Plus className="h-3 w-3 mr-1" /> Add Service</Button>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setCreating(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {list.isLoading ? (
            <div className="p-8 flex items-center justify-center text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…</div>
          ) : list.isError ? (
            <div className="p-6 text-sm text-destructive">{(list.error as Error).message}</div>
          ) : plans.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No packages yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Sessions</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell className="text-xs">
                      {Object.entries(p.service_credits).map(([sid, credits]) => `${serviceName(sid)} × ${credits}`).join(", ")}
                    </TableCell>
                    <TableCell>{formatINR(p.price_paise / 100)}</TableCell>
                    <TableCell>{p.validity_days} days</TableCell>
                    <TableCell><Badge variant={p.is_active ? "default" : "outline"}>{p.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-1">
                        <SellPlanDialog sellEndpoint="/api/erp/packages/sell/" planId={p.id} planLabel={p.name} onSold={() => list.refetch()} />
                        <RowActionsMenu>
                          <DropdownMenuItem onSelect={() => toggleActive(p)}>
                            {p.is_active
                              ? <><EyeOff className="h-4 w-4 mr-2" /> Deactivate</>
                              : <><Eye className="h-4 w-4 mr-2" /> Activate</>}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => deletePlan(p.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </RowActionsMenu>
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
