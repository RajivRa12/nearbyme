import { Link, useNavigate } from 'react-router-dom';
import { ResourceList } from "@/components/resource-list";
import { RowActionsMenu } from "@/components/row-actions-menu";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { api, ApiError } from "@/lib/api";
import { formatINR, formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import { Eye, Undo2 } from "lucide-react";

export default function Billing() {
  const navigate = useNavigate();

  async function refundInvoice(id: string, refetch: () => void) {
    if (!confirm("Refund this invoice?")) return;
    try {
      await api(`/api/erp/invoices/${id}/refund/`, { method: "POST" });
      toast.success("Invoice refunded");
      refetch();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not refund invoice");
    }
  }

  return (
    <ResourceList
      title="Billing"
      description="Invoices, checkout, payments and refunds."
      endpoint="/api/erp/invoices/"
      columns={[
        { key: "id", label: "#" },
        { key: "customer_name", label: "Customer", render: (r) => r.customer_details?.name || r.global_customer_name || "Walk-in" },
        { key: "total", label: "Total", render: (r) => formatINR((r.grand_total_paise ?? 0) / 100) },
        { key: "status", label: "Status" },
        { key: "created_at", label: "Created", render: (r) => formatDateTime(r.created_at || r.created) },
      ]}
      onNew={() => navigate("/pos")}
      newLabel="New Sale"
      extraActions={(row, refetch) => (
        <RowActionsMenu>
          <DropdownMenuItem asChild>
            <Link to={`/billing/${String(row.id)}`} className="cursor-pointer">
              <Eye className="h-4 w-4 mr-2" /> Open
            </Link>
          </DropdownMenuItem>
          {row.status === "PAID" && (
            <DropdownMenuItem onSelect={() => refundInvoice(row.id, refetch)}>
              <Undo2 className="h-4 w-4 mr-2" /> Refund
            </DropdownMenuItem>
          )}
        </RowActionsMenu>
      )}
    />
  );
}
