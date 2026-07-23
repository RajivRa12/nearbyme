import { ResourceList } from "@/components/resource-list";

export default () => (
    <ResourceList
      title="Vendors"
      endpoint="/api/erp/vendors/"
      columns={[
        { key: "id", label: "#" },
        { key: "name", label: "Name" },
        { key: "contact", label: "Contact" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
      ]}
      createFields={[
        { name: "name", label: "Vendor name", required: true },
        { name: "contact", label: "Contact person" },
        { name: "phone", label: "Phone" },
        { name: "email", label: "Email" },
      ]}
      deletable
    />
  );
