import { ResourceList } from "@/components/resource-list";

const ROLE_OPTIONS = [
  { label: "Therapist", value: "THERAPIST" },
  { label: "Receptionist", value: "RECEPTIONIST" },
  { label: "Store Admin", value: "STORE_ADMIN" },
];

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
        { key: "is_active", label: "Active", render: (r) => (r.is_active ? "Yes" : "No") },
      ]}
      createFields={[
        { name: "first_name", label: "First Name", required: true },
        { name: "last_name", label: "Last Name", required: true },
        { name: "role", label: "Role", options: ROLE_OPTIONS },
        { name: "phone", label: "Phone" },
        { name: "email", label: "Email", type: "email" },
      ]}
      editFields={[
        { name: "first_name", label: "First Name", required: true },
        { name: "last_name", label: "Last Name", required: true },
        { name: "role", label: "Role", options: ROLE_OPTIONS },
        { name: "phone", label: "Phone" },
        { name: "email", label: "Email", type: "email" },
        {
          name: "is_active",
          label: "Active",
          options: [
            { label: "Yes", value: "true" },
            { label: "No", value: "false" },
          ],
        },
      ]}
      deletable
    />
  );
