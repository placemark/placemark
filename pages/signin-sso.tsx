import { BlitzPage } from "@blitzjs/next";
import { SigninSSOForm } from "app/auth/components/SigninSSOForm";
import StandaloneFormLayout from "app/core/layouts/standalone_form_layout";

const SigninSSOPage: BlitzPage = () => {
  return <SigninSSOForm />;
};

SigninSSOPage.redirectAuthenticatedTo = "/";
SigninSSOPage.getLayout = (page) => (
  <StandaloneFormLayout title="SSO Sign in">{page}</StandaloneFormLayout>
);

export default SigninSSOPage;
