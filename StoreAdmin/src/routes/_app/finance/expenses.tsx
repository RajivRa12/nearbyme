import { ResourceList, type Field } from "@/components/resource-list";
import { formatINR, formatDate } from "@/lib/format";

const CATEGORY_OPTIONS = [
  { label: "Rent", value: "RENT" },
  { label: "Utilities", value: "UTILITIES" },
  { label: "Salary", value: "SALARY" },
  { label: "Marketing", value: "MARKETING" },
  { label: "Supplies", value: "SUPPLIES" },
  { label: "Petty Cash", value: "PETTY_CASH" },
  { label: "Other", value: "OTHER" },
];

const fields: Field[] = [
  { name: "category", label: "Category", options: CATEGORY_OPTIONS, required: true },
  { name: "amount", label: "Amount", type: "number", required: true },
  { name: "date_incurred", label: "Date", type: "date", required: true },
  { name: "description", label: "Description" },
];

export default () => (
  <ResourceList
    title="Expenses"
    description="Track rent, utilities, salaries, and other store costs."
    endpoint="/api/erp/expenses/"
    emptyMessage="No expenses recorded yet."
    columns={[
      { key: "category", label: "Category" },
      { key: "amount", label: "Amount", render: (r) => formatINR(r.amount) },
      { key: "date_incurred", label: "Date", render: (r) => formatDate(r.date_incurred) },
      { key: "description", label: "Description" },
      { key: "recorded_by_name", label: "Recorded By" },
    ]}
    createFields={fields}
    editFields={fields}
    deletable
  />
);
