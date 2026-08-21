import { ResourceList, type Field } from "@/components/resource-list";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { formatDateTime } from "@/lib/format";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

const fields: Field[] = [
  { name: "title", label: "Title", required: true },
  { name: "content", label: "Message", required: true },
];

async function toggleActive(row: any, refetch: () => void) {
  try {
    await api(`/api/erp/announcements/${row.id}/`, { method: "PATCH", body: { is_active: !row.is_active } });
    toast.success(row.is_active ? "Announcement hidden" : "Announcement published");
    refetch();
  } catch (e) {
    toast.error((e as Error).message);
  }
}

export default function Feed() {
  return (
    <ResourceList
      title="Feed"
      description="Post announcements your therapists see in the app's Feed tab."
      endpoint="/api/erp/announcements/"
      emptyMessage="No announcements yet. Post one and your team will see it right away."
      columns={[
        { key: "title", label: "Title" },
        { key: "content", label: "Message" },
        { key: "is_active", label: "Visible" },
        { key: "created_at", label: "Posted", render: (r) => formatDateTime(r.created_at) },
      ]}
      createFields={fields}
      editFields={fields}
      deletable
      extraActions={(row, refetch) => (
        <DropdownMenuItem onSelect={() => toggleActive(row, refetch)}>
          {row.is_active
            ? <><EyeOff className="h-4 w-4 mr-2" /> Hide</>
            : <><Eye className="h-4 w-4 mr-2" /> Publish</>}
        </DropdownMenuItem>
      )}
    />
  );
}
