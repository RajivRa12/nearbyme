import { ResourceList } from "@/components/resource-list";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

async function toggleActive(row: any, refetch: () => void) {
  try {
    await api(`/api/erp/coupons/${row.id}/`, { method: "PATCH", body: { is_active: !row.is_active } });
    toast.success(row.is_active ? "Coupon deactivated" : "Coupon activated");
    refetch();
  } catch (e) {
    toast.error(e instanceof ApiError ? e.message : "Could not update coupon");
  }
}

const DISCOUNT_TYPE_OPTIONS = [
  { label: "Percentage", value: "PERCENTAGE" },
  { label: "Flat Amount", value: "FLAT" },
];

export default () => (
    <ResourceList
      title="Coupons"
      endpoint="/api/erp/coupons/"
      columns={[
        { key: "id", label: "#" },
        { key: "code", label: "Code" },
        { key: "discount_type", label: "Type" },
        { key: "discount_value", label: "Value" },
        { key: "start_date", label: "From" },
        { key: "end_date", label: "To" },
        { key: "is_active", label: "Active" },
      ]}
      createFields={[
        { name: "code", label: "Code", required: true },
        { name: "discount_type", label: "Type", options: DISCOUNT_TYPE_OPTIONS },
        { name: "discount_value", label: "Value", type: "number", required: true },
        { name: "start_date", label: "Start Date", type: "date", required: true },
        { name: "end_date", label: "End Date", type: "date", required: true },
      ]}
      editFields={[
        { name: "code", label: "Code", required: true },
        { name: "discount_type", label: "Type", options: DISCOUNT_TYPE_OPTIONS },
        { name: "discount_value", label: "Value", type: "number", required: true },
        { name: "start_date", label: "Start Date", type: "date", required: true },
        { name: "end_date", label: "End Date", type: "date", required: true },
      ]}
      deletable
      extraActions={(row, refetch) => (
        <>
          <DropdownMenuItem onSelect={() => toggleActive(row, refetch)}>
            {row.is_active
              ? <><EyeOff className="h-4 w-4 mr-2" /> Deactivate</>
              : <><Eye className="h-4 w-4 mr-2" /> Activate</>}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </>
      )}
    />
  );
