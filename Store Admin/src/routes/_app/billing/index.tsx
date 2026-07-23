import { Link } from 'react-router-dom';
import { ResourceList } from "@/components/resource-list";
import { Button } from "@/components/ui/button";
import { formatINR, formatDateTime } from "@/lib/format";

export default () => (
    <ResourceList
      title="Billing"
      description="Invoices, checkout, payments and refunds."
      endpoint="/api/erp/invoices/"
      columns={[
        { key: "id", label: "#" },
        { key: "customer_name", label: "Customer", render: (r) => r.customer_name || r.customer || "Walk-in" },
        { key: "total", label: "Total", render: (r) => formatINR(r.total ?? r.amount) },
        { key: "status", label: "Status" },
        { key: "created_at", label: "Created", render: (r) => formatDateTime(r.created_at || r.created) },
      ]}
      createFields={[
        { name: "customer", label: "Customer ID" },
        { name: "items", label: "Items JSON (e.g. [{\"service\":1,\"qty\":1}])" },
        { 
          name: "status", 
          label: "Status", 
          options: [
            { label: "Unpaid", value: "UNPAID" },
            { label: "Paid", value: "PAID" },
            { label: "Partially Paid", value: "PARTIALLY_PAID" },
            { label: "Refunded", value: "REFUNDED" }
          ]
        },
      ]}
      extraActions={(row) => (
        <Button asChild size="sm" variant="ghost">
          <Link to={`/billing/${String(row.id)}`}>Open</Link>
        </Button>
      )}
    />
  );
