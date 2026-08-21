import { useNavigate, Outlet } from 'react-router-dom';
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default AppLayout;

function AppLayout() {
  const { token, loading, user, currentStoreId } = useAuth();
  const navigate = useNavigate();

  const needsStorePick = user?.role === "BRAND_OWNER" && !currentStoreId;

  useEffect(() => {
    if (loading) return;
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    if (needsStorePick) {
      navigate("/select-store", { replace: true });
    }
  }, [loading, token, needsStorePick, navigate]);

  if (loading || !token || needsStorePick) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
