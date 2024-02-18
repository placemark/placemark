import { useSession } from "@blitzjs/auth";
import { invoke, useQuery } from "@blitzjs/rpc";
import getOrganization from "app/organizations/queries/getOrganization";
import React from "react";
import { Button, H2, TextWell } from "app/components/elements";
import getWorkOSPortalURL from "app/organizations/queries/getWorkOSPortalURL";
import toast from "react-hot-toast";
import { SUPPORT_EMAIL } from "app/lib/constants";

export default function OrganizationSSO() {
  const session = useSession();
  const [{ organization }] = useQuery(getOrganization, null);

  if (!organization.workOsId) {
    return (
      <div className="space-y-2">
        <H2>Members log in with passwords</H2>
        <TextWell>
          This organization authenticates using passwords.{" "}
          <a href={`mailto:support@${SUPPORT_EMAIL}`}>Contact sales</a> if you
          want to switch to SSO.
        </TextWell>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <H2>Members log in with SSO</H2>
      <TextWell>This organization authenticates through SSO.</TextWell>
      {session.roles?.includes("OWNER") ? (
        <Button
          onClick={async () => {
            const url = await invoke(getWorkOSPortalURL, {});
            if (typeof url === "string") {
              window.location.href = url;
            } else {
              toast.error("Couldn’t load SSO portal URL");
            }
          }}
        >
          SSO Dashboard
        </Button>
      ) : null}
    </div>
  );
}
