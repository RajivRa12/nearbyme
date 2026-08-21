import { useState } from "react";
import { useQuery, useQueryClient } from "@/hooks/useFetch";
import { api, ApiError } from "@/lib/api";
import { toArray, formatDateTime } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { RowActionsMenu, StatusSubmenu } from "@/components/row-actions-menu";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

type Staff = { id: number | string; name: string; role: string };
type AttendanceRow = {
  id: number | string; staff_name: string | null; staff: string | null;
  date: string; check_in: string | null; check_out: string | null; status: string;
};

const STATUS_OPTIONS = [
  { value: "PRESENT", label: "Present" },
  { value: "ABSENT", label: "Absent" },
  { value: "HALF_DAY", label: "Half Day" },
];

export default function Attendance() {
  const qc = useQueryClient();
  const listQ = useQuery({ queryKey: ["/api/erp/attendance/"], queryFn: () => api<unknown>("/api/erp/attendance/") });
  const staffQ = useQuery({ queryKey: ["/api/erp/staff/"], queryFn: () => api<unknown>("/api/erp/staff/") });
  const rows = toArray<AttendanceRow>(listQ.data);
  const staff = toArray<Staff>(staffQ.data);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ staff: "", date: new Date().toISOString().slice(0, 10), status: "PRESENT" });
  const [saving, setSaving] = useState(false);

  async function createEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!form.staff) return toast.error("Pick a staff member");
    setSaving(true);
    try {
      await api("/api/erp/attendance/", { method: "POST", body: form });
      toast.success("Attendance marked");
      setCreating(false);
      setForm({ staff: "", date: new Date().toISOString().slice(0, 10), status: "PRESENT" });
      qc.invalidateQueries({ queryKey: ["/api/erp/attendance/"] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not mark attendance");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string | number, status: string) {
    try {
      await api(`/api/erp/attendance/${id}/`, { method: "PATCH", body: { status } });
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["/api/erp/attendance/"] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not update status");
    }
  }

  async function deleteEntry(id: string | number) {
    if (!confirm("Delete this attendance record?")) return;
    try {
      await api(`/api/erp/attendance/${id}/`, { method: "DELETE" });
      toast.success("Attendance record deleted");
      qc.invalidateQueries({ queryKey: ["/api/erp/attendance/"] });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not delete record");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
          <p className="text-sm text-muted-foreground">Mark check-in / check-out for staff.</p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-1" /> New</Button>
      </div>

      <Dialog open={creating} onOpenChange={(open) => setCreating(open)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Mark Attendance</DialogTitle>
            <DialogDescription>Record a staff member's attendance for a given day.</DialogDescription>
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
              <label className="text-xs font-medium text-muted-foreground">Date</label>
              <Input type="date" value={form.date} onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))} required />
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
            <div className="p-8 text-center text-sm text-muted-foreground">No attendance records yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.staff_name ?? "—"}</TableCell>
                    <TableCell>{formatDateTime(r.check_in)}</TableCell>
                    <TableCell>{formatDateTime(r.check_out)}</TableCell>
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
