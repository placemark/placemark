import { useQuery } from "@blitzjs/rpc";
import getInvitation from "app/memberships/queries/getInvitation";
import { Loading } from "app/components/elements";

export function InvitedMessage({ token }: { token: string }) {
  const [invitation] = useQuery(getInvitation, { token });
  /**
   * While accepting an invitation, it becomes null here
   * because the invitation token is removed.
   */
  if (!invitation) {
    return <Loading />;
  }
  return (
    <p className="text-lg">
      <span className="font-bold">{invitation.organization.name + " "}</span>
      have invited you to join their organization on Placemark.
    </p>
  );
}
