import { ResourceList } from "@/components/resource-list";

export default () => (
    <ResourceList
      title="Coupons"
      endpoint="/api/erp/coupons/"
      columns={[
        { key: "id", label: "#" },
        { key: "code", label: "Code" },
        { key: "discount_type", label: "Type" },
        { key: "discount_value", label: "Value" },
        { key: "valid_from", label: "From" },
        { key: "valid_to", label: "To" },
        { key: "active", label: "Active" },
      ]}
      createFields={[
        { name: "code", label: "Code", required: true },
        { 
          name: "discount_type", 
          label: "Type", 
          options: [
            { label: "Percentage", value: "PERCENTAGE" },
            { label: "Flat Amount", value: "FLAT" }
          ]
        },
        { name: "discount_value", label: "Value", type: "number", required: true },
        { name: "start_date", label: "Start Date", type: "date", required: true },
        { name: "end_date", label: "End Date", type: "date", required: true },
      ]}
      deletable
    />
  );
