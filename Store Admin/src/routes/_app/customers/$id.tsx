import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from "@/hooks/useFetch";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatINR, formatDateTime, toArray } from "@/lib/format";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default CustomerDetail;

function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const key = ["customer", id];

  const q = useQuery({
    queryKey: key,
    queryFn: () => api<any>(`/api/erp/crm/${id}/`),
  });

  const [notes, setNotes] = useState("");
  useEffect(() => {
    if (q.data) setNotes(q.data.notes || q.data.skin_notes || q.data.hair_notes || "");
  }, [q.data]);

  const saveNotes = useMutation({
    mutationFn: () => api(`/api/erp/crm/${id}/`, { method: "PATCH", body: { notes } }),
    onSuccess: () => { toast.success("Notes saved"); qc.invalidateQueries({ queryKey: key }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const c = q.data ?? {};
  const visits = toArray<any>(c.visits ?? c.visit_history ?? c.appointments);

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/customers")}>← Back</Button>
        <h1 className="text-2xl font-semibold mt-2">{c.name || c.full_name || `Customer #${id}`}</h1>
      </div>

      {q.isError && <div className="text-sm text-destructive">{(q.error as Error).message}</div>}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Phone</CardTitle></CardHeader>
          <CardContent>{c.phone || "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Email</CardTitle></CardHeader>
          <CardContent>{c.email || "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Outstanding</CardTitle></CardHeader>
          <CardContent className="text-lg font-semibold">{formatINR(c.outstanding ?? c.outstanding_balance ?? 0)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Skin / Hair notes</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} />
          <Button size="sm" onClick={() => saveNotes.mutate()} disabled={saveNotes.isPending}>
            {saveNotes.isPending ? "Saving…" : "Save notes"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Visit history</CardTitle></CardHeader>
        <CardContent>
          {visits.length === 0 ? (
            <div className="text-sm text-muted-foreground">No visits yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr><th className="py-1">Date</th><th>Service</th><th>Therapist</th><th className="text-right">Amount</th></tr>
              </thead>
              <tbody>
                {visits.map((v, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-1">{formatDateTime(v.date || v.start_time || v.created_at)}</td>
                    <td>{v.service_name || v.service || "—"}</td>
                    <td>{v.therapist_name || v.therapist || "—"}</td>
                    <td className="text-right">{formatINR(v.amount ?? v.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
