import { useRouter } from "next/router";
import { BlitzPage, Routes } from "@blitzjs/next";
import StandaloneFormLayout from "app/core/layouts/standalone_form_layout";
import { SigninForm } from "app/auth/components/SigninForm";

const SigninPage: BlitzPage = () => {
  const router = useRouter();

  return (
    <SigninForm
      onSuccess={async () => {
        const next = router.query.next
          ? decodeURIComponent(router.query.next as string)
          : Routes.PlacemarkIndex();
        await router.push(next);
      }}
    />
  );
};

SigninPage.redirectAuthenticatedTo = "/";
SigninPage.getLayout = (page) => (
  <StandaloneFormLayout title="Sign in">{page}</StandaloneFormLayout>
);

export default SigninPage;
