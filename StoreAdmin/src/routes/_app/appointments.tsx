import { useNavigate } from "react-router-dom";
import { ResourceList } from "@/components/resource-list";
import { RowActionsMenu } from "@/components/row-actions-menu";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { api, ApiError } from "@/lib/api";
import { formatDateTime, formatINR } from "@/lib/format";
import { toast } from "sonner";
import { Play, CheckCircle2, XCircle, Ban } from "lucide-react";

type Slot = { id: string; store_service_name: string; professional_name: string | null; price_paise: number };
type Payment = { payment_type: "full" | "deposit"; status: string; amount_paise: number; total_amount_paise: number; balance_due_paise: number };
type BookingRow = { id: string; customer_name: string | null; status: string; booking_start: string; slots: Slot[]; payment: Payment | null };

const STATUS_TONE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  confirmed: "default",
  in_service: "secondary",
  completed: "secondary",
  cancelled: "destructive",
  no_show: "destructive",
};

export default function Appointments() {
  const navigate = useNavigate();

  async function runAction(id: string, action: string, refetch: () => void, body?: unknown) {
    try {
      await api(`/api/erp/bookings/${id}/${action}/`, { method: "POST", body });
      toast.success("Booking updated");
      refetch();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not update booking");
    }
  }

  function cancelBooking(id: string, refetch: () => void) {
    const reason = window.prompt("Reason for cancelling this booking:");
    if (reason === null) return;
    if (!reason.trim()) {
      toast.error("A cancellation reason is required");
      return;
    }
    runAction(id, "cancel", refetch, { reason: reason.trim() });
  }

  return (
    <ResourceList
      title="Appointments"
      description="Real bookings made through the front desk or the customer app for this outlet."
      endpoint="/api/erp/bookings/"
      emptyMessage="No bookings yet. Create one to get started."
      columns={[
        { key: "id", label: "Booking", render: (r) => r.booking_code || String(r.id).slice(0, 8) },
        { key: "customer_name", label: "Customer", render: (r: BookingRow) => r.customer_name || "Walk-in" },
        {
          key: "service",
          label: "Service",
          render: (r: BookingRow) => {
            const s = r.slots?.[0];
            if (!s) return "—";
            return r.slots.length > 1 ? `${s.store_service_name} +${r.slots.length - 1}` : s.store_service_name;
          },
        },
        { key: "professional", label: "Professional", render: (r: BookingRow) => r.slots?.[0]?.professional_name || "Unassigned" },
        { key: "booking_start", label: "Start", render: (r: BookingRow) => formatDateTime(r.booking_start) },
        {
          key: "total",
          label: "Total",
          render: (r: BookingRow) => formatINR((r.slots ?? []).reduce((sum, s) => sum + (s.price_paise || 0), 0) / 100),
        },
        {
          key: "balance_due",
          label: "Balance due",
          render: (r: BookingRow) =>
            r.payment?.payment_type === "deposit" ? (
              <span className="text-amber-600 font-medium">{formatINR(r.payment.balance_due_paise / 100)} at venue</span>
            ) : (
              "—"
            ),
        },
        {
          key: "status",
          label: "Status",
          render: (r: BookingRow) => (
            <Badge variant={STATUS_TONE[r.status] ?? "outline"}>{r.status.replace("_", " ")}</Badge>
          ),
        },
      ]}
      onNew={() => navigate("/bookings/new")}
      newLabel="New Booking"
      extraActions={(row: BookingRow, refetch) => {
        if (row.status === "completed" || row.status === "cancelled" || row.status === "no_show") return null;
        return (
          <RowActionsMenu>
            {row.status === "confirmed" && (
              <DropdownMenuItem onSelect={() => runAction(row.id, "start", refetch)}>
                <Play className="h-4 w-4 mr-2" /> Start
              </DropdownMenuItem>
            )}
            {row.status === "in_service" && (
              <DropdownMenuItem onSelect={() => runAction(row.id, "complete", refetch)}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Complete
              </DropdownMenuItem>
            )}
            {row.status === "confirmed" && (
              <DropdownMenuItem onSelect={() => runAction(row.id, "no-show", refetch)}>
                <XCircle className="h-4 w-4 mr-2" /> No-show
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => cancelBooking(row.id, refetch)}
            >
              <Ban className="h-4 w-4 mr-2" /> Cancel
            </DropdownMenuItem>
          </RowActionsMenu>
        );
      }}
    />
  );
}
