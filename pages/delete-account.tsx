import { BlitzPage, Routes } from "@blitzjs/next";
import { useRouter } from "next/router";
import { Suspense } from "react";
import { Loading, TextWell } from "app/components/elements";
import StandaloneFormLayout from "app/core/layouts/standalone_form_layout";
import Form from "app/core/components/Form";
import { z } from "zod";
import { useMutation } from "@blitzjs/rpc";
import deleteOrganization from "app/organizations/mutations/deleteOrganization";
import toast from "react-hot-toast";

function DeleteAccountForm() {
  const Router = useRouter();
  const [deleteOrganizationMutation] = useMutation(deleteOrganization);

  return (
    <div className="space-y-4">
      <Form
        submitText="Delete account"
        schema={z.object({})}
        initialValues={{}}
        onSubmit={async () => {
          if (
            window.confirm("Are you sure you want to delete this organization?")
          ) {
            await toast.promise(deleteOrganizationMutation({ force: true }), {
              loading: "Deleting account…",
              success: "Account deleted",
              error: "Error while deleting account",
            });
            await Router.push(Routes.FeedbackPage());
          }
        }}
      >
        <TextWell>
          This is the only organization you belong to. Deleting it will delete
          your Placemark account, cancel your subscription and delete your data
          permanently. Please download any data that want to hold on to.
        </TextWell>
      </Form>
    </div>
  );
}

const DeleteAccountPage: BlitzPage = () => {
  return (
    <div>
      <Suspense fallback={<Loading />}>
        <DeleteAccountForm />
      </Suspense>
    </div>
  );
};

DeleteAccountPage.getLayout = (page) => (
  <StandaloneFormLayout title="Delete account">{page}</StandaloneFormLayout>
);

export default DeleteAccountPage;
