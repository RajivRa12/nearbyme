import { useQuery } from "@/hooks/useFetch";
import { api } from "@/lib/api";
import { toArray, formatINR } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";

export default Leaderboard;

function Leaderboard() {
  const q = useQuery({
    queryKey: ["/api/erp/leaderboard/"],
    queryFn: () => api<unknown>("/api/erp/leaderboard/"),
  });
  const rows = toArray<any>(q.data);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2"><Trophy className="h-5 w-5" /> Leaderboard</h1>
        <p className="text-sm text-muted-foreground">Top performers by revenue / bookings.</p>
      </div>

      {q.isError && <div className="text-sm text-destructive">{(q.error as Error).message}</div>}

      <Card>
        <CardHeader><CardTitle className="text-base">Ranking</CardTitle></CardHeader>
        <CardContent>
          {q.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No data.</div>
          ) : (
            <ol className="space-y-2">
              {rows.map((r, i) => (
                <li key={r.id ?? i} className="flex items-center justify-between border-b py-2 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center font-semibold text-muted-foreground">{i + 1}</span>
                    <span>{r.name || r.staff_name || r.staff || `#${r.id ?? i}`}</span>
                  </div>
                  <span className="font-semibold">{formatINR(r.total ?? r.revenue ?? r.score ?? 0)}</span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
