import { useState } from "react";
import { useQuery, useQueryClient } from "@/hooks/useFetch";
import { api, ApiError } from "@/lib/api";
import { toArray, formatINR, formatDateTime } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RowActionsMenu } from "@/components/row-actions-menu";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, PackageCheck } from "lucide-react";

type Vendor = { id: number | string; name: string };
type Product = { id: number | string; name: string; sku: string; cost_price: number };
type PurchaseOrder = {
  id: number | string; vendor_name: string | null; status: string; total_amount: number; created_at: string;
};
type LineItem = { product: string; quantity: string; unit_cost: string };

export default function PurchaseOrders() {
  const qc = useQueryClient();
  const listQ = useQuery({ queryKey: ["/api/erp/purchase-orders/"], queryFn: () => api<unknown>("/api/erp/purchase-orders/") });
  const vendorsQ = useQuery({ queryKey: ["/api/erp/vendors/"], queryFn: () => api<unknown>("/api/erp/vendors/") });
  const productsQ = useQuery({ queryKey: ["/api/erp/products/"], queryFn: () => api<unknown>("/api/erp/products/") });
  const orders = toArray<PurchaseOrder>(listQ.data);
  const vendors = toArray<Vendor>(vendorsQ.data);
  const products = toArray<Product>(productsQ.data);
  const productById = (id: string) => products.find((p) => String(p.id) === id);

  const [creating, setCreating] = useState(false);
  const [vendor, setVendor] = useState("");
  const [lines, setLines] = useState<LineItem[]>([{ product: "", quantity: "1", unit_cost: "" }]);
  const [saving, setSaving] = useState(false);

  function addLine() {
    setLines((l) => [...l, { product: "", quantity: "1", unit_cost: "" }]);
  }
  function updateLine(i: number, patch: Partial<LineItem>) {
    setLines((l) => l.map((row, idx) => {
      if (idx !== i) return row;
      const next = { ...row, ...patch };
      if (patch.product) {
        const p = productById(patch.product);
        if (p && !next.unit_cost) next.unit_cost = String(p.cost_price);
      }
      return next;
    }));
  }
  function removeLine(i: number) {
    setLines((l) => l.filter((_, idx) => idx !== i));
  }

  async function createOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!vendor) return toast.error("Pick a vendor");
    const items = lines.filter((l) => l.product && Number(l.quantity) > 0).map((l) => ({
      product: l.product, quantity: Number(l.quantity), unit_cost: l.unit_cost || "0",
    }));
    if (items.length === 0) return toast.error("Add at least one product line");
    setSaving(true);
    try {
      await api("/api/erp/purchase-orders/", { method: "POST", body: { vendor, items } });
      toast.success("Purchase order created");
      setVendor("");
      setLines([{ product: "", quantity: "1", unit_cost: "" }]);
      setCreating(false);
      qc.invalidateQueries({ queryKey: ["/api/erp/purchase-orders/"] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not create purchase order");
    } finally {
      setSaving(false);
    }
  }

  async function receiveOrder(id: number | string) {
    try {
      await api(`/api/erp/purchase-orders/${id}/receive/`, { method: "POST" });
      toast.success("Marked received — stock updated");
      qc.invalidateQueries({ queryKey: ["/api/erp/purchase-orders/"] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not receive order");
    }
  }

  async function deleteOrder(id: number | string) {
    if (!confirm("Delete this purchase order?")) return;
    try {
      await api(`/api/erp/purchase-orders/${id}/`, { method: "DELETE" });
      toast.success("Purchase order deleted");
      qc.invalidateQueries({ queryKey: ["/api/erp/purchase-orders/"] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not delete order");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-sm text-muted-foreground">Order stock from vendors. Receiving an order updates inventory.</p>
        </div>
        <Button size="sm" onClick={() => setCreating((v) => !v)}><Plus className="h-4 w-4 mr-1" /> New</Button>
      </div>

      {creating && (
        <Card>
          <CardHeader><CardTitle className="text-base">Create Purchase Order</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={createOrder}>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Vendor</label>
                <select
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className="flex h-9 w-full max-w-sm rounded-md border border-input bg-transparent px-3 text-sm"
                  required
                >
                  <option value="">Select vendor…</option>
                  {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Line Items</label>
                {lines.map((line, i) => (
                  <div key={i} className="flex gap-2">
                    <select
                      value={line.product}
                      onChange={(e) => updateLine(i, { product: e.target.value })}
                      className="flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 text-sm"
                    >
                      <option value="">Select product…</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                    </select>
                    <Input type="number" min={1} placeholder="Qty" value={line.quantity} onChange={(e) => updateLine(i, { quantity: e.target.value })} className="w-24" />
                    <Input type="number" step="0.01" placeholder="Unit cost" value={line.unit_cost} onChange={(e) => updateLine(i, { unit_cost: e.target.value })} className="w-32" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(i)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button type="button" variant="ghost" size="sm" onClick={addLine}><Plus className="h-3 w-3 mr-1" /> Add Line</Button>
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
          {listQ.isLoading ? (
            <div className="p-8 flex items-center justify-center text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…</div>
          ) : listQ.isError ? (
            <div className="p-6 text-sm text-destructive">{(listQ.error as Error).message}</div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No purchase orders yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>{o.vendor_name ?? "—"}</TableCell>
                    <TableCell><Badge variant={o.status === "RECEIVED" ? "default" : "outline"}>{o.status}</Badge></TableCell>
                    <TableCell className="text-right font-medium">{formatINR(o.total_amount)}</TableCell>
                    <TableCell>{formatDateTime(o.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <RowActionsMenu>
                        {o.status === "PENDING" && (
                          <>
                            <DropdownMenuItem onSelect={() => receiveOrder(o.id)}>
                              <PackageCheck className="h-4 w-4 mr-2" /> Mark Received
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => deleteOrder(o.id)}>
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </>
                        )}
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
