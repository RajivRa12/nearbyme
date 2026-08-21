import { useEffect, useState } from "react";
import { useQuery } from "@/hooks/useFetch";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, User, Store } from "lucide-react";

type Me = {
  id: number | string; email: string; first_name: string; last_name: string;
  phone: string | null; role: string; store_name: string | null; outlet_name: string | null;
};
type StoreProfile = {
  id: number | string; store_code: string | null; name: string; address: string | null; working_hours: Record<string, string>;
  currency: string; timezone: string; gst_number: string | null; contact_number: string | null;
  email: string | null; status: string; is_premium_listing: boolean;
};

const DAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];
type DayHours = { closed: boolean; open: string; close: string };

function parseWorkingHours(wh: Record<string, string> | undefined): Record<string, DayHours> {
  const out: Record<string, DayHours> = {};
  for (const d of DAYS) {
    const raw = wh?.[d.key];
    if (!raw || raw.toLowerCase() === "closed") {
      out[d.key] = { closed: true, open: "09:00", close: "21:00" };
    } else {
      const [open, close] = raw.split("-");
      out[d.key] = { closed: false, open: open || "09:00", close: close || "21:00" };
    }
  }
  return out;
}
function serializeWorkingHours(hours: Record<string, DayHours>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const d of DAYS) {
    const h = hours[d.key];
    out[d.key] = h.closed ? "closed" : `${h.open}-${h.close}`;
  }
  return out;
}

function AccountTab() {
  const { user, logout, updateUser } = useAuth();
  const meQ = useQuery({ queryKey: ["/api/erp/me/"], queryFn: () => api<{ data: Me }>("/api/erp/me/") });
  const me = meQ.data?.data;
  const [form, setForm] = useState({ first_name: "", last_name: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [pwForm, setPwForm] = useState({ old_password: "", new_password: "", confirm: "" });
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    if (me) setForm({ first_name: me.first_name || "", last_name: me.last_name || "", phone: me.phone || "" });
  }, [me?.id]);

  async function saveAccount(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/api/erp/me/", { method: "PATCH", body: form });
      toast.success("Profile updated");
      updateUser({ first_name: form.first_name, last_name: form.last_name, phone: form.phone });
      meQ.refetch();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not update profile");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) return toast.error("New passwords don't match");
    if (pwForm.new_password.length < 6) return toast.error("New password must be at least 6 characters");
    setChangingPw(true);
    try {
      await api("/api/erp/me/change-password/", {
        method: "POST",
        body: { old_password: pwForm.old_password, new_password: pwForm.new_password },
      });
      toast.success("Password changed. Please sign in again.");
      setPwForm({ old_password: "", new_password: "", confirm: "" });
      setTimeout(() => logout(), 1200);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not change password");
    } finally {
      setChangingPw(false);
    }
  }

  if (meQ.isLoading) {
    return <div className="p-8 flex items-center justify-center text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal details</CardTitle>
          <CardDescription>Your name and contact number, visible to other staff.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={saveAccount}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">First name</label>
              <Input value={form.first_name} onChange={(e) => setForm((s) => ({ ...s, first_name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Last name</label>
              <Input value={form.last_name} onChange={(e) => setForm((s) => ({ ...s, last_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Phone</label>
              <Input value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} placeholder="+91…" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <Input value={me?.email ?? user?.email ?? ""} disabled />
            </div>
            <div className="md:col-span-2 flex items-center gap-2 pt-1">
              <Badge variant="outline">{me?.role}</Badge>
              {me?.store_name && <Badge variant="outline">{me.store_name}</Badge>}
              {me?.outlet_name && <Badge variant="outline">{me.outlet_name}</Badge>}
            </div>
            <div className="md:col-span-2">
              <Button type="submit" size="sm" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change password</CardTitle>
          <CardDescription>You'll be signed out after changing your password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={changePassword}>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Current password</label>
              <Input type="password" value={pwForm.old_password} onChange={(e) => setPwForm((s) => ({ ...s, old_password: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">New password</label>
              <Input type="password" value={pwForm.new_password} onChange={(e) => setPwForm((s) => ({ ...s, new_password: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Confirm new password</label>
              <Input type="password" value={pwForm.confirm} onChange={(e) => setPwForm((s) => ({ ...s, confirm: e.target.value }))} required />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" size="sm" variant="outline" disabled={changingPw}>{changingPw ? "Changing…" : "Change password"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function StoreTab() {
  const storeQ = useQuery({ queryKey: ["/api/erp/store-profile/"], queryFn: () => api<{ data: StoreProfile }>("/api/erp/store-profile/") });
  const store = storeQ.data?.data;
  const [form, setForm] = useState({ name: "", address: "", contact_number: "", email: "", gst_number: "", currency: "INR", timezone: "Asia/Kolkata" });
  const [hours, setHours] = useState<Record<string, DayHours>>(parseWorkingHours(undefined));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (store) {
      setForm({
        name: store.name || "", address: store.address || "", contact_number: store.contact_number || "",
        email: store.email || "", gst_number: store.gst_number || "", currency: store.currency || "INR",
        timezone: store.timezone || "Asia/Kolkata",
      });
      setHours(parseWorkingHours(store.working_hours));
    }
  }, [store?.id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/api/erp/store-profile/", { method: "PATCH", body: { ...form, working_hours: serializeWorkingHours(hours) } });
      toast.success("Store profile updated");
      storeQ.refetch();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not update store profile");
    } finally {
      setSaving(false);
    }
  }

  if (storeQ.isLoading) {
    return <div className="p-8 flex items-center justify-center text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…</div>;
  }
  if (storeQ.isError) {
    return <div className="p-6 text-sm text-destructive">{(storeQ.error as Error).message}</div>;
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business details</CardTitle>
          <CardDescription>Shown on invoices and the customer-facing booking page.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Store code</label>
            <Input value={store?.store_code || "—"} disabled />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Store name</label>
            <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Contact number</label>
            <Input value={form.contact_number} onChange={(e) => setForm((s) => ({ ...s, contact_number: e.target.value }))} placeholder="+91…" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Store email</label>
            <Input type="email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">GST number</label>
            <Input value={form.gst_number} onChange={(e) => setForm((s) => ({ ...s, gst_number: e.target.value }))} placeholder="e.g. 29ABCDE1234F1Z5" />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Address</label>
            <Textarea value={form.address} onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))} rows={2} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Currency</label>
            <Input value={form.currency} onChange={(e) => setForm((s) => ({ ...s, currency: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Timezone</label>
            <Input value={form.timezone} onChange={(e) => setForm((s) => ({ ...s, timezone: e.target.value }))} />
          </div>
          {store && (
            <div className="md:col-span-2 flex items-center gap-2">
              <Badge variant={store.status === "ACTIVE" ? "default" : "outline"}>{store.status}</Badge>
              {store.is_premium_listing && <Badge variant="outline">Premium listing</Badge>}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Working hours</CardTitle>
          <CardDescription>Used for online booking availability.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {DAYS.map((d) => (
            <div key={d.key} className="flex items-center gap-3 py-1.5 border-b last:border-0">
              <span className="w-28 text-sm font-medium">{d.label}</span>
              <div className="flex items-center gap-2">
                <Switch
                  checked={!hours[d.key]?.closed}
                  onCheckedChange={(checked) => setHours((h) => ({ ...h, [d.key]: { ...h[d.key], closed: !checked } }))}
                />
                <span className="text-xs text-muted-foreground w-12">{hours[d.key]?.closed ? "Closed" : "Open"}</span>
              </div>
              {!hours[d.key]?.closed && (
                <div className="flex items-center gap-2 ml-auto">
                  <Input type="time" className="w-28" value={hours[d.key]?.open} onChange={(e) => setHours((h) => ({ ...h, [d.key]: { ...h[d.key], open: e.target.value } }))} />
                  <span className="text-muted-foreground text-xs">to</span>
                  <Input type="time" className="w-28" value={hours[d.key]?.close} onChange={(e) => setHours((h) => ({ ...h, [d.key]: { ...h[d.key], close: e.target.value } }))} />
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Button type="submit" size="sm" disabled={saving}>{saving ? "Saving…" : "Save store profile"}</Button>
    </form>
  );
}

export default function Profile() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile & Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and your store's details.</p>
      </div>

      <Tabs defaultValue="account">
        <TabsList>
          <TabsTrigger value="account"><User className="h-4 w-4 mr-1.5" /> My Account</TabsTrigger>
          <TabsTrigger value="store"><Store className="h-4 w-4 mr-1.5" /> Store Details</TabsTrigger>
        </TabsList>
        <TabsContent value="account" className="pt-4">
          <AccountTab />
        </TabsContent>
        <TabsContent value="store" className="pt-4">
          <StoreTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
