import { ResourceList, type Field } from "@/components/resource-list";
import { formatINR, formatDate } from "@/lib/format";

export default () => (
  <ResourceList
    title="Gift Cards"
    description="Issue and manage store gift cards."
    endpoint="/api/erp/giftcards/"
    emptyMessage="No gift cards issued yet."
    columns={[
      { key: "code", label: "Code" },
      { key: "recipient_email", label: "Recipient" },
      { key: "initial_value", label: "Initial Value", render: (r) => formatINR(r.initial_value) },
      { key: "current_balance", label: "Balance", render: (r) => formatINR(r.current_balance) },
      { key: "expiry_date", label: "Expires", render: (r) => formatDate(r.expiry_date) },
      { key: "is_active", label: "Active", render: (r) => (r.is_active ? "Yes" : "No") },
    ]}
    createFields={[
      { name: "code", label: "Code", required: true },
      { name: "recipient_email", label: "Recipient Email", type: "email" },
      { name: "initial_value", label: "Initial Value", type: "number", required: true },
      { name: "expiry_date", label: "Expiry Date", type: "date", required: true },
    ]}
    editFields={([
      { name: "recipient_email", label: "Recipient Email", type: "email" },
      { name: "expiry_date", label: "Expiry Date", type: "date", required: true },
      {
        name: "is_active",
        label: "Active",
        options: [
          { label: "Yes", value: "true" },
          { label: "No", value: "false" },
        ],
      },
    ]) as Field[]}
    deletable
  />
);
