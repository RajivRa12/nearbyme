import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ShoppingBag } from "lucide-react";

export function SellPlanDialog({
  sellEndpoint, planId, planLabel, onSold,
}: {
  sellEndpoint: string;
  planId: string;
  planLabel: string;
  onSold?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function sell() {
    if (!name.trim()) return toast.error("Customer name is required");
    setSubmitting(true);
    try {
      await api(sellEndpoint, {
        method: "POST",
        body: { plan_id: planId, customer_name: name.trim(), customer_phone: phone.trim() },
      });
      toast.success(`${planLabel} sold to ${name.trim()}`);
      setOpen(false);
      setName("");
      setPhone("");
      onSold?.();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not complete sale");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost"><ShoppingBag className="h-4 w-4 mr-1" /> Sell</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Sell {planLabel}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Customer Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Required" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Phone</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={submitting} onClick={sell}>{submitting ? "Selling…" : "Sell"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
