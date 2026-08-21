import { Link } from 'react-router-dom';
import { useQuery } from "@/hooks/useFetch";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/format";
import {
  CalendarCheck2,
  IndianRupee,
  UserCheck,
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Trophy,
  ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default Dashboard;

type DashboardData = {
  today_revenue: number;
  today_appointments: number;
  walk_ins: number;
  staff_present: number;
  revenue_change_pct?: number;
  appointments_change_pct?: number;
  upcoming?: any[];
  low_stock?: any[];
  top_staff?: any[];
  recent_invoices?: any[];
  revenue_graph?: { date: string; revenue: number }[];
};

function Kpi({
  label,
  value,
  change,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  change?: number;
  icon: any;
  tone?: "default" | "primary";
}) {
  const positive = (change ?? 0) >= 0;
  return (
    <Card className="relative overflow-hidden group hover:shadow-md transition-all duration-300 border-muted-foreground/10">
      {tone === "primary" && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent pointer-events-none group-hover:opacity-75 transition-opacity" />
      )}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </CardTitle>
        <div className="h-9 w-9 rounded-xl bg-primary/10 grid place-items-center group-hover:bg-primary/20 transition-colors shadow-sm">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">{value}</div>
        {change !== undefined && (
          <div className={`mt-1.5 flex items-center gap-1.5 text-xs font-medium ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
            <span className={`flex items-center justify-center h-4 w-4 rounded-full ${positive ? "bg-emerald-500/10" : "bg-destructive/10"}`}>
              {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            </span>
            {positive ? "+" : ""}{change.toFixed(1)}% vs yesterday
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function statusColor(s?: string) {
  switch (s) {
    case "completed": return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
    case "checked_in": return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30";
    case "confirmed": return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
    case "cancelled": return "bg-destructive/15 text-destructive border-destructive/30";
    default: return "";
  }
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Dashboard() {
  const q = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<{ data: DashboardData }>("/api/erp/dashboard/"),
  });

  const d = q.data?.data;
  const series = (d?.revenue_graph ?? []).map((p: any) => ({ label: p.date.slice(5), revenue: p.revenue }));

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">Good day, Manager</h1>
          <p className="text-base text-muted-foreground">Here's what's happening in your store today.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/calendar">Calendar</Link></Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Revenue Today" value={formatINR(d?.today_revenue ?? 0)} change={d?.revenue_change_pct} icon={IndianRupee} tone="primary" />
        <Kpi label="Appointments" value={String(d?.today_appointments ?? 0)} change={d?.appointments_change_pct} icon={CalendarCheck2} />
        <Kpi label="Walk-ins" value={String(d?.walk_ins ?? 0)} icon={Users} />
        <Kpi label="Staff Present" value={String(d?.staff_present ?? 0)} icon={UserCheck} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-sm border-muted-foreground/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">Revenue this week</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Daily totals over the last 7 days</p>
            </div>
            <Button asChild variant="secondary" size="sm" className="shadow-sm"><Link to="/reports/financial">View report <ArrowRight className="h-3 w-3 ml-1.5" /></Link></Button>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full">
              {q.isLoading ? (
                <div className="h-full grid place-items-center text-sm text-muted-foreground">Loading…</div>
              ) : series.length === 0 ? (
                <div className="h-full grid place-items-center text-sm text-muted-foreground">No revenue data this week.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} width={60} />
                    <Tooltip formatter={(v: any) => formatINR(Number(v))} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} />
                    <Area type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2} fill="url(#rev)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-muted-foreground/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500 drop-shadow-sm" /> Top staff</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link to="/staff/leaderboard">All</Link></Button>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {(d?.top_staff ?? []).map((s: any, i: number) => (
              <div key={s.id} className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-full grid place-items-center text-xs font-semibold ${i === 0 ? "bg-amber-500/20 text-amber-700 dark:text-amber-400" : "bg-muted"}`}>
                  #{s.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{s.staff}</div>
                  <div className="text-xs text-muted-foreground">{s.appointments} appts</div>
                </div>
                <div className="text-sm font-medium">{formatINR(s.revenue)}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Today's schedule</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link to="/calendar">Open calendar <ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {(d?.upcoming ?? []).map((a: any) => (
                <div key={a.id} className="flex items-center gap-3 px-6 py-3">
                  <div className="text-sm font-mono w-14 text-muted-foreground">{fmtTime(a.start_at)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{a.customer_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{a.service} · {a.staff}</div>
                  </div>
                  <Badge variant="outline" className={statusColor(a.status?.toLowerCase())}>{a.status.replace(/_/g, " ")}</Badge>
                  <div className="text-sm font-medium hidden sm:block">{formatINR(a.amount)}</div>
                </div>
              ))}
              {(!d?.upcoming || d.upcoming.length === 0) && (
                <div className="p-8 text-center text-sm text-muted-foreground">No appointments today.</div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
