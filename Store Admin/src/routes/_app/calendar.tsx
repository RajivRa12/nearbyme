import { useQuery } from "@/hooks/useFetch";
import { useState } from "react";
import { api } from "@/lib/api";
import { toArray } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default CalendarView;

const HOURS = Array.from({ length: 12 }, (_, i) => i + 9);
const ROW_PX = 56;

type Appt = {
  id: number;
  customer_name: string;
  service: string;
  staff: string;
  start_at: string;
  duration_min?: number;
  status: string;
  amount?: number;
};

function statusStyles(s: string) {
  switch (s) {
    case "completed": return "bg-emerald-500/15 border-emerald-500/40 text-emerald-900 dark:text-emerald-200";
    case "checked_in": return "bg-blue-500/15 border-blue-500/40 text-blue-900 dark:text-blue-200";
    case "confirmed": return "bg-amber-500/15 border-amber-500/40 text-amber-900 dark:text-amber-200";
    case "cancelled": return "bg-destructive/15 border-destructive/40 text-destructive";
    default: return "bg-muted border-border";
  }
}

function CalendarView() {
  const [day, setDay] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const apptsQ = useQuery({
    queryKey: ["appointments"],
    queryFn: () => api<unknown>("/api/erp/appointments/"),
  });
  const staffQ = useQuery({
    queryKey: ["staff"],
    queryFn: () => api<unknown>("/api/erp/staff/"),
  });

  const staff = toArray<any>(staffQ.data).filter((s) => s.active !== false);
  const appts = toArray<Appt>(apptsQ.data).filter((a) => {
    const d = new Date(a.start_at);
    return d.toDateString() === day.toDateString();
  });

  const move = (delta: number) => {
    const d = new Date(day);
    d.setDate(d.getDate() + delta);
    setDay(d);
  };

  const label = day.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
  const isToday = day.toDateString() === new Date().toDateString();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">Day view · staff columns</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => move(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="min-w-[220px] text-center">
            <div className="text-sm font-medium">{label}</div>
            {isToday && <div className="text-xs text-primary">Today</div>}
          </div>
          <Button variant="outline" size="icon" onClick={() => move(1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setDay(new Date(new Date().setHours(0, 0, 0, 0)))}>Today</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-auto">
          <div className="grid" style={{ gridTemplateColumns: `72px repeat(${Math.max(staff.length, 1)}, minmax(160px, 1fr))` }}>
            {/* header */}
            <div className="border-b border-r bg-muted/40 h-10" />
            {staff.map((s) => (
              <div key={s.id} className="border-b border-r px-3 py-2 text-sm font-medium bg-muted/40 last:border-r-0">
                {s.name}
                <div className="text-xs text-muted-foreground font-normal">{s.role}</div>
              </div>
            ))}
            {/* body: hour rows */}
            {HOURS.map((h) => (
              <div key={"row-" + h} className="contents">
                <div className="border-b border-r text-[11px] text-muted-foreground px-2 pt-1 relative" style={{ height: ROW_PX }}>
                  {`${((h + 11) % 12) + 1} ${h < 12 ? "AM" : "PM"}`}
                </div>
                {staff.map((s) => (
                  <div key={s.id + "-" + h} className="border-b border-r relative last:border-r-0" style={{ height: ROW_PX }}>
                    {h === HOURS[0] && (
                      <>
                        {appts
                          .filter((a) => a.staff === s.name)
                          .map((a) => {
                            const d = new Date(a.start_at);
                            const hourFloat = d.getHours() + d.getMinutes() / 60;
                            const top = (hourFloat - HOURS[0]) * ROW_PX;
                            const height = ((a.duration_min ?? 30) / 60) * ROW_PX - 4;
                            if (top < 0 || top > HOURS.length * ROW_PX) return null;
                            return (
                              <div
                                key={a.id}
                                className={`absolute left-1 right-1 rounded-md border p-2 text-xs shadow-sm ${statusStyles(a.status)}`}
                                style={{ top, height }}
                              >
                                <div className="font-medium truncate">{a.customer_name}</div>
                                <div className="truncate opacity-80">{a.service}</div>
                                <div className="text-[10px] opacity-70 mt-0.5">
                                  {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {a.duration_min}m
                                </div>
                              </div>
                            );
                          })}
                      </>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 flex-wrap text-xs">
        <Badge variant="outline" className={statusStyles("confirmed")}>Confirmed</Badge>
        <Badge variant="outline" className={statusStyles("checked_in")}>Checked in</Badge>
        <Badge variant="outline" className={statusStyles("completed")}>Completed</Badge>
        <Badge variant="outline" className={statusStyles("cancelled")}>Cancelled</Badge>
      </div>
    </div>
  );
}
