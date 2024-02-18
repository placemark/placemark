import { useSession } from "@blitzjs/auth";
import type { FormProps } from "app/core/components/Form";
import { Form } from "app/core/components/Form";
import { LabeledTextField } from "app/core/components/LabeledTextField";
import type { z } from "zod";
import { TextWell } from "app/components/elements";
export { FORM_ERROR } from "app/core/components/Form";

export function OrganizationForm<S extends z.ZodType<any, any>>(
  props: FormProps<S>
) {
  const session = useSession();

  return (
    <Form<S> {...props}>
      {session.orgId === undefined ? (
        <div className="text-purple-700 bg-purple-100 rounded-md p-4 mb-4">
          You currently aren’t a member of any organization. To continue using
          Placemark, please create a new organization and set up billing.
        </div>
      ) : null}
      <TextWell>
        With an organization, you can share custom background layers and
        centrally manage billing for everyone in your group.
      </TextWell>
      <LabeledTextField
        required
        autoFocus
        name="name"
        label="Name"
        placeholder="Organization name"
      />
    </Form>
  );
}
