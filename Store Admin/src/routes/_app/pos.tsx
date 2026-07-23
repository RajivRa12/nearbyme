import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from "@/hooks/useFetch";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { toArray, formatINR } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Plus, Minus, Trash2, ShoppingBag, User as UserIcon, Receipt as ReceiptIcon } from "lucide-react";

export default POS;

type Item = { id: string; name: string; price: number; qty: number; kind: "service" | "product" };

const TAX_RATE = 0.05;

function POS() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"service" | "product">("service");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [customer, setCustomer] = useState<string>("");
  const [discountPct, setDiscountPct] = useState(0);

  const services = useQuery({ queryKey: ["services"], queryFn: () => api<unknown>("/api/erp/services/") });
  const products = useQuery({ queryKey: ["products"], queryFn: () => api<unknown>("/api/erp/products/") });
  const customers = useQuery({ queryKey: ["crm"], queryFn: () => api<unknown>("/api/erp/crm/") });

  const list = tab === "service" ? toArray<any>(services.data) : toArray<any>(products.data);
  const filtered = q ? list.filter((r) => (r.name ?? "").toLowerCase().includes(q.toLowerCase())) : list;

  const add = (r: any) => {
    setItems((prev) => {
      const id = tab + "-" + r.id;
      const found = prev.find((p) => p.id === id);
      if (found) return prev.map((p) => (p.id === id ? { ...p, qty: p.qty + 1 } : p));
      return [...prev, { id, name: r.name, price: r.price ?? 0, qty: 1, kind: tab }];
    });
  };
  const setQty = (id: string, delta: number) => {
    setItems((prev) => prev.flatMap((p) => (p.id === id ? [{ ...p, qty: Math.max(0, p.qty + delta) }] : [p])).filter((p) => p.qty > 0));
  };
  const remove = (id: string) => setItems((prev) => prev.filter((p) => p.id !== id));

  const { subtotal, discount, tax, total } = useMemo(() => {
    const sub = items.reduce((s, i) => s + i.price * i.qty, 0);
    const disc = (sub * discountPct) / 100;
    const t = (sub - disc) * TAX_RATE;
    return { subtotal: sub, discount: disc, tax: t, total: sub - disc + t };
  }, [items, discountPct]);

  const checkout = useMutation({
    mutationFn: () =>
      api("/api/erp/invoices/", {
        method: "POST",
        body: {
          customer_name: customer || "Walk-in",
          customer: customer || "Walk-in",
          items: items.map((i) => ({ name: i.name, qty: i.qty, amount: i.price })),
          subtotal,
          discount,
          tax,
          total,
          amount: total,
          status: "paid",
        },
      }),
    onSuccess: (inv: any) => {
      toast.success(`Sale completed · ${formatINR(total)}`);
      qc.invalidateQueries({ queryKey: ["/api/erp/invoices/"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setItems([]);
      setDiscountPct(0);
      setCustomer("");
      navigate(`/billing/${String(inv.id)}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4 min-w-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New Sale</h1>
          <p className="text-sm text-muted-foreground">Quick point-of-sale for services and products.</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex rounded-md border p-0.5">
                <Button size="sm" variant={tab === "service" ? "default" : "ghost"} className="h-8" onClick={() => setTab("service")}>Services</Button>
                <Button size="sm" variant={tab === "product" ? "default" : "ghost"} className="h-8" onClick={() => setTab("product")}>Products</Button>
              </div>
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder={`Search ${tab}s…`} value={q} onChange={(e) => setQ(e.target.value)} className="pl-8 h-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((r) => (
                <button
                  key={r.id}
                  onClick={() => add(r)}
                  className="text-left p-3 rounded-lg border hover:border-primary hover:bg-primary/5 transition group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{r.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {tab === "service" ? `${r.duration_min}m · ${r.category}` : r.sku}
                      </div>
                    </div>
                    <div className="text-sm font-semibold whitespace-nowrap">{formatINR(r.price)}</div>
                  </div>
                  {tab === "product" && (
                    <div className="mt-2">
                      <Badge variant={r.stock <= r.low_stock_at ? "destructive" : "secondary"} className="text-[10px]">
                        {r.stock} in stock
                      </Badge>
                    </div>
                  )}
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="col-span-full text-sm text-muted-foreground text-center py-8">No matches.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><UserIcon className="h-4 w-4" /> Customer</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              list="pos-customers"
              placeholder="Walk-in or type name…"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
            />
            <datalist id="pos-customers">
              {toArray<any>(customers.data).map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><ShoppingBag className="h-4 w-4" /> Cart · {items.length}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[40vh] overflow-auto">
            {items.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-6">Tap services or products to add.</div>
            )}
            {items.map((i) => (
              <div key={i.id} className="flex items-center gap-2 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{i.name}</div>
                  <div className="text-xs text-muted-foreground">{formatINR(i.price)} × {i.qty}</div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setQty(i.id, -1)}><Minus className="h-3 w-3" /></Button>
                  <span className="w-6 text-center">{i.qty}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setQty(i.id, 1)}><Plus className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(i.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            ))}
          </CardContent>
          <div className="border-t px-6 py-3 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatINR(subtotal)}</span></div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Discount %</span>
              <Input type="number" min={0} max={100} value={discountPct} onChange={(e) => setDiscountPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} className="h-7 w-20 text-right" />
            </div>
            <div className="flex justify-between text-muted-foreground text-xs"><span>Discount</span><span>−{formatINR(discount)}</span></div>
            <div className="flex justify-between text-muted-foreground text-xs"><span>Tax (5%)</span><span>{formatINR(tax)}</span></div>
            <div className="flex justify-between text-base font-semibold pt-1 border-t">
              <span>Total</span><span>{formatINR(total)}</span>
            </div>
            <Button
              className="w-full mt-2"
              size="lg"
              disabled={items.length === 0 || checkout.isPending}
              onClick={() => checkout.mutate()}
            >
              <ReceiptIcon className="h-4 w-4 mr-2" />
              {checkout.isPending ? "Processing…" : `Charge ${formatINR(total)}`}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
