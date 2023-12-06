import Head from "next/head";
import Link from "next/link";
import { useQuery } from "@blitzjs/rpc";
import { BlitzPage, Routes, ErrorBoundary } from "@blitzjs/next";
import AuthenticatedPageLayout from "app/core/layouts/authenticated_page_layout";
import SubscriptionForm, {
  AddPaymentMethod,
} from "app/components/forms/subscription_form";
import OrganizationNameForm from "app/components/forms/organization_name";
import OrganizationMembers from "app/components/forms/organization_members";
import OrganizationDelete from "app/components/forms/organization_delete";
import { SubscriptionCoupon } from "app/components/forms/subscription_coupon";
import { SettingsRow } from "../settings";
import React, { Suspense } from "react";
import getOrganization from "app/organizations/queries/getOrganization";
import { formatTitle } from "app/lib/utils";
import OrganizationSSO from "app/components/forms/organization_sso";
import OrganizationInviteForm from "app/components/forms/organization_invite";
import { useSession } from "@blitzjs/auth";
import { Loading, TextWell } from "app/components/elements";

function OrganizationError({ error }: { error: Error }) {
  if (error?.name !== "NotFoundError") throw error;
  return (
    <div>
      You aren’t a member of any organizations. To continue using Placemark,
      please create an organization.
      <div className="pt-4">
        <Link
          href={Routes.NewOrganization()}
          className="py-1 px-3 border border-transparent text-md rounded-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          Create organization
        </Link>
      </div>
    </div>
  );
}

function NameSettings() {
  const [{ organization }] = useQuery(getOrganization, null);

  return (
    <SettingsRow
      Form={OrganizationNameForm}
      label="Name"
      preview={organization.name}
    />
  );
}

function OrganizationSettingsForms() {
  const session = useSession();

  if (!session.roles?.includes("OWNER")) {
    return (
      <TextWell variant="destructive">
        Organization settings are only available for an organization’s owners.
        Please contact your org’s administrator if you need something changed.
      </TextWell>
    );
  }

  return (
    <div>
      <AddPaymentMethod />
      <div className="space-y-20">
        <div className="space-y-5 pt-5">
          <NameSettings />
          <SubscriptionForm />
        </div>
        <OrganizationMembers />
        <OrganizationInviteForm />
        <OrganizationSSO />
        <OrganizationDelete />
        <SubscriptionCoupon />
      </div>
    </div>
  );
}

const SettingsOrganization: BlitzPage = () => {
  return (
    <ErrorBoundary FallbackComponent={OrganizationError}>
      <Head>
        <title>{formatTitle("Organization settings")}</title>
      </Head>
      <Suspense fallback={<Loading />}>
        <OrganizationSettingsForms />
      </Suspense>
    </ErrorBoundary>
  );
};

SettingsOrganization.getLayout = (page) => (
  <AuthenticatedPageLayout title="Organization settings">
    {page}
  </AuthenticatedPageLayout>
);

SettingsOrganization.authenticate = true;

export default SettingsOrganization;
