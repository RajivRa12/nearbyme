import { ResourceList } from "@/components/resource-list";
import { formatINR } from "@/lib/format";

export default () => (
    <ResourceList
      title="Commissions"
      endpoint="/api/erp/commissions/"
      columns={[
        { key: "id", label: "#" },
        { key: "staff_name", label: "Staff", render: (r) => r.staff_name || r.staff || "—" },
        { key: "period", label: "Period" },
        { key: "services", label: "Services" },
        { key: "amount", label: "Amount", render: (r) => formatINR(r.amount ?? r.total) },
      ]}
    />
  );
