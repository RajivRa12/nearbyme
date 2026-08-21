import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@/hooks/useFetch";
import { api, ApiError } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { formatINR, formatDateTime, toArray } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";
import { Printer, Lock, ReceiptText, Undo2, Send } from "lucide-react";

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" }, { value: "CARD", label: "Card" }, { value: "UPI", label: "UPI" },
  { value: "WALLET", label: "Wallet" }, { value: "GIFT_CARD", label: "Gift Card" },
  { value: "MEMBERSHIP_CREDIT", label: "Membership Credit" }, { value: "PACKAGE_CREDIT", label: "Package Credit" },
];

export default function InvoiceDetail() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const key = ["invoice", invoiceId];

  const q = useQuery({ queryKey: key, queryFn: () => api<{ data: Record<string, any> }>(`/api/erp/invoices/${invoiceId}/`) });
  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const finalise = useMutation({
    mutationFn: () => api(`/api/erp/invoices/${invoiceId}/finalise/`, { method: "POST" }),
    onSuccess: () => { toast.success("Invoice finalised"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const [payMethod, setPayMethod] = useState("CASH");
  const [payAmount, setPayAmount] = useState("");
  const pay = useMutation({
    mutationFn: () => api(`/api/erp/invoices/${invoiceId}/pay/`, { method: "POST", body: { payments: [{ method: payMethod, amount: Number(payAmount) }] } }),
    onSuccess: () => { toast.success("Payment recorded"); setPayAmount(""); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const refund = useMutation({
    mutationFn: () => api(`/api/erp/invoices/${invoiceId}/refund/`, { method: "POST" }),
    onSuccess: () => { toast.success("Refund issued"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendDigital = useMutation({
    mutationFn: () => api(`/api/erp/invoices/${invoiceId}/send_digital/`, { method: "POST" }),
    onSuccess: () => toast.success("Digital invoice sent"),
    onError: (e: Error) => toast.error(e instanceof ApiError ? e.message : "Could not send digital invoice"),
  });

  const [creditReason, setCreditReason] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditOpen, setCreditOpen] = useState(false);
  const creditNote = useMutation({
    mutationFn: () => api(`/api/erp/invoices/${invoiceId}/credit-note/`, {
      method: "POST", body: { reason: creditReason, amount_paise: Math.round(Number(creditAmount) * 100) },
    }),
    onSuccess: () => { toast.success("Credit note issued"); setCreditReason(""); setCreditAmount(""); setCreditOpen(false); invalidate(); },
    onError: (e: Error) => toast.error(e instanceof ApiError ? e.message : "Could not issue credit note"),
  });

  const inv = q.data?.data ?? {};
  const items = toArray<any>(inv.items);
  const payments = toArray<any>(inv.payments);
  const creditNotes = toArray<any>(inv.credit_notes);
  const isFinalised = !!inv.finalised_at;
  const customerName = inv.global_customer_name || inv.customer_details?.name || "Walk-in";

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex items-center justify-between print:hidden flex-wrap gap-2">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/billing")}>← Back</Button>
          <h1 className="text-2xl font-semibold mt-2">{inv.invoice_number || `Invoice #${invoiceId}`}</h1>
        </div>
        <div className="flex gap-2 items-center">
          {isFinalised ? (
            <Badge variant="secondary"><Lock className="h-3 w-3 mr-1" /> Finalised</Badge>
          ) : (
            <Button size="sm" onClick={() => finalise.mutate()} disabled={finalise.isPending}>
              <Lock className="h-4 w-4 mr-1" /> {finalise.isPending ? "Finalising…" : "Finalise"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> Print Receipt
          </Button>
          <Button
            variant="outline" size="sm"
            disabled={!(inv.customer || inv.global_customer) || sendDigital.isPending}
            title={!(inv.customer || inv.global_customer) ? "This invoice has no associated customer to send to" : undefined}
            onClick={() => sendDigital.mutate()}
          >
            <Send className="h-4 w-4 mr-1" /> {sendDigital.isPending ? "Sending…" : "Send Digital Invoice"}
          </Button>
          {isFinalised && (
            <Dialog open={creditOpen} onOpenChange={setCreditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm"><ReceiptText className="h-4 w-4 mr-1" /> Credit Note</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Issue Credit Note</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input type="number" placeholder="Amount (₹)" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} />
                  <Textarea placeholder="Reason for correction" value={creditReason} onChange={(e) => setCreditReason(e.target.value)} rows={3} />
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setCreditOpen(false)}>Cancel</Button>
                  <Button disabled={!creditReason.trim() || !Number(creditAmount) || creditNote.isPending} onClick={() => creditNote.mutate()}>
                    {creditNote.isPending ? "Issuing…" : "Issue Credit Note"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {q.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {q.isError && <div className="text-sm text-destructive">{(q.error as Error).message}</div>}

      {q.data && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Invoice</CardTitle></CardHeader>
            <CardContent className="grid gap-2 md:grid-cols-3 text-sm">
              <div><div className="text-muted-foreground">Customer</div><div>{customerName}</div></div>
              <div><div className="text-muted-foreground">Status</div><div>{inv.status || "—"}</div></div>
              <div><div className="text-muted-foreground">Grand Total</div><div className="font-semibold">{formatINR(inv.grand_total_paise / 100)}</div></div>
              <div><div className="text-muted-foreground">Created</div><div>{formatDateTime(inv.created_at)}</div></div>
              <div><div className="text-muted-foreground">Subtotal</div><div>{formatINR(inv.subtotal_paise / 100)}</div></div>
              <div><div className="text-muted-foreground">Discount</div><div>{formatINR(inv.discount_amount_paise / 100)}</div></div>
              <div><div className="text-muted-foreground">Tax</div><div>{formatINR(inv.tax_amount_paise / 100)}</div></div>
              <div><div className="text-muted-foreground">Finalised</div><div>{inv.finalised_at ? formatDateTime(inv.finalised_at) : "Not yet"}</div></div>
            </CardContent>
          </Card>

          {items.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Items</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr><th className="py-1">Item</th><th>By</th><th className="text-right">Amount</th></tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => (
                      <tr key={it.id ?? i} className="border-t">
                        <td className="py-1">{it.service_name}</td>
                        <td className="text-xs text-muted-foreground">{it.professional_name || "—"}</td>
                        <td className="text-right">{formatINR((it.total_paise ?? it.unit_price_paise) / 100)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {payments.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Payments</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                {payments.map((p, i) => (
                  <div key={i} className="flex justify-between"><span>{p.method}</span><span>{formatINR(p.amount_paise / 100)}</span></div>
                ))}
              </CardContent>
            </Card>
          )}

          {creditNotes.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Credit Notes</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                {creditNotes.map((c, i) => (
                  <div key={i} className="flex justify-between"><span>{c.reason}</span><span>−{formatINR(c.amount_paise / 100)}</span></div>
                ))}
              </CardContent>
            </Card>
          )}

          {!isFinalised && (
            <div className="grid gap-4 md:grid-cols-2 print:hidden">
              <Card>
                <CardHeader><CardTitle className="text-base">Record additional payment</CardTitle></CardHeader>
                <CardContent>
                  <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); pay.mutate(); }}>
                    <div className="grid grid-cols-2 gap-2">
                      <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="flex h-9 rounded-md border border-input bg-transparent px-2 text-sm">
                        {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                      <Input placeholder="Amount" type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required />
                    </div>
                    <Button type="submit" size="sm" disabled={pay.isPending}>Record payment</Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Undo2 className="h-4 w-4" /> Refund</CardTitle></CardHeader>
                <CardContent>
                  <Button size="sm" variant="destructive" disabled={refund.isPending} onClick={() => refund.mutate()}>
                    {refund.isPending ? "Refunding…" : "Mark as Refunded"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
