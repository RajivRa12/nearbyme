import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@/hooks/useFetch";
import { api } from "@/lib/api";
import { toArray, formatDateTime } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Send, MessageSquare } from "lucide-react";

type Conversation = {
  id: number;
  customer_name: string;
  therapist_name: string;
  last_message: { content: string; created_at: string } | null;
  created_at: string;
};

type Msg = { id: number; sender: number; sender_name: string; content: string; is_read: boolean; created_at: string; is_mine: boolean };

function initials(name: string) {
  return (name || "?").split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
}

function Thread({ conversation, onSent }: { conversation: Conversation; onSent: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const endpoint = `/api/erp/conversations/${conversation.id}/messages/`;

  const fetchMessages = async () => {
    try {
      const res = await api<{ data: Msg[] }>(endpoint);
      setMessages(res.data ?? []);
    } catch {
      // keep last known messages on transient failure
    }
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [conversation.id]);

  const send = async () => {
    if (!text.trim()) return;
    const content = text.trim();
    setText("");
    setSending(true);
    try {
      await api(endpoint, { method: "POST", body: { content } });
      await fetchMessages();
      onSent();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback>{initials(conversation.customer_name)}</AvatarFallback>
        </Avatar>
        <div>
          <div className="font-medium text-sm">{conversation.customer_name}</div>
          <div className="text-xs text-muted-foreground">with {conversation.therapist_name}</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground pt-10">No messages yet.</div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.is_mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[70%] rounded-xl px-3.5 py-2.5 text-sm ${m.is_mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {!m.is_mine && <div className="text-[11px] font-medium opacity-70 mb-0.5">{m.sender_name}</div>}
                <div>{m.content}</div>
                <div className={`text-[10px] mt-1 text-right ${m.is_mine ? "opacity-70" : "text-muted-foreground"}`}>
                  {formatDateTime(m.created_at)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="p-4 border-t flex items-center gap-2">
        <Input
          placeholder="Reply as store staff…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !sending) send(); }}
        />
        <Button size="icon" onClick={send} disabled={sending || !text.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function Conversations() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Conversation | null>(null);

  const list = useQuery({
    queryKey: ["/api/erp/conversations/"],
    queryFn: () => api<unknown>("/api/erp/conversations/"),
  });

  const conversations = toArray<Conversation>(list.data);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-background/50 p-4 rounded-2xl border border-muted-foreground/5 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground/90">Conversations</h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Every customer↔therapist chat thread at your store. Open one to see the conversation and reply on the store's behalf.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => list.refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Card className="overflow-hidden border-muted-foreground/10 shadow-sm rounded-xl">
        <CardContent className="p-0 grid md:grid-cols-[320px_1fr] h-[600px]">
          <div className="border-r overflow-y-auto">
            {list.isLoading ? (
              <div className="p-8 flex items-center justify-center text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
                No conversations yet.
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={`w-full text-left px-4 py-3 border-b hover:bg-muted/50 transition-colors flex items-start gap-3 ${selected?.id === c.id ? "bg-muted/60" : ""}`}
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback>{initials(c.customer_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{c.customer_name}</span>
                      {c.last_message && (
                        <span className="text-[10px] text-muted-foreground shrink-0">{formatDateTime(c.last_message.created_at)}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">with {c.therapist_name}</div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {c.last_message?.content || "No messages yet"}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="min-w-0">
            {selected ? (
              <Thread conversation={selected} onSent={() => qc.invalidateQueries({ queryKey: ["/api/erp/conversations/"] })} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
                Select a conversation to view messages.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
