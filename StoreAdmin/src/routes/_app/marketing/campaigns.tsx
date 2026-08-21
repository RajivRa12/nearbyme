import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@/hooks/useFetch";
import { api, ApiError } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { formatDateTime, toArray } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Send, BarChart3 } from "lucide-react";

const CHANNEL_OPTIONS = [
  { value: "sms", label: "SMS" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
];
const TARGET_TYPE_OPTIONS = [
  { value: "lapsed_60d", label: "Not visited in 60+ days" },
  { value: "birthday_this_week", label: "Birthday this week" },
  { value: "lifecycle_lapsing", label: "Lifecycle stage: Lapsing" },
];
const TARGET_TYPE_LABEL = Object.fromEntries(TARGET_TYPE_OPTIONS.map((o) => [o.value, o.label]));

const ENDPOINT = "/api/erp/crm-campaigns/";

function CreateCampaignDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("sms");
  const [targetType, setTargetType] = useState("");
  const [messageTemplate, setMessageTemplate] = useState("");

  const create = useMutation({
    mutationFn: () => api(ENDPOINT, { method: "POST", body: { name, channel, target_type: targetType, message_template: messageTemplate } }),
    onSuccess: () => {
      toast.success("Campaign created");
      setOpen(false);
      setName(""); setTargetType(""); setMessageTemplate("");
      onCreated();
    },
    onError: (e: Error) => toast.error(e instanceof ApiError ? e.message : "Could not create campaign"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Campaign</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New Campaign</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Channel</label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CHANNEL_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Target audience</label>
            <Select value={targetType} onValueChange={setTargetType}>
              <SelectTrigger><SelectValue placeholder="Who should this reach?" /></SelectTrigger>
              <SelectContent>
                {TARGET_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Message (use {"{name}"} for the customer's name)</label>
            <Textarea value={messageTemplate} onChange={(e) => setMessageTemplate(e.target.value)} rows={4} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!name.trim() || !targetType || !messageTemplate.trim() || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AnalyticsDialog({ campaignId, campaignName }: { campaignId: string; campaignName: string }) {
  const [open, setOpen] = useState(false);
  const q = useQuery({
    queryKey: [`${ENDPOINT}${campaignId}/analytics/`, open],
    queryFn: () => (open ? api<{ data: any }>(`${ENDPOINT}${campaignId}/analytics/`) : Promise.resolve(undefined)),
  });
  const a = q.data?.data;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost"><BarChart3 className="h-4 w-4 mr-1" /> Analytics</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{campaignName} — Analytics</DialogTitle></DialogHeader>
        {q.isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : q.isError ? (
          <div className="text-sm text-destructive">{(q.error as Error).message}</div>
        ) : (
          <div className="grid grid-cols-3 gap-4 py-2">
            <div><div className="text-xs text-muted-foreground">Sent</div><div className="text-xl font-semibold">{a?.sent_count ?? 0}</div></div>
            <div><div className="text-xs text-muted-foreground">Open rate</div><div className="text-xl font-semibold">{Math.round((a?.open_rate ?? 0) * 100)}%</div></div>
            <div><div className="text-xs text-muted-foreground">Bookings generated</div><div className="text-xl font-semibold">{a?.bookings_generated ?? 0}</div></div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Campaigns() {
  const qc = useQueryClient();
  const key = [ENDPOINT];
  const q = useQuery({ queryKey: key, queryFn: () => api<any>(ENDPOINT) });
  const campaigns = toArray<any>(q.data);
  const refetch = () => qc.invalidateQueries({ queryKey: key });

  const [sendingId, setSendingId] = useState<string | null>(null);
  const send = async (id: string, name: string) => {
    if (!confirm(`Send "${name}" now? This messages every matching customer immediately and can't be undone.`)) return;
    setSendingId(id);
    try {
      const res = await api<{ data: { sent: number } }>(`${ENDPOINT}${id}/send/`, { method: "POST" });
      toast.success(`Sent to ${res.data.sent} customer${res.data.sent === 1 ? "" : "s"}`);
      refetch();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not send campaign");
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Campaigns</h1>
          <p className="text-sm text-muted-foreground">Target customers by lifecycle stage — birthdays, lapsed visitors, and lapsing customers.</p>
        </div>
        <CreateCampaignDialog onCreated={refetch} />
      </div>

      <Card>
        <CardContent className="p-0">
          {q.isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : q.isError ? (
            <div className="p-6 text-sm text-destructive">{(q.error as Error).message}</div>
          ) : campaigns.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No campaigns yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr>
                  <th className="py-2 px-4">Name</th>
                  <th>Channel</th>
                  <th>Target</th>
                  <th>Status</th>
                  <th>Sent</th>
                  <th className="text-right px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="py-2 px-4 font-medium">{c.name}</td>
                    <td className="uppercase text-xs">{c.channel}</td>
                    <td>{TARGET_TYPE_LABEL[c.target_type] || c.target_type}</td>
                    <td><Badge variant={c.status === "sent" ? "secondary" : "outline"}>{c.status}</Badge></td>
                    <td>{c.sent_at ? formatDateTime(c.sent_at) : "—"}</td>
                    <td className="text-right px-4">
                      <div className="flex justify-end gap-1">
                        {c.status !== "sent" && (
                          <Button size="sm" variant="outline" disabled={sendingId === c.id} onClick={() => send(c.id, c.name)}>
                            <Send className="h-4 w-4 mr-1" /> {sendingId === c.id ? "Sending…" : "Send"}
                          </Button>
                        )}
                        <AnalyticsDialog campaignId={c.id} campaignName={c.name} />
                      </div>
                    </td>
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
