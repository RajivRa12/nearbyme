import { useQuery, useMutation, useQueryClient } from "@/hooks/useFetch";
import { api } from "@/lib/api";
import { toArray, formatDateTime } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { useState, type ReactNode } from "react";
import { Loader2, RefreshCw, Plus, Trash2, Pencil, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

export type Column = {
  key: string;
  label: string;
  render?: (row: any) => ReactNode;
};

export type Field = { name: string; label: string; type?: string; required?: boolean; options?: {label: string, value: string}[] };

export function ResourceList({
  title,
  description,
  endpoint,
  columns,
  searchable = true,
  createFields,
  editFields,
  deletable = false,
  extraActions,
  emptyMessage = "No records yet.",
  onNew,
  newLabel = "New",
}: {
  title: string;
  description?: string;
  endpoint: string;
  columns: Column[];
  searchable?: boolean;
  createFields?: Field[];
  /** If provided, each row gets an Edit action opening a form pre-filled with the row's values, PATCHed on save. */
  editFields?: Field[];
  deletable?: boolean;
  extraActions?: (row: any, refetch: () => void) => ReactNode;
  emptyMessage?: string;
  /** If provided, the New button calls this instead of opening the generic inline create form (e.g. to navigate to a dedicated flow). */
  onNew?: () => void;
  newLabel?: string;
}) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

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

  const edit = useMutation({
    mutationFn: (vars: { id: string | number; body: Record<string, unknown> }) =>
      api(`${endpoint}${vars.id}/`, { method: "PATCH", body: vars.body }),
    onSuccess: () => {
      toast.success("Saved");
      setEditing(null);
      setEditForm({});
      qc.invalidateQueries({ queryKey: [endpoint] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openEdit(row: any) {
    const seed: Record<string, string> = {};
    (editFields ?? []).forEach((f) => { seed[f.name] = row[f.name] === null || row[f.name] === undefined ? "" : String(row[f.name]); });
    setEditing(row);
    setEditForm(seed);
  }

  const rows = toArray<any>(list.data);
  const filtered = q
    ? rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q.toLowerCase()))
    : rows;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-background/50 p-4 rounded-2xl border border-muted-foreground/5 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground/90">{title}</h1>
          {description && <p className="text-sm text-muted-foreground max-w-xl">{description}</p>}
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
          {(createFields || onNew) && (
            <Button size="sm" onClick={() => (onNew ? onNew() : setCreating(true))}>
              <Plus className="h-4 w-4 mr-1" /> {newLabel}
            </Button>
          )}
        </div>
      </div>

      {createFields && (
        <Dialog open={creating} onOpenChange={(open) => { setCreating(open); if (!open) setForm({}); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>New {title.replace(/s$/, "")}</DialogTitle>
              <DialogDescription>Fill in the details below and save.</DialogDescription>
            </DialogHeader>
            <form
              className="grid gap-4 md:grid-cols-2 py-1"
              onSubmit={(e) => {
                e.preventDefault();
                create.mutate(form);
              }}
            >
              {createFields.map((f) => (
                <div key={f.name} className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                  {f.options ? (
                    <Select
                      required={f.required}
                      value={form[f.name] ?? ""}
                      onValueChange={(v) => setForm((s) => ({ ...s, [f.name]: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        {f.options.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
              <DialogFooter className="md:col-span-2 mt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setCreating(false)}>Cancel</Button>
                <Button type="submit" disabled={create.isPending} size="sm">
                  {create.isPending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {editFields && (
        <Dialog open={!!editing} onOpenChange={(open) => { if (!open) { setEditing(null); setEditForm({}); } }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit {title.replace(/s$/, "")}</DialogTitle>
              <DialogDescription>Update the details below and save.</DialogDescription>
            </DialogHeader>
            <form
              className="grid gap-4 md:grid-cols-2 py-1"
              onSubmit={(e) => {
                e.preventDefault();
                if (editing) edit.mutate({ id: editing.id, body: editForm });
              }}
            >
              {editFields.map((f) => (
                <div key={f.name} className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                  {f.options ? (
                    <Select
                      required={f.required}
                      value={editForm[f.name] ?? ""}
                      onValueChange={(v) => setEditForm((s) => ({ ...s, [f.name]: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        {f.options.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={f.type ?? "text"}
                      required={f.required}
                      value={editForm[f.name] ?? ""}
                      onChange={(e) => setEditForm((s) => ({ ...s, [f.name]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
              <DialogFooter className="md:col-span-2 mt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
                <Button type="submit" disabled={edit.isPending} size="sm">
                  {edit.isPending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <Card className="overflow-hidden border-muted-foreground/10 shadow-sm rounded-xl">
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
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent">
                    {columns.map((c) => (
                      <TableHead key={c.key} className="h-10 text-xs font-medium uppercase tracking-wider">{c.label}</TableHead>
                    ))}
                  {(deletable || extraActions || editFields) && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row, i) => (
                    <TableRow key={row.id ?? i} className="group hover:bg-primary/5 transition-colors cursor-default">
                      {columns.map((c) => (
                        <TableCell key={c.key} className="py-3">
                        {c.render ? c.render(row) : renderCell(row[c.key])}
                      </TableCell>
                    ))}
                    {(deletable || extraActions || editFields) && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {editFields ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" title="Actions">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onSelect={() => openEdit(row)}>
                                  <Pencil className="h-4 w-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                {/* When editFields is set, extraActions renders inside this same menu
                                    (as plain DropdownMenuItems) instead of as its own separate trigger,
                                    so each row gets exactly one 3-dot menu. */}
                                {extraActions?.(row, list.refetch)}
                                {deletable && (
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onSelect={() => {
                                      if (confirm("Delete this record?")) del.mutate(row.id);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <>
                              {extraActions?.(row, list.refetch)}
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
                            </>
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
