import { useQuery } from "@blitzjs/rpc";
import getOrganization from "app/organizations/queries/getOrganization";
import { InvitedMember } from "app/components/forms/organization_members/invited_member";
import { ExistingMember } from "app/components/forms/organization_members/existing_member";
import React from "react";
import { H2, Table, TableHead, Tbody, Th } from "app/components/elements";

export default function OrganizationMembers() {
  const [{ organization }] = useQuery(getOrganization, null);
  const { membership: members } = organization;

  const existingMembers = members.filter((member) => member.user);
  const invitedMembers = members.filter((member) => !member.user);
  const ownerCount = existingMembers.filter(
    (member) => member.role === "OWNER"
  ).length;
  const memberCount = existingMembers.length;

  return (
    <div>
      <H2>Members</H2>
      <div className="mt-6 flex flex-col">
        <Table>
          <TableHead>
            <Th first>Name</Th>
            <Th>Role</Th>
          </TableHead>
          <Tbody>
            {existingMembers.map((membership) => {
              return (
                <ExistingMember
                  ownerCount={ownerCount}
                  memberCount={memberCount}
                  key={membership.id}
                  membership={membership}
                />
              );
            })}
            {invitedMembers.map((member) => (
              <InvitedMember key={member.id} member={member} />
            ))}
          </Tbody>
        </Table>
      </div>
    </div>
  );
}
