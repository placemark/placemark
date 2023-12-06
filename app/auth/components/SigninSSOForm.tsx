import { invoke } from "@blitzjs/rpc";
import { LabeledTextField } from "app/core/components/LabeledTextField";
import { Form } from "app/core/components/Form";
import { SigninSaml } from "app/auth/validations";
import { AlreadyHaveAccount } from "app/components/already_have_account";
import getWorkOSRedirect from "app/users/queries/getWorkOSRedirect";

export const SigninSSOForm = () => {
  return (
    <div>
      <Form
        submitText="Sign in with SSO"
        fullWidthSubmit
        schema={SigninSaml}
        initialValues={{ email: "" }}
        onSubmit={async (values, helpers) => {
          const { email } = values;
          const redirect = await invoke(getWorkOSRedirect, { email });
          if (redirect) {
            window.location.href = redirect;
            return;
          } else {
            helpers.setErrors({
              email:
                "Email does not appear to be connected to an organization with SSO",
            });
          }
        }}
      >
        <LabeledTextField
          name="email"
          type="email"
          label="Email"
          autoComplete="username"
        />
      </Form>
      <AlreadyHaveAccount signup forgotPasswordLink />
    </div>
  );
};
