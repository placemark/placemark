import { invalidateQuery, useMutation } from "@blitzjs/rpc";
import toast from "react-hot-toast";
import deleteInvitation from "app/memberships/mutations/deleteInvitation";
import type { Member } from "app/organizations/queries/getOrganization";
import getOrganization from "app/organizations/queries/getOrganization";
import { Button } from "app/components/elements";

export function InvitedMember({ member }: { member: Member }) {
  const [deleteInvitationMutation] = useMutation(deleteInvitation);
  if (member.user) throw new Error("user should be asserted");
  return (
    <tr>
      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-6">
        {member.invitedName} ({member.invitedEmail})
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
        Invited but hasn’t accepted yet.{" "}
        <Button
          type="button"
          onClick={async () => {
            if (!confirm("Are you sure you want to cancel this invitation?")) {
              return;
            }
            await deleteInvitationMutation({ id: member.id });
            toast.success("Cancelled invitation");
            await invalidateQuery(getOrganization, null);
          }}
          size="xs"
        >
          Cancel invitation
        </Button>
      </td>
    </tr>
  );
}
