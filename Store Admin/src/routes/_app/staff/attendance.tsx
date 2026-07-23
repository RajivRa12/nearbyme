import { ResourceList } from "@/components/resource-list";
import { formatDateTime } from "@/lib/format";

export default () => (
    <ResourceList
      title="Attendance"
      description="Mark check-in / check-out for staff."
      endpoint="/api/erp/attendance/"
      columns={[
        { key: "id", label: "#" },
        { key: "staff_name", label: "Staff", render: (r) => r.staff_name || r.staff || "—" },
        { key: "check_in", label: "Check-in", render: (r) => formatDateTime(r.check_in) },
        { key: "check_out", label: "Check-out", render: (r) => formatDateTime(r.check_out) },
        { key: "status", label: "Status" },
      ]}
      createFields={[
        { name: "staff", label: "Staff ID", required: true },
        { name: "date", label: "Date", type: "date", required: true },
        { 
          name: "status", 
          label: "Status",
          options: [
            { label: "Present", value: "PRESENT" },
            { label: "Absent", value: "ABSENT" },
            { label: "Half Day", value: "HALF_DAY" },
            { label: "Late", value: "LATE" }
          ]
        },
      ]}
    />
  );
