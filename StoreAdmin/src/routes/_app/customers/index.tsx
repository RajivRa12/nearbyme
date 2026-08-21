import { Link } from 'react-router-dom';
import { ResourceList } from "@/components/resource-list";
import { Button } from "@/components/ui/button";

export default () => (
    <ResourceList
      title="Customers"
      description="CRM: profiles, visit history, notes and outstanding balances."
      endpoint="/api/erp/crm/"
      columns={[
        { key: "id", label: "Customer", render: (r) => r.customer_code || `CUST-${String(r.id).padStart(6, "0")}` },
        { key: "name", label: "Name", render: (r) => r.name || r.full_name || "—" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "outstanding", label: "Outstanding", render: (r) => r.outstanding ?? r.outstanding_balance ?? "—" },
      ]}
      createFields={[
        { name: "full_name", label: "Full name", required: true },
        { name: "phone", label: "Phone" },
        { name: "email", label: "Email" },
      ]}
      extraActions={(row) => (
        <Button asChild size="sm" variant="ghost">
          <Link to={`/customers/${String(row.id)}`}>Open</Link>
        </Button>
      )}
    />
  );
