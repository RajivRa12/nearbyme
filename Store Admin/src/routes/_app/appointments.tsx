import { ResourceList } from "@/components/resource-list";
import { formatDateTime } from "@/lib/format";

export default () => (
    <ResourceList
      title="Appointments"
      description="Bookings for services. Create new bookings or walk-ins."
      endpoint="/api/erp/appointments/"
      columns={[
        { key: "id", label: "#", render: (r) => String(r.id).substring(0, 8) },
        { key: "customer_name", label: "Customer", render: (r) => r.customer_name || r.customer || "Walk-in" },
        { key: "service_name", label: "Service", render: (r) => r.service_name || r.service || "—" },
        { key: "therapist_name", label: "Therapist", render: (r) => r.therapist_name || r.therapist || "—" },
        { key: "start_time", label: "Start", render: (r) => formatDateTime(r.start_time || r.start || r.appointment_time) },
        { key: "status", label: "Status" },
      ]}
      createFields={[
        { name: "customer", label: "Customer ID (blank for walk-in)" },
        { name: "start_time", label: "Start time", type: "datetime-local", required: true },
        { name: "items", label: "Items JSON (e.g. [{\"service_id\": 1, \"therapist_id\": 1}])", required: true },
        { name: "notes", label: "Notes" },
        { 
          name: "status", 
          label: "Status", 
          options: [
            { label: "Booked", value: "BOOKED" },
            { label: "In Progress", value: "IN_PROGRESS" },
            { label: "Completed", value: "COMPLETED" },
            { label: "Cancelled", value: "CANCELLED" }
          ]
        },
      ]}
      deletable
    />
  );
