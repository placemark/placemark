import { invalidateQuery, useMutation, useQuery } from "@blitzjs/rpc";
import changeOrganizationName from "app/organizations/mutations/changeOrganizationName";
import { Form, FORM_ERROR } from "app/core/components/Form";
import { LabeledTextField } from "app/core/components/LabeledTextField";
import { Name } from "app/organizations/validations";
import { toast } from "react-hot-toast";
import getOrganization from "app/organizations/queries/getOrganization";

export default function OrganizationNameForm({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const [{ organization }] = useQuery(getOrganization, null);
  const [changeOrganizationNameMutation] = useMutation(changeOrganizationName);
  return (
    <Form
      submitText="Update organization name"
      track="organization-change-password"
      schema={Name}
      initialValues={{ id: organization.id, name: organization.name || "" }}
      onSubmit={async (values) => {
        try {
          await changeOrganizationNameMutation(values);
          await invalidateQuery(getOrganization, null);
          toast.success("Organization name changed");
          onSuccess();
        } catch (error: any) {
          return { [FORM_ERROR]: (error as Error).toString() };
        }
      }}
    >
      <LabeledTextField name="name" label="Name" type="text" />
    </Form>
  );
}
