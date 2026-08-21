import { useState } from "react";
import { useQuery, useQueryClient } from "@/hooks/useFetch";
import { api, ApiError } from "@/lib/api";
import { toArray, formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { RowActionsMenu, StatusSubmenu } from "@/components/row-actions-menu";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

type Staff = { id: number | string; name: string; role: string };
type LeaveRow = {
  id: number | string; staff_name: string | null; start_date: string; end_date: string;
  reason: string; status: string;
};

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

export default function Leaves() {
  const qc = useQueryClient();
  const listQ = useQuery({ queryKey: ["/api/erp/leaves/"], queryFn: () => api<unknown>("/api/erp/leaves/") });
  const staffQ = useQuery({ queryKey: ["/api/erp/staff/"], queryFn: () => api<unknown>("/api/erp/staff/") });
  const rows = toArray<LeaveRow>(listQ.data);
  const staff = toArray<Staff>(staffQ.data);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    staff: "", start_date: new Date().toISOString().slice(0, 10), end_date: new Date().toISOString().slice(0, 10),
    reason: "", status: "PENDING",
  });
  const [saving, setSaving] = useState(false);

  async function createEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!form.staff) return toast.error("Pick a staff member");
    setSaving(true);
    try {
      await api("/api/erp/leaves/", { method: "POST", body: form });
      toast.success("Leave request created");
      setCreating(false);
      setForm({ staff: "", start_date: new Date().toISOString().slice(0, 10), end_date: new Date().toISOString().slice(0, 10), reason: "", status: "PENDING" });
      qc.invalidateQueries({ queryKey: ["/api/erp/leaves/"] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not create leave request");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string | number, status: string) {
    try {
      await api(`/api/erp/leaves/${id}/`, { method: "PATCH", body: { status } });
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["/api/erp/leaves/"] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not update status");
    }
  }

  async function deleteEntry(id: string | number) {
    if (!confirm("Delete this leave request?")) return;
    try {
      await api(`/api/erp/leaves/${id}/`, { method: "DELETE" });
      toast.success("Leave request deleted");
      qc.invalidateQueries({ queryKey: ["/api/erp/leaves/"] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not delete leave request");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leave requests</h1>
          <p className="text-sm text-muted-foreground">Staff time-off requests and approvals.</p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1" /> New</Button>
      </div>

      <Dialog open={creating} onOpenChange={(open) => setCreating(open)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Leave Request</DialogTitle>
            <DialogDescription>Request time off on behalf of a staff member.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-4 md:grid-cols-2 py-1" onSubmit={createEntry}>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Staff</label>
              <Select value={form.staff} onValueChange={(v) => setForm((s) => ({ ...s, staff: v }))}>
                <SelectTrigger><SelectValue placeholder="Select staff…" /></SelectTrigger>
                <SelectContent>
                  {staff.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name} {s.role ? `(${s.role})` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">From</label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm((s) => ({ ...s, start_date: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <Input type="date" value={form.end_date} onChange={(e) => setForm((s) => ({ ...s, end_date: e.target.value }))} required />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Reason</label>
              <Textarea value={form.reason} onChange={(e) => setForm((s) => ({ ...s, reason: e.target.value }))} rows={3} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={form.status} onValueChange={(v) => setForm((s) => ({ ...s, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
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
          {listQ.isLoading ? (
            <div className="p-8 flex items-center justify-center text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…</div>
          ) : listQ.isError ? (
            <div className="p-6 text-sm text-destructive">{(listQ.error as Error).message}</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No leave requests yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.staff_name ?? "—"}</TableCell>
                    <TableCell>{formatDate(r.start_date)}</TableCell>
                    <TableCell>{formatDate(r.end_date)}</TableCell>
                    <TableCell className="max-w-xs truncate">{r.reason}</TableCell>
                    <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <RowActionsMenu>
                        <StatusSubmenu current={r.status} options={STATUS_OPTIONS} onSelect={(v) => updateStatus(r.id, v)} />
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => deleteEntry(r.id)}>
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
