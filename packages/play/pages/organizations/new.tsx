import { useMutation } from "@blitzjs/rpc";
import { BlitzPage } from "@blitzjs/next";
import AuthenticatedPageLayout from "app/core/layouts/authenticated_page_layout";
import createOrganization from "app/organizations/mutations/createOrganization";
import { CreateOrganization } from "app/organizations/validations";
import {
  OrganizationForm,
  FORM_ERROR,
} from "app/organizations/components/OrganizationForm";

const NewOrganization: BlitzPage = () => {
  const [createOrganizationMutation] = useMutation(createOrganization);

  return (
    <div>
      <OrganizationForm
        submitText="Create organization"
        schema={CreateOrganization}
        initialValues={{
          name: "",
        }}
        onSubmit={async (values) => {
          try {
            await createOrganizationMutation(values);
          } catch (error: any) {
            // console.error(error);
            return {
              [FORM_ERROR]: (error as Error).toString(),
            };
          }
        }}
      />
    </div>
  );
};

NewOrganization.authenticate = true;
NewOrganization.getLayout = (page) => (
  <AuthenticatedPageLayout title="Create a new organization">
    {page}
  </AuthenticatedPageLayout>
);

export default NewOrganization;
