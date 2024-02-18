import { BlitzPage } from "@blitzjs/next";
import StandaloneFormLayout from "app/core/layouts/standalone_form_layout";
import { SignupForm } from "app/auth/components/SignupForm";
import { Suspense } from "react";
import { Loading } from "app/components/elements";

const SignupPage: BlitzPage = () => {
  return (
    <div className="grid md:grid-cols-2">
      <div className="hidden md:block pr-10">
        <div className="pb-6 text-lg text-gray-700 dark:text-gray-200">
          With Placemark you can edit, analyze, and share geospatial data with a
          fraction of the time and cost of traditional GIS.
        </div>
        <ul className="list-disc pl-6 text-purple-700 dark:text-purple-300">
          <li>500 maps</li>
          <li>Team collaboration</li>
          <li>Data-driven styling</li>
          <li>10+ data formats</li>
          <li>REST APIs</li>
          <li>GIS operations</li>
          <li>Share maps with a link</li>
          <li>Powerful table view</li>
        </ul>
      </div>
      <Suspense fallback={<Loading />}>
        <SignupForm />
      </Suspense>
    </div>
  );
};

SignupPage.redirectAuthenticatedTo = "/";
SignupPage.getLayout = (page) => (
  <StandaloneFormLayout wide title="Try it for free">
    {page}
  </StandaloneFormLayout>
);

export default SignupPage;
