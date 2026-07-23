import { useState } from "react";
import { useQuery } from "@/hooks/useFetch";
import { api } from "@/lib/api";
import { toArray, formatINR } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default Products;

function Products() {
  const [lowOnly, setLowOnly] = useState(false);
  const [q, setQ] = useState("");
  const list = useQuery({
    queryKey: ["/api/erp/products/", lowOnly],
    queryFn: () => api<unknown>(`/api/erp/products/${lowOnly ? "?low_stock=true" : ""}`),
  });

  const rows = toArray<any>(list.data).filter((r) =>
    q ? JSON.stringify(r).toLowerCase().includes(q.toLowerCase()) : true,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">Inventory with low-stock alerts.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="w-48" />
          <Button variant={lowOnly ? "default" : "outline"} size="sm" onClick={() => setLowOnly((v) => !v)}>
            {lowOnly ? "Showing low stock" : "Low stock only"}
          </Button>
        </div>
      </div>

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
                  <TableHead>#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => {
                  const stock = Number(r.stock ?? r.quantity ?? 0);
                  const threshold = Number(r.low_stock_threshold ?? r.reorder_level ?? 5);
                  const low = stock <= threshold;
                  return (
                    <TableRow key={r.id ?? i}>
                      <TableCell>{r.id ?? i}</TableCell>
                      <TableCell>{r.name || "—"}</TableCell>
                      <TableCell>{r.sku || "—"}</TableCell>
                      <TableCell>{stock}</TableCell>
                      <TableCell>{formatINR(r.price)}</TableCell>
                      <TableCell>
                        {low ? <Badge variant="destructive">Low</Badge> : <Badge variant="secondary">OK</Badge>}
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
