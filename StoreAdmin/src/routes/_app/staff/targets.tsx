import { useQuery } from "@/hooks/useFetch";
import { api } from "@/lib/api";
import { ResourceList, type Field } from "@/components/resource-list";
import { toArray, formatINR } from "@/lib/format";

type StaffLite = { id: string | number; name?: string; first_name?: string; last_name?: string };

export default function StaffTargets() {
  const staffQ = useQuery({ queryKey: ["/api/erp/staff/"], queryFn: () => api<unknown>("/api/erp/staff/") });
  const staffOptions = toArray<StaffLite>(staffQ.data).map((s) => ({
    label: (s.name || `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim()) || String(s.id),
    value: String(s.id),
  }));

  const fields: Field[] = [
    { name: "staff", label: "Staff Member", options: staffOptions, required: true },
    { name: "month_year", label: "Month (MM-YYYY)", required: true },
    { name: "revenue_target", label: "Revenue Target", type: "number", required: true },
  ];

  return (
    <ResourceList
      title="Staff Targets"
      description="Monthly revenue targets per staff member."
      endpoint="/api/erp/staff-targets/"
      emptyMessage="No targets set yet."
      columns={[
        { key: "staff_name", label: "Staff" },
        { key: "month_year", label: "Month" },
        { key: "revenue_target", label: "Target", render: (r) => formatINR(r.revenue_target) },
        { key: "achieved_revenue", label: "Achieved", render: (r) => formatINR(r.achieved_revenue) },
      ]}
      createFields={fields}
      editFields={fields}
      deletable
    />
  );
}
