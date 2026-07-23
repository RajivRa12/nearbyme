import { ResourceList } from "@/components/resource-list";
import { formatINR } from "@/lib/format";

export default () => (
    <ResourceList
      title="Payroll"
      endpoint="/api/erp/payroll/"
      searchable
      columns={[
        { key: "id", label: "#" },
        { key: "staff_name", label: "Staff", render: (r) => r.staff_name || r.staff || "—" },
        { key: "period", label: "Period" },
        { key: "basic", label: "Basic", render: (r) => formatINR(r.basic) },
        { key: "allowances", label: "Allowances", render: (r) => formatINR(r.allowances) },
        { key: "deductions", label: "Deductions", render: (r) => formatINR(r.deductions) },
        { key: "net", label: "Net", render: (r) => formatINR(r.net ?? r.net_pay) },
      ]}
    />
  );
