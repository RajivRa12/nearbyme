import { ResourceList } from "@/components/resource-list";

export default () => (
  <ResourceList
    title="Vendors"
    description="Suppliers you order stock from. Needed to create purchase orders."
    endpoint="/api/erp/vendors/"
    emptyMessage="No vendors yet. Add one to start creating purchase orders."
    columns={[
      { key: "name", label: "Name" },
      { key: "contact_person", label: "Contact" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
    ]}
    createFields={[
      { name: "name", label: "Name", required: true },
      { name: "contact_person", label: "Contact Person" },
      { name: "phone", label: "Phone" },
      { name: "email", label: "Email", type: "email" },
    ]}
    editFields={[
      { name: "name", label: "Name", required: true },
      { name: "contact_person", label: "Contact Person" },
      { name: "phone", label: "Phone" },
      { name: "email", label: "Email", type: "email" },
    ]}
    deletable
  />
);
