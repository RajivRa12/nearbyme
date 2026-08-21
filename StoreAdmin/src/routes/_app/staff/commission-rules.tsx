import { useState } from "react";
import { useQuery, useQueryClient } from "@/hooks/useFetch";
import { api, ApiError } from "@/lib/api";
import { toArray } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RowActionsMenu } from "@/components/row-actions-menu";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

type Professional = { id: string; display_name: string };
type CommissionRule = {
  id: string; professional: string | null; professional_name: string | null;
  applies_to: string; rate_type: string; rate_value: string; effective_from: string;
};

const APPLIES_TO = [
  { value: "service", label: "Service" },
  { value: "product", label: "Product" },
  { value: "category", label: "Category" },
];
const RATE_TYPES = [
  { value: "percent", label: "Percent (%)" },
  { value: "flat", label: "Flat (₹)" },
];

export default function CommissionRules() {
  const qc = useQueryClient();
  const rulesQ = useQuery({ queryKey: ["/api/erp/commission-rules/"], queryFn: () => api<unknown>("/api/erp/commission-rules/") });
  const professionalsQ = useQuery({ queryKey: ["/api/erp/professionals/"], queryFn: () => api<unknown>("/api/erp/professionals/") });
  const rules = toArray<CommissionRule>(rulesQ.data);
  const professionals = toArray<Professional>(professionalsQ.data);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    professional: "", applies_to: "service", rate_type: "percent", rate_value: "",
    effective_from: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);

  async function createRule(e: React.FormEvent) {
    e.preventDefault();
    if (!form.rate_value) return;
    setSaving(true);
    try {
      await api("/api/erp/commission-rules/", {
        method: "POST",
        body: {
          professional: form.professional || null,
          applies_to: form.applies_to,
          rate_type: form.rate_type,
          rate_value: form.rate_value,
          effective_from: form.effective_from,
        },
      });
      toast.success("Commission rule created");
      setForm((s) => ({ ...s, rate_value: "" }));
      setCreating(false);
      qc.invalidateQueries({ queryKey: ["/api/erp/commission-rules/"] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not create rule");
    } finally {
      setSaving(false);
    }
  }

  async function removeRule(id: string) {
    if (!confirm("Delete this commission rule?")) return;
    try {
      await api(`/api/erp/commission-rules/${id}/`, { method: "DELETE" });
      toast.success("Rule removed");
      qc.invalidateQueries({ queryKey: ["/api/erp/commission-rules/"] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not remove rule");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Commission Rules</h1>
          <p className="text-sm text-muted-foreground">What each professional earns per service, product, or category. Applied automatically when an invoice is finalised.</p>
        </div>
        <Button size="sm" onClick={() => setCreating((v) => !v)}><Plus className="h-4 w-4 mr-1" /> New Rule</Button>
      </div>

      {creating && (
        <Card>
          <CardHeader><CardTitle className="text-base">Create Rule</CardTitle></CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={createRule}>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Professional</label>
                <select
                  value={form.professional}
                  onChange={(e) => setForm((s) => ({ ...s, professional: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">Everyone</option>
                  {professionals.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Applies To</label>
                <select
                  value={form.applies_to}
                  onChange={(e) => setForm((s) => ({ ...s, applies_to: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  {APPLIES_TO.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Rate Type</label>
                <select
                  value={form.rate_type}
                  onChange={(e) => setForm((s) => ({ ...s, rate_type: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  {RATE_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Rate Value</label>
                <Input type="number" step="0.01" value={form.rate_value} onChange={(e) => setForm((s) => ({ ...s, rate_value: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Effective From</label>
                <Input type="date" value={form.effective_from} onChange={(e) => setForm((s) => ({ ...s, effective_from: e.target.value }))} required />
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
          {rulesQ.isLoading ? (
            <div className="p-8 flex items-center justify-center text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…</div>
          ) : rulesQ.isError ? (
            <div className="p-6 text-sm text-destructive">{(rulesQ.error as Error).message}</div>
          ) : rules.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No commission rules yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Professional</TableHead>
                  <TableHead>Applies To</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Effective From</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.professional_name ?? "Everyone"}</TableCell>
                    <TableCell className="capitalize">{r.applies_to}</TableCell>
                    <TableCell>{r.rate_type === "percent" ? `${r.rate_value}%` : `₹${r.rate_value}`}</TableCell>
                    <TableCell>{r.effective_from}</TableCell>
                    <TableCell className="text-right">
                      <RowActionsMenu>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => removeRule(r.id)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </RowActionsMenu>
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
