import { useState } from "react";
import { ResourceList } from "@/components/resource-list";
import { ProfessionalManageDialog } from "@/components/professional-manage-dialog";
import { RowActionsMenu } from "@/components/row-actions-menu";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useQuery } from "@/hooks/useFetch";
import { api, ApiError } from "@/lib/api";
import { toArray } from "@/lib/format";
import { toast } from "sonner";
import { Settings2, Eye, EyeOff } from "lucide-react";

export default function Professionals() {
  const skillTagsQuery = useQuery({
    queryKey: ["/api/erp/professionals/skill-tags/"],
    queryFn: () => api<unknown>("/api/erp/professionals/skill-tags/"),
  });
  const skillTags = toArray<string>(skillTagsQuery.data);

  const [manageRow, setManageRow] = useState<any | null>(null);
  const [manageRefetch, setManageRefetch] = useState<(() => void) | null>(null);
  const [manageOpen, setManageOpen] = useState(false);

  async function toggleBookable(row: any, refetch: () => void) {
    try {
      await api(`/api/erp/professionals/${row.id}/`, { method: "PATCH", body: { is_bookable: !row.is_bookable } });
      toast.success(row.is_bookable ? "Bookings paused" : "Now bookable");
      refetch();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not update");
    }
  }

  return (
    <>
      <ResourceList
        title="Professionals"
        description="Staff who perform services at this outlet — invite them, assign skills, set their weekly schedule, and manage time off."
        endpoint="/api/erp/professionals/"
        emptyMessage="No professionals yet. Invite one to get started."
        columns={[
          { key: "display_name", label: "Name" },
          { key: "display_role", label: "Role" },
          { key: "phone_e164", label: "Phone" },
          { key: "link_status", label: "Status" },
          { key: "is_bookable", label: "Bookable" },
        ]}
        createFields={[
          { name: "display_name", label: "Name", required: true },
          { name: "display_role", label: "Role", type: "text" },
          { name: "phone_e164", label: "Phone" },
          { name: "email", label: "Email", type: "email" },
          {
            name: "gender",
            label: "Gender",
            options: [
              { label: "Female", value: "female" },
              { label: "Male", value: "male" },
              { label: "Other", value: "other" },
            ],
          },
        ]}
        extraActions={(row, refetch) => (
          <RowActionsMenu>
            <DropdownMenuItem
              onSelect={() => { setManageRow(row); setManageRefetch(() => refetch); setManageOpen(true); }}
            >
              <Settings2 className="h-4 w-4 mr-2" /> Manage skills & schedule
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => toggleBookable(row, refetch)}>
              {row.is_bookable
                ? <><EyeOff className="h-4 w-4 mr-2" /> Pause bookings</>
                : <><Eye className="h-4 w-4 mr-2" /> Resume bookings</>}
            </DropdownMenuItem>
          </RowActionsMenu>
        )}
      />
      {manageRow && manageRefetch && (
        <ProfessionalManageDialog
          professional={manageRow}
          skillTags={skillTags}
          onChanged={manageRefetch}
          open={manageOpen}
          onOpenChange={setManageOpen}
        />
      )}
    </>
  );
}
