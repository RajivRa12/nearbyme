import { useState } from "react";
import { useQuery, useQueryClient } from "@/hooks/useFetch";
import { api, ApiError } from "@/lib/api";
import { toArray, formatINR, formatDateTime } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SellPlanDialog } from "@/components/sell-plan-dialog";
import { RowActionsMenu } from "@/components/row-actions-menu";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Loader2, Plus, Eye, EyeOff, Trash2 } from "lucide-react";

type MembershipPlan = {
  id: string; name: string; value_paise: number; validity_days: number; price_paise: number; is_active: boolean;
};

export default function MembershipPlans() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["/api/erp/membership-plans/"], queryFn: () => api<unknown>("/api/erp/membership-plans/") });
  const plans = toArray<MembershipPlan>(list.data);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", value: "", validity_days: "365", price: "" });
  const [saving, setSaving] = useState(false);

  async function createPlan(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.value || !form.price) return;
    setSaving(true);
    try {
      await api("/api/erp/membership-plans/", {
        method: "POST",
        body: {
          name: form.name.trim(),
          value_paise: Math.round(Number(form.value) * 100),
          validity_days: Number(form.validity_days) || 365,
          price_paise: Math.round(Number(form.price) * 100),
        },
      });
      toast.success("Membership plan created");
      setForm({ name: "", value: "", validity_days: "365", price: "" });
      setCreating(false);
      qc.invalidateQueries({ queryKey: ["/api/erp/membership-plans/"] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not create plan");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(plan: MembershipPlan) {
    try {
      await api(`/api/erp/membership-plans/${plan.id}/`, { method: "PATCH", body: { is_active: !plan.is_active } });
      toast.success(plan.is_active ? "Plan deactivated" : "Plan activated");
      list.refetch();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not update plan");
    }
  }

  async function deletePlan(id: string) {
    if (!confirm("Delete this membership plan?")) return;
    try {
      await api(`/api/erp/membership-plans/${id}/`, { method: "DELETE" });
      toast.success("Plan deleted");
      list.refetch();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not delete plan");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Membership Plans</h1>
          <p className="text-sm text-muted-foreground">Prepaid wallet plans customers can buy and spend down at checkout.</p>
        </div>
        <Button size="sm" onClick={() => setCreating((v) => !v)}><Plus className="h-4 w-4 mr-1" /> New Plan</Button>
      </div>

      {creating && (
        <Card>
          <CardHeader><CardTitle className="text-base">Create Plan</CardTitle></CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={createPlan}>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Name</label>
                <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Validity (days)</label>
                <Input type="number" value={form.validity_days} onChange={(e) => setForm((s) => ({ ...s, validity_days: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Wallet Value (₹)</label>
                <Input type="number" value={form.value} onChange={(e) => setForm((s) => ({ ...s, value: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Price Customer Pays (₹)</label>
                <Input type="number" value={form.price} onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))} required />
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
          {list.isLoading ? (
            <div className="p-8 flex items-center justify-center text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…</div>
          ) : list.isError ? (
            <div className="p-6 text-sm text-destructive">{(list.error as Error).message}</div>
          ) : plans.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No membership plans yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Value</TableHead>
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
                    <TableCell>{formatINR(p.value_paise / 100)}</TableCell>
                    <TableCell>{formatINR(p.price_paise / 100)}</TableCell>
                    <TableCell>{p.validity_days} days</TableCell>
                    <TableCell><Badge variant={p.is_active ? "default" : "outline"}>{p.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-1">
                        <SellPlanDialog sellEndpoint="/api/erp/customer-memberships/sell/" planId={p.id} planLabel={p.name} onSold={() => list.refetch()} />
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
