import { useState } from "react";
import { useQuery } from "@/hooks/useFetch";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR, toArray } from "@/lib/format";
import { Loader2 } from "lucide-react";

type Report = "revenue-by-professional" | "revenue-by-category" | "commission-payout" | "daily-register" | "gst";

const REPORTS: { value: Report; label: string }[] = [
  { value: "revenue-by-professional", label: "By Professional" },
  { value: "revenue-by-category", label: "By Category" },
  { value: "commission-payout", label: "Commission Payout" },
  { value: "daily-register", label: "Daily Register" },
  { value: "gst", label: "GST" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function monthStartISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export default function FinancialReports() {
  const [report, setReport] = useState<Report>("revenue-by-professional");
  const [dateFrom, setDateFrom] = useState(monthStartISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [date, setDate] = useState(todayISO());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Financial Reports</h1>
          <p className="text-sm text-muted-foreground">Computed from finalised invoices.</p>
        </div>
        <Tabs value={report} onValueChange={(v) => setReport(v as Report)}>
          <TabsList>
            {REPORTS.map((r) => <TabsTrigger key={r.value} value={r.value}>{r.label}</TabsTrigger>)}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex items-center gap-2">
        {report === "daily-register" ? (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">From</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-44" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">To</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-44" />
            </div>
          </>
        )}
      </div>

      <ReportPanel key={report} report={report} dateFrom={dateFrom} dateTo={dateTo} date={date} />
    </div>
  );
}

function ReportPanel({ report, dateFrom, dateTo, date }: { report: Report; dateFrom: string; dateTo: string; date: string }) {
  const url = report === "daily-register"
    ? `/api/erp/reports/?report=${report}&date=${date}`
    : `/api/erp/reports/?report=${report}&date_from=${dateFrom}&date_to=${dateTo}`;
  const q = useQuery({ queryKey: [url], queryFn: () => api<{ data: any }>(url) });
  const data = q.data?.data;

  return (
    <Card>
      <CardContent className="p-0">
        {q.isLoading ? (
          <div className="p-8 flex items-center justify-center text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…</div>
        ) : q.isError ? (
          <div className="p-6 text-sm text-destructive">{(q.error as Error).message}</div>
        ) : report === "revenue-by-professional" ? (
          <RevenueByProfessional rows={toArray(data)} />
        ) : report === "revenue-by-category" ? (
          <RevenueByCategory rows={toArray(data)} />
        ) : report === "commission-payout" ? (
          <CommissionPayout rows={toArray(data)} />
        ) : report === "gst" ? (
          <GstReport rows={toArray(data)} />
        ) : (
          <DailyRegister data={data} />
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return <div className="p-8 text-center text-sm text-muted-foreground">No data for this range.</div>;
}

function RevenueByProfessional({ rows }: { rows: any[] }) {
  if (rows.length === 0) return <EmptyState />;
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Professional</TableHead><TableHead>Lines</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.professional_id}>
            <TableCell>{r.professional_name}</TableCell>
            <TableCell>{r.line_count}</TableCell>
            <TableCell className="text-right font-medium">{formatINR(r.revenue_paise / 100)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function RevenueByCategory({ rows }: { rows: any[] }) {
  if (rows.length === 0) return <EmptyState />;
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Category</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.category}>
            <TableCell>{r.category}</TableCell>
            <TableCell className="text-right font-medium">{formatINR(r.revenue_paise / 100)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function CommissionPayout({ rows }: { rows: any[] }) {
  if (rows.length === 0) return <EmptyState />;
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Professional</TableHead><TableHead>Accruals</TableHead><TableHead className="text-right">Payout Due</TableHead></TableRow></TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.professional_id}>
            <TableCell>{r.professional_name}</TableCell>
            <TableCell>{r.accrual_count}</TableCell>
            <TableCell className="text-right font-medium">{formatINR(r.total_commission_paise / 100)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function GstReport({ rows }: { rows: any[] }) {
  if (rows.length === 0) return <EmptyState />;
  const totalTax = rows.reduce((s, r) => s + Number(r.tax_collected_paise), 0) / 100;
  return (
    <div>
      <Table>
        <TableHeader><TableRow><TableHead>HSN/SAC</TableHead><TableHead>Tax Rate</TableHead><TableHead className="text-right">Taxable Value</TableHead><TableHead className="text-right">Tax Collected</TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell>{r.hsn_sac_code}</TableCell>
              <TableCell>{r.tax_rate}%</TableCell>
              <TableCell className="text-right">{formatINR(r.taxable_value_paise / 100)}</TableCell>
              <TableCell className="text-right font-medium">{formatINR(r.tax_collected_paise / 100)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-end px-4 py-3 border-t text-sm font-semibold">Total tax collected: {formatINR(totalTax)}</div>
    </div>
  );
}

function DailyRegister({ data }: { data: any }) {
  if (!data || !Array.isArray(data.by_method) || data.invoice_count === 0) return <EmptyState />;
  return (
    <div className="space-y-4 p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div><p className="text-xs text-muted-foreground">Invoices</p><p className="text-2xl font-semibold">{data.invoice_count}</p></div>
        <div><p className="text-xs text-muted-foreground">Total Collected</p><p className="text-2xl font-semibold">{formatINR(data.grand_total_paise / 100)}</p></div>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Method</TableHead><TableHead>Count</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
        <TableBody>
          {data.by_method.map((m: any) => (
            <TableRow key={m.method}>
              <TableCell>{m.method}</TableCell>
              <TableCell>{m.count}</TableCell>
              <TableCell className="text-right font-medium">{formatINR(m.total_paise / 100)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
