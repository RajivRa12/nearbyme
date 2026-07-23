import { ResourceList } from "@/components/resource-list";
import { formatINR, formatDateTime } from "@/lib/format";

export default () => (
    <ResourceList
      title="Purchase Orders"
      endpoint="/api/erp/purchase-orders/"
      columns={[
        { key: "id", label: "#" },
        { key: "vendor_name", label: "Vendor", render: (r) => r.vendor_name || r.vendor || "—" },
        { key: "status", label: "Status" },
        { key: "total", label: "Total", render: (r) => formatINR(r.total) },
        { key: "created_at", label: "Created", render: (r) => formatDateTime(r.created_at || r.created) },
      ]}
      createFields={[
        { name: "vendor", label: "Vendor ID", required: true },
        { name: "items", label: "Items JSON" },
        { 
          name: "status", 
          label: "Status", 
          options: [
            { label: "Pending", value: "PENDING" },
            { label: "Received", value: "RECEIVED" },
            { label: "Cancelled", value: "CANCELLED" }
          ]
        },
      ]}
      deletable
    />
  );
