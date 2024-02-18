import { Routes } from "@blitzjs/next";
import { useAuthenticatedSession } from "@blitzjs/auth";
import { useMutation, invalidateQuery } from "@blitzjs/rpc";
import { useRouter } from "next/router";
import type { MembershipRole } from "@prisma/client";
import type { Member } from "app/organizations/queries/getOrganization";
import getOrganization from "app/organizations/queries/getOrganization";
import toast from "react-hot-toast";
import deleteMembership from "app/memberships/mutations/deleteMembership";
import changeRole from "app/memberships/mutations/changeRole";
import { simpleRolesIsAuthorized } from "app/auth/utils";
import { Badge, Button, styledSelect } from "app/components/elements";

function RoleControl({
  membership,
  isOwner,
  ownerCount,
}: {
  membership: Member;
  isOwner: boolean;
  ownerCount: number;
}) {
  const [changeRoleMutation] = useMutation(changeRole);

  async function onChangeRole(event: React.ChangeEvent<HTMLSelectElement>) {
    await changeRoleMutation({
      id: membership.id,
      role: event.target.value as MembershipRole,
    });
    toast.success("Changed user role");
    await invalidateQuery(getOrganization, null);
  }

  if (!isOwner || (membership.role === "OWNER" && ownerCount == 1)) {
    return <div className="capitalize">{membership.role.toLowerCase()}</div>;
  }

  return (
    <select
      onChange={onChangeRole}
      className={styledSelect({ size: "sm" })}
      value={membership.role}
    >
      <option value="OWNER">Owner</option>
      <option value="USER">User</option>
    </select>
  );
}

export function ExistingMember({
  membership,
  ownerCount,
  memberCount,
}: {
  membership: Member;
  ownerCount: number;
  memberCount: number;
}) {
  const Router = useRouter();
  const session = useAuthenticatedSession();
  const [deleteMembershipMutation] = useMutation(deleteMembership);
  if (!membership.user) throw new Error("user should be asserted");
  const isMe = membership.user.id === session.userId;
  const isOwner = simpleRolesIsAuthorized({
    session,
    roles: ["OWNER", "SUPERADMIN"],
  });

  async function removeMember() {
    try {
      await deleteMembershipMutation({ id: membership.id });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not remove member");
      return;
    }
    toast.success("Removed member from team");
    if (isMe) {
      await Router.push(Routes.NewOrganization());
    }
    await invalidateQuery(getOrganization, null);
  }

  return (
    <tr>
      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-6">
        <span className="pr-2">
          {membership.membershipStatus === "PAUSED" ? (
            <span className="pr-2">
              <Badge>Paused</Badge>
            </span>
          ) : null}
          {membership.user.name || membership.user.email}
          {membership.user.id === session.userId ? (
            <div className="font-normal inline-block ml-2">(Me)</div>
          ) : null}
        </span>
        {(isOwner || isMe) && memberCount > 1 ? (
          <Button type="button" onClick={removeMember} size="xs">
            {isMe ? "Leave team" : "Remove from team"}
          </Button>
        ) : null}
      </td>
      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
        <RoleControl
          ownerCount={ownerCount}
          membership={membership}
          isOwner={isOwner}
        />
      </td>
    </tr>
  );
}
