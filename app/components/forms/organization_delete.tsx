import { Routes } from "@blitzjs/next";
import { useAuthenticatedSession } from "@blitzjs/auth";
import { useMutation, invalidateQuery } from "@blitzjs/rpc";
import { useRouter } from "next/router";
import deleteOrganization from "app/organizations/mutations/deleteOrganization";
import getOrganization from "app/organizations/queries/getOrganization";
import getCurrentUser from "app/users/queries/getCurrentUser";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { simpleRolesIsAuthorized } from "app/auth/utils";
import { useCurrentUser } from "app/core/hooks/useCurrentUser";
import { Button, H2, styledButton, TextWell } from "app/components/elements";
import Link from "next/link";

export default function OrganizationDelete() {
  const Router = useRouter();
  const session = useAuthenticatedSession();
  const currentUser = useCurrentUser();
  const [deleteOrganizationMutation] = useMutation(deleteOrganization);

  if (!simpleRolesIsAuthorized({ session, roles: ["OWNER", "SUPERADMIN"] })) {
    return null;
  }

  if (currentUser.memberships.length === 1) {
    return (
      <div>
        <H2>Danger zone</H2>
        <TextWell>
          This is the only organization you belong to. Deleting it will delete
          your Placemark account, cancel your subscription and delete your data
          permanently. Please download any data that want to hold on to.
        </TextWell>
        <form
          className="pt-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              window.confirm(
                "Are you absolutely sure you want to delete this organization?"
              )
            ) {
              await deleteOrganizationMutation({ force: true });
              await Router.push(Routes.FeedbackPage());
            }
          }}
        >
          <Link
            href={Routes.DeleteAccountPage()}
            className={styledButton({ variant: "destructive" })}
          >
            Delete this organization and my account
          </Link>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-2">
      <H2>Danger zone</H2>
      <form
        className="p-10 bg-gray-100 rounded-md flex items-center flex-col"
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            window.confirm("Are you sure you want to delete this organization?")
          ) {
            await deleteOrganizationMutation({});
            await invalidateQuery(getOrganization, null);
            await invalidateQuery(getCurrentUser, null);
            await Router.push(Routes.NewOrganization());
          }
        }}
      >
        <div className="flex items-center text-purple-500 pb-4">
          <ExclamationTriangleIcon className="mr-2" />
          <div className="font-bold">Danger zone</div>
        </div>
        <Button variant="destructive">Delete this organization</Button>
      </form>
    </div>
  );
}
