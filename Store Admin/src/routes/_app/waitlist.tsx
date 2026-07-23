import { ResourceList } from "@/components/resource-list";

export default () => (
    <ResourceList
      title="Waitlist"
      endpoint="/api/erp/waitlist/"
      columns={[
        { key: "id", label: "#" },
        { key: "customer_name", label: "Customer", render: (r) => r.customer_name || r.customer || "—" },
        { key: "service_name", label: "Service", render: (r) => r.service_name || r.service || "—" },
        { key: "requested_time", label: "Requested" },
        { key: "status", label: "Status" },
      ]}
      createFields={[
        { name: "customer", label: "Customer ID" },
        { name: "service", label: "Service ID", required: true },
        { name: "preferred_date", label: "Preferred Date", type: "date", required: true },
        { name: "preferred_time_slot", label: "Preferred Time", type: "time", required: true },
        { 
          name: "status", 
          label: "Status", 
          options: [
            { label: "Waiting", value: "WAITING" },
            { label: "Notified", value: "NOTIFIED" },
            { label: "Booked", value: "BOOKED" },
            { label: "Cancelled", value: "CANCELLED" }
          ]
        },
      ]}
      deletable
    />
  );
