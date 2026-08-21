import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { formatDateTime } from "@/lib/format";

const WEEKDAYS = [
  { value: 0, label: "Monday" },
  { value: 1, label: "Tuesday" },
  { value: 2, label: "Wednesday" },
  { value: 3, label: "Thursday" },
  { value: 4, label: "Friday" },
  { value: 5, label: "Saturday" },
  { value: 6, label: "Sunday" },
];

type Professional = {
  id: string;
  display_name: string;
  is_bookable: boolean;
  skills: { id: string; skill_tag: string }[];
  shifts: { id: string; weekday: number; weekday_display: string; start_time: string; end_time: string; effective_from: string; effective_to: string | null }[];
  time_off_blocks: { id: string; start_at: string; end_at: string; reason: string | null }[];
};

export function ProfessionalManageDialog({
  professional, skillTags, onChanged, open, onOpenChange,
}: {
  professional: Professional;
  skillTags: string[];
  onChanged: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isBookable, setIsBookable] = useState(professional.is_bookable);
  const [savingBookable, setSavingBookable] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(professional.skills.map((s) => s.skill_tag));
  const [savingSkills, setSavingSkills] = useState(false);
  const [shiftForm, setShiftForm] = useState({ weekday: "0", start_time: "09:00", end_time: "18:00", effective_from: new Date().toISOString().slice(0, 10) });
  const [savingShift, setSavingShift] = useState(false);
  const [timeOffForm, setTimeOffForm] = useState({ start_at: "", end_at: "", reason: "" });
  const [savingTimeOff, setSavingTimeOff] = useState(false);

  const reportError = (e: unknown) => toast.error(e instanceof ApiError ? e.message : "Something went wrong");

  async function toggleBookable(next: boolean) {
    setIsBookable(next);
    setSavingBookable(true);
    try {
      await api(`/api/erp/professionals/${professional.id}/`, { method: "PATCH", body: { is_bookable: next } });
      toast.success(next ? "Now bookable" : "Bookings paused for this professional");
      onChanged();
    } catch (e) {
      setIsBookable(!next);
      reportError(e);
    } finally {
      setSavingBookable(false);
    }
  }

  async function saveSkills() {
    setSavingSkills(true);
    try {
      await api(`/api/erp/professionals/${professional.id}/skills/`, { method: "POST", body: { skill_tags: selectedSkills } });
      toast.success("Skills updated");
      onChanged();
    } catch (e) {
      reportError(e);
    } finally {
      setSavingSkills(false);
    }
  }

  async function addShift(e: React.FormEvent) {
    e.preventDefault();
    setSavingShift(true);
    try {
      await api(`/api/erp/professionals/${professional.id}/shifts/`, {
        method: "POST",
        body: { ...shiftForm, weekday: Number(shiftForm.weekday) },
      });
      toast.success("Shift added");
      onChanged();
    } catch (e) {
      reportError(e);
    } finally {
      setSavingShift(false);
    }
  }

  async function removeShift(shiftId: string) {
    try {
      await api(`/api/erp/professionals/${professional.id}/shifts/${shiftId}/`, { method: "DELETE" });
      toast.success("Shift removed");
      onChanged();
    } catch (e) {
      reportError(e);
    }
  }

  async function addTimeOff(e: React.FormEvent) {
    e.preventDefault();
    if (!timeOffForm.start_at || !timeOffForm.end_at) return;
    setSavingTimeOff(true);
    try {
      await api(`/api/erp/professionals/${professional.id}/time-off/`, { method: "POST", body: timeOffForm });
      toast.success("Time off added");
      setTimeOffForm({ start_at: "", end_at: "", reason: "" });
      onChanged();
    } catch (e) {
      reportError(e);
    } finally {
      setSavingTimeOff(false);
    }
  }

  async function removeTimeOff(blockId: string) {
    try {
      await api(`/api/erp/professionals/${professional.id}/time-off/${blockId}/`, { method: "DELETE" });
      toast.success("Time off removed");
      onChanged();
    } catch (e) {
      reportError(e);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{professional.display_name}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Bookable</p>
            <p className="text-xs text-muted-foreground">Turn off to hide from availability without removing them.</p>
          </div>
          <Switch checked={isBookable} disabled={savingBookable} onCheckedChange={toggleBookable} />
        </div>

        <Tabs defaultValue="skills" className="mt-2">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="shifts">Weekly Shifts</TabsTrigger>
            <TabsTrigger value="timeoff">Time Off</TabsTrigger>
          </TabsList>

          <TabsContent value="skills" className="space-y-3 pt-3">
            {skillTags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No skill tags found in the service catalog yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                {skillTags.map((tag) => (
                  <label key={tag} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedSkills.includes(tag)}
                      onCheckedChange={(checked) =>
                        setSelectedSkills((s) => (checked ? [...s, tag] : s.filter((t) => t !== tag)))
                      }
                    />
                    {tag}
                  </label>
                ))}
              </div>
            )}
            <Button size="sm" onClick={saveSkills} disabled={savingSkills}>
              {savingSkills ? "Saving…" : "Save Skills"}
            </Button>
          </TabsContent>

          <TabsContent value="shifts" className="space-y-3 pt-3">
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {professional.shifts.length === 0 && <p className="text-sm text-muted-foreground">No shifts set yet.</p>}
              {professional.shifts.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>
                    {s.weekday_display}: {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                    {s.effective_to ? ` (until ${s.effective_from} to ${s.effective_to})` : ` (from ${s.effective_from})`}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => removeShift(s.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <form onSubmit={addShift} className="grid grid-cols-2 gap-2 rounded-lg border p-3">
              <select
                value={shiftForm.weekday}
                onChange={(e) => setShiftForm((s) => ({ ...s, weekday: e.target.value }))}
                className="col-span-2 flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                {WEEKDAYS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
              </select>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Start</label>
                <Input type="time" value={shiftForm.start_time} onChange={(e) => setShiftForm((s) => ({ ...s, start_time: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">End</label>
                <Input type="time" value={shiftForm.end_time} onChange={(e) => setShiftForm((s) => ({ ...s, end_time: e.target.value }))} required />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs text-muted-foreground">Effective From</label>
                <Input type="date" value={shiftForm.effective_from} onChange={(e) => setShiftForm((s) => ({ ...s, effective_from: e.target.value }))} required />
              </div>
              <Button type="submit" size="sm" className="col-span-2" disabled={savingShift}>
                {savingShift ? "Adding…" : "Add Shift"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="timeoff" className="space-y-3 pt-3">
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {professional.time_off_blocks.length === 0 && <p className="text-sm text-muted-foreground">No time off scheduled.</p>}
              {professional.time_off_blocks.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>{formatDateTime(t.start_at)} → {formatDateTime(t.end_at)}{t.reason ? ` — ${t.reason}` : ""}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeTimeOff(t.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <form onSubmit={addTimeOff} className="grid grid-cols-2 gap-2 rounded-lg border p-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">From</label>
                <Input type="datetime-local" value={timeOffForm.start_at} onChange={(e) => setTimeOffForm((s) => ({ ...s, start_at: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">To</label>
                <Input type="datetime-local" value={timeOffForm.end_at} onChange={(e) => setTimeOffForm((s) => ({ ...s, end_at: e.target.value }))} required />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs text-muted-foreground">Reason</label>
                <Textarea value={timeOffForm.reason} onChange={(e) => setTimeOffForm((s) => ({ ...s, reason: e.target.value }))} rows={2} />
              </div>
              <Button type="submit" size="sm" className="col-span-2" disabled={savingTimeOff}>
                {savingTimeOff ? "Adding…" : "Add Time Off"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
