import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from "@/hooks/useFetch";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR, formatDateTime, toArray } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";
import { Printer, CreditCard, Undo2 } from "lucide-react";

export default InvoiceDetail;

type Invoice = Record<string, any>;

function InvoiceDetail() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const key = ["invoice", invoiceId];

  const q = useQuery({
    queryKey: key,
    queryFn: () => api<Invoice>(`/api/erp/invoices/${invoiceId}/`),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const checkout = useMutation({
    mutationFn: () => api(`/api/erp/invoices/${invoiceId}/checkout/`, { method: "POST" }),
    onSuccess: () => { toast.success("Checked out"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const [payMethod, setPayMethod] = useState("cash");
  const [payAmount, setPayAmount] = useState("");
  const pay = useMutation({
    mutationFn: () => api(`/api/erp/invoices/${invoiceId}/pay/`, {
      method: "POST",
      body: { method: payMethod, amount: Number(payAmount) },
    }),
    onSuccess: () => { toast.success("Payment recorded"); setPayAmount(""); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const refund = useMutation({
    mutationFn: () => api(`/api/erp/invoices/${invoiceId}/refund/`, {
      method: "POST",
      body: { amount: Number(refundAmount), reason: refundReason },
    }),
    onSuccess: () => { toast.success("Refund issued"); setRefundAmount(""); setRefundReason(""); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const inv = q.data ?? {};
  const items = toArray<any>(inv.items ?? inv.line_items);

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/billing")}>← Back</Button>
          <h1 className="text-2xl font-semibold mt-2">Invoice #{invoiceId}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> Print GST
          </Button>
          <Button size="sm" onClick={() => checkout.mutate()} disabled={checkout.isPending}>
            <CreditCard className="h-4 w-4 mr-1" /> One-click checkout
          </Button>
        </div>
      </div>

      {q.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {q.isError && <div className="text-sm text-destructive">{(q.error as Error).message}</div>}

      {q.data && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Invoice</CardTitle></CardHeader>
            <CardContent className="grid gap-2 md:grid-cols-3 text-sm">
              <div><div className="text-muted-foreground">Customer</div><div>{inv.customer_name || inv.customer || "Walk-in"}</div></div>
              <div><div className="text-muted-foreground">Status</div><div>{inv.status || "—"}</div></div>
              <div><div className="text-muted-foreground">Total</div><div className="font-semibold">{formatINR(inv.total ?? inv.amount)}</div></div>
              <div><div className="text-muted-foreground">Created</div><div>{formatDateTime(inv.created_at || inv.created)}</div></div>
              <div><div className="text-muted-foreground">GSTIN</div><div>{inv.gstin || "—"}</div></div>
              <div><div className="text-muted-foreground">Tax</div><div>{formatINR(inv.tax)}</div></div>
            </CardContent>
          </Card>

          {items.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Items</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr><th className="py-1">Item</th><th>Qty</th><th className="text-right">Amount</th></tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => (
                      <tr key={i} className="border-t">
                        <td className="py-1">{it.name || it.service_name || it.description || `#${it.id ?? i}`}</td>
                        <td>{it.qty ?? it.quantity ?? 1}</td>
                        <td className="text-right">{formatINR(it.amount ?? it.total ?? it.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 print:hidden">
            <Card>
              <CardHeader><CardTitle className="text-base">Split payment</CardTitle></CardHeader>
              <CardContent>
                <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); pay.mutate(); }}>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Method (cash/card/upi)" value={payMethod} onChange={(e) => setPayMethod(e.target.value)} />
                    <Input placeholder="Amount" type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required />
                  </div>
                  <Button type="submit" size="sm" disabled={pay.isPending}>Record payment</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Undo2 className="h-4 w-4" /> Refund</CardTitle></CardHeader>
              <CardContent>
                <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); refund.mutate(); }}>
                  <Input placeholder="Amount" type="number" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} required />
                  <Input placeholder="Reason" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
                  <Button type="submit" size="sm" variant="destructive" disabled={refund.isPending}>Issue refund</Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
