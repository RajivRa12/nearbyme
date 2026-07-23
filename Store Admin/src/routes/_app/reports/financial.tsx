import { useQuery } from "@/hooks/useFetch";
import { useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatINR, toArray } from "@/lib/format";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default FinancialReports;

type Row = { date?: string; period?: string; label?: string; revenue?: number; amount?: number; total?: number };

function FinancialReports() {
  const [period, setPeriod] = useState<"daily" | "monthly">("daily");
  const q = useQuery({
    queryKey: ["financial-reports", period],
    queryFn: () => api<unknown>(`/api/erp/financial-reports/?period=${period}`),
  });

  const rows = toArray<Row>(q.data).map((r) => ({
    label: r.date || r.period || r.label || "",
    value: Number(r.revenue ?? r.amount ?? r.total ?? 0),
  }));

  const total = rows.reduce((s, r) => s + r.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Revenue</h1>
          <p className="text-sm text-muted-foreground">Financial reports over time.</p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
          <TabsList>
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{formatINR(total)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Data points</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{rows.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Average</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{formatINR(rows.length ? total / rows.length : 0)}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Revenue trend</CardTitle></CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            {q.isLoading ? (
              <div className="h-full grid place-items-center text-sm text-muted-foreground">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="h-full grid place-items-center text-sm text-muted-foreground">
                {q.isError ? (q.error as Error).message : "No data yet."}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: any) => formatINR(Number(v))} />
                  <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
