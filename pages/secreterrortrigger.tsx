import { BlitzPage } from "@blitzjs/next";
import { Suspense } from "react";
import Layout from "app/core/layouts/Layout";

function SecretErrorTriggerComponent() {
  throw new Error("Secret error (for testing)");
  return null;
}

const SecretErrorTrigger: BlitzPage = () => {
  return (
    <Suspense fallback={null}>
      <SecretErrorTriggerComponent />
    </Suspense>
  );
};

SecretErrorTrigger.getLayout = (page) => (
  <Layout title="Placemark">{page}</Layout>
);

export default SecretErrorTrigger;
