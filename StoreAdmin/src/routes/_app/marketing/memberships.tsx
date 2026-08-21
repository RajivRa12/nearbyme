import { ResourceList } from "@/components/resource-list";
import { formatINR } from "@/lib/format";

export default () => (
    <ResourceList
      title="Membership plans"
      endpoint="/api/erp/memberships/"
      columns={[
        { key: "id", label: "#" },
        { key: "name", label: "Plan" },
        { key: "price", label: "Price", render: (r) => formatINR(r.price) },
        { key: "duration_days", label: "Duration (days)" },
        { key: "benefits", label: "Benefits" },
      ]}
      createFields={[
        { name: "name", label: "Plan name", required: true },
        { name: "price", label: "Price", type: "number", required: true },
        { name: "duration_days", label: "Duration (days)", type: "number" },
        { name: "benefits", label: "Benefits" },
      ]}
      editFields={[
        { name: "name", label: "Plan name", required: true },
        { name: "price", label: "Price", type: "number", required: true },
        { name: "duration_days", label: "Duration (days)", type: "number" },
        { name: "benefits", label: "Benefits" },
      ]}
      deletable
    />
  );
