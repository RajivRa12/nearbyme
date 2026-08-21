import { useState } from "react";
import { useQuery, useQueryClient } from "@/hooks/useFetch";
import { api, ApiError } from "@/lib/api";
import { toArray, formatINR } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RowActionsMenu } from "@/components/row-actions-menu";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Plus, Eye, EyeOff, Trash2 } from "lucide-react";

export default Products;

function Products() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const list = useQuery({
    queryKey: ["/api/erp/products/"],
    queryFn: () => api<unknown>(`/api/erp/products/`),
  });

  const rows = toArray<any>(list.data).filter((r) =>
    q ? JSON.stringify(r).toLowerCase().includes(q.toLowerCase()) : true,
  );

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", sku: "", brand: "", retail_price: "", cost_price: "", stock_quantity: "0", low_stock_warning: "5" });
  const [saving, setSaving] = useState(false);

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/api/erp/products/", {
        method: "POST",
        body: {
          name: form.name,
          sku: form.sku,
          brand: form.brand || null,
          retail_price: form.retail_price,
          cost_price: form.cost_price,
          stock_quantity: Number(form.stock_quantity) || 0,
          low_stock_warning: Number(form.low_stock_warning) || 5,
        },
      });
      toast.success("Product created");
      setForm({ name: "", sku: "", brand: "", retail_price: "", cost_price: "", stock_quantity: "0", low_stock_warning: "5" });
      setCreating(false);
      qc.invalidateQueries({ queryKey: ["/api/erp/products/"] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not create product");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(row: any) {
    try {
      await api(`/api/erp/products/${row.id}/`, { method: "PATCH", body: { is_active: !row.is_active } });
      toast.success(row.is_active ? "Product deactivated" : "Product activated");
      qc.invalidateQueries({ queryKey: ["/api/erp/products/"] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not update product");
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product?")) return;
    try {
      await api(`/api/erp/products/${id}/`, { method: "DELETE" });
      toast.success("Product deleted");
      qc.invalidateQueries({ queryKey: ["/api/erp/products/"] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not delete product");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">Manage your inventory products.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="w-48" />
          <Button size="sm" onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1" /> New</Button>
        </div>
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Product</DialogTitle>
            <DialogDescription>Add a retail or backbar product to inventory.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-4 md:grid-cols-2 py-1" onSubmit={createProduct}>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">SKU / Barcode</label>
              <Input value={form.sku} onChange={(e) => setForm((s) => ({ ...s, sku: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Brand</label>
              <Input value={form.brand} onChange={(e) => setForm((s) => ({ ...s, brand: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Cost Price (₹)</label>
              <Input type="number" step="0.01" value={form.cost_price} onChange={(e) => setForm((s) => ({ ...s, cost_price: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Retail Price (₹)</label>
              <Input type="number" step="0.01" value={form.retail_price} onChange={(e) => setForm((s) => ({ ...s, retail_price: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Opening Stock</label>
              <Input type="number" value={form.stock_quantity} onChange={(e) => setForm((s) => ({ ...s, stock_quantity: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Low Stock Warning</label>
              <Input type="number" value={form.low_stock_warning} onChange={(e) => setForm((s) => ({ ...s, low_stock_warning: e.target.value }))} />
            </div>
            <DialogFooter className="md:col-span-2 mt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setCreating(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          {list.isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : list.isError ? (
            <div className="p-6 text-sm text-destructive">{(list.error as Error).message}</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No products.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => {
                  const stock = Number(r.stock_quantity ?? 0);
                  const threshold = Number(r.low_stock_warning ?? 5);
                  const low = stock <= threshold;
                  return (
                    <TableRow key={r.id ?? i}>
                      <TableCell>{r.name || "—"}</TableCell>
                      <TableCell>{r.sku || "—"}</TableCell>
                      <TableCell>{stock}</TableCell>
                      <TableCell>{formatINR(r.retail_price)}</TableCell>
                      <TableCell className="flex gap-1 flex-wrap">
                        {low ? <Badge variant="destructive">Low</Badge> : <Badge variant="secondary">OK</Badge>}
                        {r.is_active === false && <Badge variant="outline">Inactive</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <RowActionsMenu>
                          <DropdownMenuItem onSelect={() => toggleActive(r)}>
                            {r.is_active === false
                              ? <><Eye className="h-4 w-4 mr-2" /> Activate</>
                              : <><EyeOff className="h-4 w-4 mr-2" /> Deactivate</>}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => deleteProduct(r.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </RowActionsMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
