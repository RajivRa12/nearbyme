import { useNavigate } from 'react-router-dom';
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@/hooks/useFetch";
import { api } from "@/lib/api";
import { toArray } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Store, LogOut } from "lucide-react";

type BrandStore = { id: string; name: string; status: string; address: string | null };

export default function SelectStore() {
  const { user, token, loading, currentStoreId, switchStore, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    if (user?.role !== "BRAND_OWNER") {
      navigate("/", { replace: true });
      return;
    }
    if (currentStoreId) {
      navigate("/", { replace: true });
    }
  }, [loading, token, user, currentStoreId, navigate]);

  const storesQ = useQuery({
    queryKey: ["/api/erp/my-stores/"],
    queryFn: () => api<{ data: BrandStore[] }>("/api/erp/my-stores/"),
  });
  const stores = toArray<BrandStore>(storesQ.data);

  function pick(store: BrandStore) {
    switchStore(String(store.id));
    navigate("/", { replace: true });
  }

  if (loading || !token || user?.role !== "BRAND_OWNER" || currentStoreId) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Select a store</CardTitle>
              <CardDescription>Pick which location you want to manage.</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {storesQ.isLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading your stores…
            </div>
          ) : storesQ.isError ? (
            <p className="text-sm text-destructive py-4">{(storesQ.error as Error)?.message ?? "Could not load stores."}</p>
          ) : stores.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No stores are set up under your brand yet.</p>
          ) : (
            stores.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => pick(s)}
                className="w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left hover:bg-accent transition-colors"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 grid place-items-center shrink-0">
                  <Store className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{s.name}</div>
                  {s.address && <div className="text-xs text-muted-foreground truncate">{s.address}</div>}
                </div>
                <Badge variant={s.status === "ACTIVE" ? "default" : "outline"}>{s.status}</Badge>
              </button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
