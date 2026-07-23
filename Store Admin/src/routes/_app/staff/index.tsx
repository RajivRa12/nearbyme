import { ResourceList } from "@/components/resource-list";

export default () => (
    <ResourceList
      title="Staff"
      description="Store staff members."
      endpoint="/api/erp/staff/"
      columns={[
        { key: "id", label: "#" },
        { key: "name", label: "Name", render: (r) => r.name || r.full_name || "—" },
        { key: "role", label: "Role" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "active", label: "Active" },
      ]}
      createFields={[
        { name: "first_name", label: "First Name", required: true },
        { name: "last_name", label: "Last Name", required: true },
        { 
          name: "role", 
          label: "Role", 
          options: [
            { label: "Therapist", value: "THERAPIST" },
            { label: "Receptionist", value: "RECEPTIONIST" }
          ]
        },
        { name: "phone", label: "Phone" },
        { name: "email", label: "Email", type: "email" },
      ]}
      deletable
    />
  );
