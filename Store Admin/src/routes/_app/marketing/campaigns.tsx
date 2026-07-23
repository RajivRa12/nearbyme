import { ResourceList } from "@/components/resource-list";

export default () => (
    <ResourceList
      title="Campaigns"
      endpoint="/api/erp/campaigns/"
      columns={[
        { key: "id", label: "#" },
        { key: "name", label: "Name" },
        { key: "channel", label: "Channel" },
        { key: "status", label: "Status" },
        { key: "start_date", label: "Start" },
        { key: "end_date", label: "End" },
      ]}
      createFields={[
        { name: "name", label: "Name", required: true },
        { 
          name: "channel", 
          label: "Channel", 
          options: [
            { label: "SMS", value: "SMS" },
            { label: "Email", value: "EMAIL" },
            { label: "WhatsApp", value: "WHATSAPP" },
            { label: "Push", value: "PUSH" },
            { label: "In App", value: "IN_APP" }
          ]
        },
        { name: "message_body", label: "Message Body", required: true },
        { name: "target_audience", label: "Target Audience", required: true },
        { name: "start_date", label: "Start Date", type: "date" },
        { name: "end_date", label: "End Date", type: "date" },
      ]}
      deletable
    />
  );
