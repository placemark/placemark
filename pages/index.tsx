import { gSSP } from "app/blitz-server";
import Head from "next/head";
import { getSession } from "@blitzjs/auth";
import { BlitzPage, Routes } from "@blitzjs/next";
import AuthenticatedPageLayout from "app/core/layouts/authenticated_page_layout";
import { CreateMap } from "app/components/create_map";
import { WrappedFeatureCollectionList } from "app/components/wrapped_feature_collection_list";
import { CompatibilityCheck } from "app/components/compatibility_check";
import { DropIndex } from "app/components/drop_index";
import { formatTitle } from "app/lib/utils";

export const featureRowColumns = "40px 1fr 1fr 1fr 80px";

function IndexHeader() {
  return (
    <div className="flex justify-between items-center pt-0 pb-8 gap-x-2">
      <CreateMap />
    </div>
  );
}

const PlacemarkIndex: BlitzPage = () => {
  return (
    <>
      <Head>
        <title>{formatTitle("Maps")}</title>
      </Head>

      <IndexHeader />
      <CompatibilityCheck />

      <WrappedFeatureCollectionList />
      <DropIndex />
    </>
  );
};

PlacemarkIndex.authenticate = { redirectTo: Routes.SigninPage().pathname };
PlacemarkIndex.getLayout = (page) => (
  <AuthenticatedPageLayout title="Maps">{page}</AuthenticatedPageLayout>
);

export const getServerSideProps = gSSP(async ({ req, res }) => {
  const session = await getSession(req, res);

  if (session.userId === null) {
    return {
      redirect: {
        destination: Routes.SigninPage().pathname,
        permanent: false,
      },
    };
  }

  if (session.orgId === undefined) {
    return {
      redirect: {
        destination: Routes.NewOrganization().pathname,
        permanent: false,
      },
    };
  }

  return { props: {} };
});

export default PlacemarkIndex;
