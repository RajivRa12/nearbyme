import { useQuery, useMutation, useQueryClient } from "@/hooks/useFetch";
import { api } from "@/lib/api";
import { toArray, formatDateTime } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState, type ReactNode } from "react";
import { Loader2, RefreshCw, Plus, Trash2 } from "lucide-react";

export type Column = {
  key: string;
  label: string;
  render?: (row: any) => ReactNode;
};

export function ResourceList({
  title,
  description,
  endpoint,
  columns,
  searchable = true,
  createFields,
  deletable = false,
  extraActions,
  emptyMessage = "No records yet.",
}: {
  title: string;
  description?: string;
  endpoint: string;
  columns: Column[];
  searchable?: boolean;
  createFields?: { name: string; label: string; type?: string; required?: boolean; options?: {label: string, value: string}[] }[];
  deletable?: boolean;
  extraActions?: (row: any) => ReactNode;
  emptyMessage?: string;
}) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const list = useQuery({
    queryKey: [endpoint],
    queryFn: () => api<unknown>(endpoint),
  });

  const del = useMutation({
    mutationFn: (id: string | number) => api(`${endpoint}${id}/`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: [endpoint] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => api(endpoint, { method: "POST", body }),
    onSuccess: () => {
      toast.success("Created");
      setCreating(false);
      setForm({});
      qc.invalidateQueries({ queryKey: [endpoint] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = toArray<any>(list.data);
  const filtered = q
    ? rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q.toLowerCase()))
    : rows;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {searchable && (
            <Input
              placeholder="Search…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-48"
            />
          )}
          <Button variant="outline" size="sm" onClick={() => list.refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {createFields && (
            <Button size="sm" onClick={() => setCreating((v) => !v)}>
              <Plus className="h-4 w-4 mr-1" /> New
            </Button>
          )}
        </div>
      </div>

      {creating && createFields && (
        <Card>
          <CardHeader><CardTitle className="text-base">Create</CardTitle></CardHeader>
          <CardContent>
            <form
              className="grid gap-3 md:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                create.mutate(form);
              }}
            >
              {createFields.map((f) => (
                <div key={f.name} className="space-y-1">
                  <label className="text-xs text-muted-foreground">{f.label}</label>
                  {f.options ? (
                    <select
                      required={f.required}
                      value={form[f.name] ?? ""}
                      onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Select...</option>
                      {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <Input
                      type={f.type ?? "text"}
                      required={f.required}
                      value={form[f.name] ?? ""}
                      onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={create.isPending} size="sm">
                  {create.isPending ? "Saving…" : "Save"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setCreating(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {list.isLoading ? (
            <div className="p-8 flex items-center justify-center text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
            </div>
          ) : list.isError ? (
            <div className="p-6 text-sm text-destructive">{(list.error as Error).message}</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">{emptyMessage}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((c) => (
                    <TableHead key={c.key}>{c.label}</TableHead>
                  ))}
                  {(deletable || extraActions) && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row, i) => (
                  <TableRow key={row.id ?? i}>
                    {columns.map((c) => (
                      <TableCell key={c.key}>
                        {c.render ? c.render(row) : renderCell(row[c.key])}
                      </TableCell>
                    ))}
                    {(deletable || extraActions) && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {extraActions?.(row)}
                          {deletable && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm("Delete this record?")) del.mutate(row.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
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

function renderCell(v: unknown): ReactNode {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "object") return <span className="text-xs text-muted-foreground">{JSON.stringify(v)}</span>;
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return formatDateTime(s);
  return s;
}
