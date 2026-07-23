import { ResourceList } from "@/components/resource-list";

export default () => (
    <ResourceList
      title="Leave requests"
      endpoint="/api/erp/leaves/"
      columns={[
        { key: "id", label: "#" },
        { key: "staff_name", label: "Staff", render: (r) => r.staff_name || r.staff || "—" },
        { key: "from_date", label: "From" },
        { key: "to_date", label: "To" },
        { key: "reason", label: "Reason" },
        { key: "status", label: "Status" },
      ]}
      createFields={[
        { name: "staff", label: "Staff ID", required: true },
        { name: "start_date", label: "From", type: "date", required: true },
        { name: "end_date", label: "To", type: "date", required: true },
        { name: "reason", label: "Reason", required: true },
        { 
          name: "status", 
          label: "Status", 
          options: [
            { label: "Pending", value: "PENDING" },
            { label: "Approved", value: "APPROVED" },
            { label: "Rejected", value: "REJECTED" }
          ]
        },
      ]}
    />
  );
