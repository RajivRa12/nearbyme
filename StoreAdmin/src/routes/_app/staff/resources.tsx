import { ResourceList } from "@/components/resource-list";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

async function toggleBookable(row: any, refetch: () => void) {
  try {
    await api(`/api/erp/resources/${row.id}/`, { method: "PATCH", body: { is_bookable: !row.is_bookable } });
    toast.success(row.is_bookable ? "Marked unbookable" : "Marked bookable");
    refetch();
  } catch (e) {
    toast.error(e instanceof ApiError ? e.message : "Could not update");
  }
}

const RESOURCE_TYPE_OPTIONS = [
  { label: "Chair", value: "chair" },
  { label: "Room", value: "room" },
  { label: "Equipment", value: "equipment" },
];

export default () => (
  <ResourceList
    title="Resources"
    description="Chairs, rooms, and equipment this outlet can book customers into."
    endpoint="/api/erp/resources/"
    emptyMessage="No resources yet. Add a chair, room, or piece of equipment."
    columns={[
      { key: "name", label: "Name" },
      { key: "resource_type", label: "Type" },
      { key: "capacity", label: "Capacity" },
      { key: "is_bookable", label: "Bookable" },
    ]}
    createFields={[
      { name: "name", label: "Name", required: true },
      { name: "resource_type", label: "Type", options: RESOURCE_TYPE_OPTIONS },
      { name: "capacity", label: "Capacity", type: "number" },
    ]}
    editFields={[
      { name: "name", label: "Name", required: true },
      { name: "resource_type", label: "Type", options: RESOURCE_TYPE_OPTIONS },
      { name: "capacity", label: "Capacity", type: "number" },
    ]}
    deletable
    extraActions={(row, refetch) => (
      <>
        <DropdownMenuItem onSelect={() => toggleBookable(row, refetch)}>
          {row.is_bookable
            ? <><EyeOff className="h-4 w-4 mr-2" /> Mark unbookable</>
            : <><Eye className="h-4 w-4 mr-2" /> Mark bookable</>}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
      </>
    )}
  />
);
