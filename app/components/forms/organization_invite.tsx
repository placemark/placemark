import { invalidateQuery, useMutation, useQuery } from "@blitzjs/rpc";
import createInvitation from "app/memberships/mutations/createInvitation";
import { Form, FORM_ERROR } from "app/core/components/Form";
import { Invite } from "app/organizations/validations";
import { toast } from "react-hot-toast";
import getOrganization from "app/organizations/queries/getOrganization";
import { InlineError } from "app/components/inline_error";
import { ErrorMessage } from "formik";
import { Button, H2, StyledFieldTextareaProse } from "app/components/elements";
import { pluralize } from "app/lib/utils";
import { UOrganization } from "app/lib/uorganization";

export default function OrganizationInviteForm() {
  const [{ organization }] = useQuery(getOrganization, null);
  const [createInvitationMutation] = useMutation(createInvitation);

  if (UOrganization.isEnterprise(organization)) {
    return null;
  }

  return (
    <Form
      schema={Invite}
      initialValues={{ emails: "" }}
      onSubmit={async (values, helpers) => {
        try {
          const { invited, success, failed } = await createInvitationMutation(
            values
          );
          if (success) {
            toast.success(`${pluralize("New member", invited)} invited`);
          } else {
            if (invited > 0) {
              toast.success(`${pluralize("New member", invited)} invited.`);
            }
            toast.error(`Failed to invite: ${failed.join(", ")}.`);
          }
          await invalidateQuery(getOrganization, null);
          helpers.resetForm();
        } catch (error: any) {
          return { [FORM_ERROR]: (error as Error).toString() };
        }
      }}
    >
      <H2>Invite members</H2>
      <ErrorMessage name="emails" component={InlineError} />
      <div className="space-y-2">
        <StyledFieldTextareaProse
          as="textarea"
          size="sm"
          name="emails"
          placeholder="Email address(es)…"
          type="text"
        />
        <Button variant="primary" type="submit">
          Invite
        </Button>
      </div>
    </Form>
  );
}
